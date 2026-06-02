import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  SafeAreaView, ActivityIndicator, Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { PostCard } from '../../components/PostCard';
import { Post } from '../../types';
import { timeAgo } from '../../lib/utils';

const GREEN = '#388E3C';

interface Comment {
  id: string;
  user_id: string;
  author_name: string;
  author_image: string;
  text: string;
  timestamp: string;
  like_count: number;
}

export default function PostDetailScreen() {
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
      .select('*')
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
      .select('*')
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
          {item.author_image ? (
            <Image source={{ uri: item.author_image }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <View style={[styles.avatarImg, styles.avatarFallback]}>
              <Text style={styles.avatarFallbackText}>
                {item.author_name ? item.author_name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.authorName}>{item.author_name}</Text>
            <Text style={styles.timestamp}>{timeAgo(item.timestamp)}</Text>
          </View>
          <Text style={styles.commentText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {post ? (
        <PostCard post={post} />
      ) : (
        <ActivityIndicator size="small" color={GREEN} style={{ padding: 20 }} />
      )}
      <View style={styles.divider} />
      <Text style={styles.commentsTitle}>Comments ({post?.comment_count || 0})</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !post ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
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
              <Ionicons name="chatbubbles-outline" size={40} color="#E0E0E0" />
              <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor="#9E9E9E"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSendComment}
            disabled={!inputText.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Ionicons name="send" size={18} color="#FFFFFF" />
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
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F2',
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1C', flex: 1, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 20 },
  listHeader: { paddingBottom: 10 },
  divider: { height: 8, backgroundColor: '#F2F2F2', marginVertical: 10 },
  commentsTitle: { fontSize: 16, fontWeight: 'bold', color: '#1C1C1C', paddingHorizontal: 16, marginBottom: 10 },
  commentRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 },
  avatar: { marginRight: 12 },
  avatarImg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9' },
  avatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: GREEN },
  avatarFallbackText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  commentContent: { flex: 1, backgroundColor: '#F9FBF9', padding: 12, borderRadius: 12 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  authorName: { fontSize: 14, fontWeight: 'bold', color: '#1C1C1C' },
  timestamp: { fontSize: 12, color: '#9E9E9E' },
  commentText: { fontSize: 14, color: '#424242', lineHeight: 20 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 14, color: '#9E9E9E', marginTop: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#F2F2F2', backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1, backgroundColor: '#F2F2F2', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: '#1C1C1C', maxHeight: 100, marginRight: 10, minHeight: 40,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: GREEN,
    justifyContent: 'center', alignItems: 'center', marginBottom: 2,
  },
  sendBtnDisabled: { backgroundColor: '#BDBDBD' },
});
