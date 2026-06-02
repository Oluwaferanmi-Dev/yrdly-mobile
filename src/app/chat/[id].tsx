import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';

const GREEN = '#388E3C';

interface Message {
  id: string;
  sender_id: string;
  text?: string;
  content?: string;
  created_at: string;
  is_read?: boolean;
}

interface ConversationMeta {
  id: string;
  type: 'friend' | 'marketplace' | 'business';
  participant_ids: string[];
  item_title?: string;
  item_image?: string;
  item_price?: number;
  business_name?: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [otherUser, setOtherUser] = useState<{ name: string; avatar_url: string | null } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const isMarketplace = meta?.type === 'marketplace';

  // ── Determine which messages table to use ────────────────────────
  // Web app uses 'messages' for friend/business, 'chat_messages' for marketplace
  const msgTable = isMarketplace ? 'chat_messages' : 'messages';
  const contentField = isMarketplace ? 'content' : 'text';
  const convIdField = isMarketplace ? 'chat_id' : 'conversation_id';

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
      .from(msgTable)
      .select('*')
      .eq(convIdField, id)
      .order('created_at', { ascending: true });

    if (!error && data) setMessages(data as Message[]);
    setLoading(false);
  }, [id, msgTable, convIdField]);

  useEffect(() => {
    fetchMeta();
    fetchMessages();

    // Realtime subscription for new messages
    const ch = supabase
      .channel(`chat-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: msgTable,
        filter: `${convIdField}=eq.${id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [id, fetchMeta, fetchMessages, msgTable, convIdField]);

  const sendMessage = async () => {
    if (!inputText.trim() || !user || !id || sending) return;
    setSending(true);
    const body = inputText.trim();
    setInputText('');

    try {
      const payload: Record<string, unknown> = {
        sender_id: user.id,
        created_at: new Date().toISOString(),
        [contentField]: body,
        [convIdField]: id,
      };

      const { error } = await supabase.from(msgTable).insert(payload);
      if (error) throw error;

      // Update conversation's last_message
      await supabase.from('conversations').update({
        last_message_text: body,
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.error('Send message error:', e);
      setInputText(body); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.sender_id === user?.id;
    const msgText = item.text || item.content || '';

    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
            {msgText}
          </Text>
          <Text style={[styles.bubbleTime, isMine && { color: 'rgba(255,255,255,0.6)' }]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const title = meta?.type === 'business'
    ? (meta?.business_name || 'Business')
    : (otherUser?.name || 'Chat');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1C" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {otherUser?.avatar_url ? (
            <Image source={{ uri: otherUser.avatar_url }} style={styles.headerAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
              <Text style={styles.headerAvatarText}>{title.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Item context banner (for marketplace chats) */}
      {meta?.item_title && (
        <View style={styles.contextBanner}>
          {meta.item_image && (
            <Image source={{ uri: meta.item_image }} style={styles.contextImage} contentFit="cover" />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.contextTitle} numberOfLines={1}>{meta.item_title}</Text>
            {typeof meta.item_price === 'number' && (
              <Text style={styles.contextPrice}>
                {meta.item_price === 0 ? 'FREE' : `₦${meta.item_price.toLocaleString()}`}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Messages */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
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
              <Text style={styles.emptyText}>No messages yet. Say hi! 👋</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#9E9E9E"
            value={inputText}
            onChangeText={setInputText}
            multiline
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Ionicons name="send" size={20} color="#FFFFFF" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F2',
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#E8F5E9' },
  headerAvatarFallback: { backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1C1C1C', flex: 1 },
  contextBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FBF9', padding: 10, marginHorizontal: 16, marginTop: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#E8F5E9',
  },
  contextImage: { width: 44, height: 44, borderRadius: 8, marginRight: 10, backgroundColor: '#E8F5E9' },
  contextTitle: { fontSize: 13, fontWeight: '600', color: '#1C1C1C' },
  contextPrice: { fontSize: 14, fontWeight: 'bold', color: GREEN, marginTop: 2 },
  msgListContent: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  msgRow: { marginVertical: 4 },
  msgRowLeft: { alignItems: 'flex-start' },
  msgRowRight: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 18,
  },
  bubbleMine: { backgroundColor: GREEN, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#F2F2F2', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: '#1C1C1C', lineHeight: 21 },
  bubbleTextMine: { color: '#FFFFFF' },
  bubbleTime: { fontSize: 10, color: '#9E9E9E', marginTop: 3, alignSelf: 'flex-end' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#F2F2F2', backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1, backgroundColor: '#F2F2F2',
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: '#1C1C1C', maxHeight: 120, marginRight: 10,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#BDBDBD' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 15, color: '#9E9E9E', textAlign: 'center' },
});
