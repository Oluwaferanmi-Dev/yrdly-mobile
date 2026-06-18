import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  SafeAreaView, ActivityIndicator, Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { PostCard } from '../../components/PostCard';
import { Post } from '../../types';
import { timeAgo } from '../../lib/utils';
import { useAppTheme } from '../../context/ThemeContext';

interface Comment {
  id: string;
  user_id: string;
  author_name: string;
  author_image: string;
  text: string;
  timestamp: string;
  like_count: number;
  user?: {
    name: string;
    avatar_url: string;
  };
}

export default function PostDetailScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const fetchPost = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('posts')
      .select('*, user:users!posts_user_id_fkey(name, avatar_url)')
      .eq('id', id)
      .single();

    if (!error && data) {
      setPost(data);
    }
  }, [id]);

  const fetchComments = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('comments')
      .select('*, user:users(name, avatar_url)')
      .eq('post_id', id)
      .order('timestamp', { ascending: true });

    if (!error && data) {
      setComments(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchPost();
    fetchComments();

    // Realtime comments
    const ch = supabase
      .channel(`comments-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${id}`,
      }, (payload) => {
        setComments((prev) => [...prev, payload.new as Comment]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [id, fetchPost, fetchComments]);

  const handleSendComment = async () => {
    if (!inputText.trim() || !user || !id || sending) return;
    setSending(true);
    const body = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    try {
      const payload = {
        post_id: id,
        user_id: user.id,
        author_name: user.user_metadata?.name || user.email || 'Anonymous',
        author_image: user.user_metadata?.avatar_url || null,
        text: body,
        timestamp: new Date().toISOString(),
        like_count: 0,
      };

      const { error } = await supabase.from('comments').insert(payload);
      if (error) throw error;

      // Update post comment count
      if (post) {
        const newCount = (post.comment_count || 0) + 1;
        await supabase.from('posts').update({ comment_count: newCount }).eq('id', id);
        setPost({ ...post, comment_count: newCount });
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.error('Post comment error:', e);
      setInputText(body);
    } finally {
      setSending(false);
    }
  };

  const renderComment = ({ item }: { item: Comment }) => {
    return (
      <View style={styles.commentRow}>
        <View style={styles.avatar}>
          {item.user?.avatar_url || item.author_image ? (
            <Image source={{ uri: item.user?.avatar_url || item.author_image }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <View style={[styles.avatarImg, styles.avatarFallback, { backgroundColor: colors.tint }]}>
              <Text style={styles.avatarFallbackText}>
                {(item.user?.name || item.author_name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.commentContent, { backgroundColor: colors.inputBackground }]}>
          <View style={styles.commentHeader}>
            <Text style={[styles.authorName, { color: colors.text }]}>{item.user?.name || item.author_name}</Text>
            <Text style={[styles.timestamp, { color: colors.textMuted }]}>{timeAgo(item.timestamp)}</Text>
          </View>
          <Text style={[styles.commentText, { color: colors.textSecondary }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {post ? (
        <PostCard post={post} />
      ) : (
        <ActivityIndicator size="small" color={colors.tint} style={{ padding: 20 }} />
      )}
      <Text style={[styles.commentsTitle, { color: colors.text }]}>Comments ({post?.comment_count || 0})</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Post</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !post ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="message-square" size={40} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No comments yet. Be the first!</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.inputRow, { borderTopColor: colors.borderLight, backgroundColor: colors.card }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
            placeholder="Add a comment..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.tint }, !inputText.trim() && [styles.sendBtnDisabled, { backgroundColor: colors.textMuted }]]}
            onPress={handleSendComment}
            disabled={!inputText.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Feather name="send" size={18} color="#FFFFFF" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 20 },
  listHeader: { paddingBottom: 10 },
  divider: { height: 8, marginVertical: 10 },
  commentsTitle: { fontSize: 16, fontWeight: 'bold', paddingHorizontal: 16, marginBottom: 10 },
  commentRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 },
  avatar: { marginRight: 12 },
  avatarImg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9' },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  commentContent: { flex: 1, padding: 12, borderRadius: 12 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  authorName: { fontSize: 14, fontWeight: 'bold' },
  timestamp: { fontSize: 12 },
  commentText: { fontSize: 14, lineHeight: 20 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 14, marginTop: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 100, marginRight: 10, minHeight: 40,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: 2,
  },
  sendBtnDisabled: { },
});
