import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import ImageViewing from 'react-native-image-viewing';
import { Video, ResizeMode } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { useAppTheme } from '../../context/ThemeContext';
import { formatPrice } from '../../lib/utils';

interface Message {
  id: string;
  sender_id: string;
  text?: string;
  content?: string;
  media_url?: string;
  media_type?: string;
  created_at: string;
  is_read?: boolean;
  deleted_by?: string[];
}

interface ConversationMeta {
  id: string;
  type: 'friend' | 'marketplace' | 'briefcase';
  participant_ids: string[];
  item_title?: string;
  item_image?: string;
  item_price?: number;
  business_name?: string;
}

export default function ChatScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [otherUser, setOtherUser] = useState<{ name: string; avatar_url: string | null } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [viewerImages, setViewerImages] = useState<{uri: string}[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const fetchMeta = useCallback(async () => {
    if (!id || !user) return;
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();
    if (data) {
      setMeta(data);
      // Fetch the other participant's profile
      const otherId = data.participant_ids?.find((pid: string) => pid !== user.id);
      if (otherId) {
        const { data: u } = await supabase
          .from('users')
          .select('name, avatar_url')
          .eq('id', otherId)
          .single();
        if (u) setOtherUser(u);
      }
    }
  }, [id, user]);

  const fetchMessages = useCallback(async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (!error && data) setMessages(data as Message[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    if (!meta) return;

    fetchMessages();

    // Realtime subscriptions for messages table
    const ch = supabase
      .channel(`chat-${id}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(ch); 
    };
  }, [id, meta, fetchMessages]);

  const sendMessage = async () => {
    if (!inputText.trim() || !user || !id || sending) return;
    setSending(true);
    const body = inputText.trim();
    setInputText('');

    try {
      const payload: Record<string, unknown> = {
        sender_id: user.id,
        created_at: new Date().toISOString(),
        text: body,
        conversation_id: id,
      };

      const { error } = await supabase.from('messages').insert(payload);
      if (error) throw error;

      // Update conversation's last_message
      await supabase.from('conversations').update({
        last_message_text: body,
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      // Trigger notification
      const toUserId = meta?.participant_ids?.find((pid: string) => pid !== user.id);
      if (toUserId) {
        const { NotificationTriggers } = await import('../../lib/notification-triggers');
        await NotificationTriggers.onMessageSent(toUserId, user.id, id, body);
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.error('Send message error:', e);
      setInputText(body); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const pickMedia = async () => {
    if (sending || uploadingMedia) return;
    
    Alert.alert(
      'Attach Media',
      'Would you like to crop your media or send the original full size?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Crop Media', onPress: () => launchPicker(true) },
        { text: 'Send Original', onPress: () => launchPicker(false) }
      ]
    );
  };

  const launchPicker = async (allowEditing: boolean) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: allowEditing,
        quality: 0.8,
      });
      if (!result.canceled) {
        uploadAndSendMedia(result.assets[0]);
      }
    } catch (e) {
      console.log("ImagePicker error:", e);
    }
  };

  const uploadAndSendMedia = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!user || !id) return;
    setUploadingMedia(true);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const isVideo = asset.type === 'video';
      const filename = `${user.id}/${Date.now()}.${ext}`;
      
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
      const arrayBuffer = decode(base64);
      
      const bucketName = isVideo ? 'chat-videos' : 'chat-images';
      const mimeExt = ext === 'jpg' ? 'jpeg' : ext;
      
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filename, arrayBuffer, { contentType: isVideo ? `video/${mimeExt}` : `image/${mimeExt}` });
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filename);
      
      const payload: Record<string, unknown> = {
        sender_id: user.id,
        created_at: new Date().toISOString(),
        text: '',
        conversation_id: id,
        media_url: publicUrl,
        media_type: isVideo ? 'video' : 'image',
      };

      const { error } = await supabase.from('messages').insert(payload);
      if (error) throw error;
      
      await supabase.from('conversations').update({
        last_message_text: isVideo ? 'Sent a video 📹' : 'Sent an image 📸',
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      // Trigger notification
      const toUserId = meta?.participant_ids?.find((pid: string) => pid !== user.id);
      if (toUserId) {
        const { NotificationTriggers } = await import('../../lib/notification-triggers');
        await NotificationTriggers.onMessageSent(toUserId, user.id, id, isVideo ? 'Sent a video 📹' : 'Sent an image 📸');
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch(e) {
      console.error('Upload media error:', e);
    } finally {
      setUploadingMedia(false);
    }
  };

  const openViewer = (url: string) => {
    setViewerImages([{ uri: url }]);
    setViewerVisible(true);
  };

  const handleMessageLongPress = (item: Message) => {
    if (!user) return;
    
    const isMine = item.sender_id === user.id;
    const msgTime = new Date(item.created_at).getTime();
    const now = new Date().getTime();
    const diffMins = (now - msgTime) / (1000 * 60);
    const canDeleteForEveryone = isMine && diffMins <= 15;

    const options = [
      {
        text: 'Delete for me',
        style: 'destructive' as const,
        onPress: async () => {
          try {
            const newDeletedBy = [...(item.deleted_by || []), user.id];
            await supabase.from('messages').update({ deleted_by: newDeletedBy }).eq('id', item.id);
            // Optimistic update
            setMessages(prev => prev.filter(m => m.id !== item.id));
          } catch (e) {
            console.error('Failed to delete message for me:', e);
          }
        }
      }
    ];

    if (canDeleteForEveryone) {
      options.push({
        text: 'Delete for everyone',
        style: 'destructive' as const,
        onPress: async () => {
          try {
            await supabase.from('messages').delete().eq('id', item.id);
            setMessages(prev => prev.filter(m => m.id !== item.id));
          } catch (e) {
            console.error('Failed to delete message for everyone:', e);
          }
        }
      });
    }

    options.push({
      text: 'Cancel',
      style: 'cancel' as const,
      onPress: () => {}
    });

    Alert.alert(
      'Message Options',
      'Choose an action for this message',
      options
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    // Hide message if deleted by current user
    if (item.deleted_by?.includes(user?.id || '')) {
      return null;
    }

    const isMine = item.sender_id === user?.id;
    const msgText = item.text || item.content || '';
    const hasMedia = !!item.media_url;

    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
        <TouchableOpacity 
          activeOpacity={0.9} 
          onLongPress={() => handleMessageLongPress(item)}
          style={[
            styles.bubble, 
            isMine ? styles.bubbleMine : styles.bubbleTheirs,
            isMine ? { backgroundColor: colors.tint } : { backgroundColor: colors.inputBackground },
            hasMedia && !msgText && { backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0, paddingBottom: 0 },
            hasMedia && msgText && { paddingHorizontal: 4, paddingVertical: 4, paddingBottom: 6 }
          ]}
        >
          {item.media_url && item.media_type === 'image' && (
            <TouchableOpacity onPress={() => openViewer(item.media_url!)}>
              <View style={{ position: 'relative' }}>
                <Image 
                  source={{ uri: item.media_url }} 
                  style={[{ width: 240, height: 300, borderRadius: 16, marginBottom: msgText ? 6 : 0 }, (!isMine && !msgText) && { backgroundColor: 'transparent' }]} 
                  contentFit="contain" 
                />
                {!msgText && (
                  <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, color: '#FFF' }}>
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          {item.media_url && item.media_type === 'video' && (
            <Video
              source={{ uri: item.media_url }}
              style={{ width: 220, height: 220, borderRadius: 14, marginBottom: msgText ? 6 : 0 }}
              resizeMode={ResizeMode.COVER}
              useNativeControls
            />
          )}
          {!!msgText && (
            <Text style={[styles.bubbleText, { color: colors.text }, isMine && { color: colors.card }, hasMedia && { paddingHorizontal: 6 }]}>
              {msgText}
            </Text>
          )}
          {!!msgText && (
            <Text style={[styles.bubbleTime, { color: colors.textMuted }, isMine && { color: 'rgba(255,255,255,0.6)' }, hasMedia && { paddingHorizontal: 6 }]}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const title = meta?.type === 'briefcase'
    ? (meta?.business_name || 'Business')
    : (otherUser?.name || 'Chat');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.headerCenter}
          onPress={() => {
            const otherId = meta?.participant_ids?.find((pid: string) => pid !== user?.id);
            if (otherId) router.push(`/profile/${otherId}`);
          }}
        >
          {otherUser?.avatar_url ? (
            <Image source={{ uri: otherUser.avatar_url }} style={styles.headerAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback, { backgroundColor: colors.tint }]}>
              <Text style={[styles.headerAvatarText, { color: colors.card }]}>{title.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        </TouchableOpacity>

        <View style={{ width: 40 }} />
      </View>

      {/* Item context banner (for marketplace chats) */}
      {meta?.item_title && (
        <View style={[styles.contextBanner, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight }]}>
          {meta.item_image && (
            <Image source={{ uri: meta.item_image }} style={[styles.contextImage, { backgroundColor: colors.inputBackground }]} contentFit="cover" />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.contextTitle, { color: colors.text }]} numberOfLines={1}>{meta.item_title}</Text>
            {typeof meta.item_price === 'number' && (
              <Text style={[styles.contextPrice, { color: colors.tint }]}>
                {meta.item_price === 0 ? 'FREE' : formatPrice(meta.item_price)}
              </Text>
            )}
          </View>
        </View>
      )}

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.msgListContent}
            showsVerticalScrollIndicator={false}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No messages yet. Say hi! 👋</Text>
              </View>
            }
          />
        )}

        {/* Input */}
        <View style={[styles.inputRow, { borderTopColor: colors.borderLight, backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={pickMedia} disabled={uploadingMedia}>
            {uploadingMedia ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Feather name="plus-circle" size={28} color={colors.tint} />
            )}
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.tint }, !inputText.trim() && [styles.sendBtnDisabled, { backgroundColor: colors.textMuted }]]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color={colors.card} />
              : <Feather name="send" size={20} color={colors.card} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ImageViewing
        images={viewerImages}
        imageIndex={0}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  headerAvatarFallback: { justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { fontWeight: 'bold', fontSize: 16 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  contextBanner: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, marginHorizontal: 16, marginTop: 8,
    borderRadius: 10, borderWidth: 1,
  },
  contextImage: { width: 44, height: 44, borderRadius: 8, marginRight: 10 },
  contextTitle: { fontSize: 13, fontWeight: '600' },
  contextPrice: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  msgListContent: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  msgRow: { marginVertical: 4 },
  msgRowLeft: { alignItems: 'flex-start' },
  msgRowRight: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 18,
  },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleTheirs: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMine: {},
  bubbleTime: { fontSize: 10, marginTop: 3, alignSelf: 'flex-end' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 8, paddingVertical: 10,
    borderTopWidth: 1,
  },
  attachBtn: {
    justifyContent: 'center', alignItems: 'center',
    padding: 8, paddingBottom: 10,
  },
  input: {
    flex: 1,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 120, marginRight: 10,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
