import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Platform,
  ActivityIndicator, Keyboard,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { usePosts } from '../../hooks/use-posts';
import { PostCard } from '../../components/PostCard';
import { Post } from '../../types';
import { timeAgo } from '../../lib/utils';
import { useAppTheme } from '../../context/ThemeContext';
import { Alert } from 'react-native';

import { StorageService } from '../../lib/storage-service';
import { CommentItem, CommentType } from '../../components/CommentItem';
import { CommentInput, CommentInputRef } from '../../components/CommentInput';
import { ErrorBoundary } from '../../components/ErrorBoundary';

function PostDetailContent() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id, focusComments } = useLocalSearchParams<{ id: string; focusComments?: string }>();
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  
  const { deletePost } = usePosts();

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<CommentInputRef>(null);

  // iOS Keyboard Gap Fix
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const userAvatarSource = React.useMemo(() => {
    if (user?.user_metadata?.avatar_url) {
      return StorageService.getOptimizedImageUrl(user.user_metadata.avatar_url, 100) || '';
    }
    return '';
  }, [user?.user_metadata?.avatar_url]);

  const handleReply = useCallback((item: CommentType) => {
    const username = item.user?.name || item.author_name;
    const parentId = item.parent_id || item.id;
    if (username) {
      setReplyingTo({ id: parentId, name: username });
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, []);

  const handleDeleteComment = useCallback(async (item: CommentType) => {
    if (!id) return;
    try {
      const { error } = await supabase.from('comments').delete().eq('id', item.id);
      if (error) throw error;
      setComments(prev => prev.filter(c => c.id !== item.id));
      if (post) {
        const newCount = Math.max((post.comment_count || 1) - 1, 0);
        await supabase.from('posts').update({ comment_count: newCount }).eq('id', id);
        setPost(prev => prev ? { ...prev, comment_count: newCount } : null);
      }
    } catch (e) {
      console.error('Delete comment error:', e);
    }
  }, [post, id]);

  const fetchPost = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('posts')
      .select('*, user:users!posts_user_id_fkey(id, name, avatar_url, location, created_at)')
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
      .select('*, user:users!comments_user_id_fkey(name, avatar_url)')
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
      .channel(`comments-${id}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${id}`,
      }, (payload) => {
        setComments((prev) => [...prev, payload.new as CommentType]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [id, fetchPost, fetchComments]);

  useEffect(() => {
    if (focusComments === 'true' && !loading && post && !hasAutoScrolled) {
      setHasAutoScrolled(true);
      setTimeout(() => {
        if (comments.length > 0) {
          try {
            flatListRef.current?.scrollToIndex({ index: 0, animated: true, viewPosition: 0 });
          } catch (e) {
            // fallback if layout isn't fully ready
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        } else {
          flatListRef.current?.scrollToEnd({ animated: true });
        }
        inputRef.current?.focus();
      }, 500);
    }
  }, [focusComments, loading, post, hasAutoScrolled, comments]);

  const handleSendComment = async (text: string, parentId?: string) => {
    if (!text.trim() || !user || !id) return;
    Keyboard.dismiss();

    try {
      const payload = {
        post_id: id,
        user_id: user.id,
        author_name: user.user_metadata?.name || user.email || 'Anonymous',
        author_image: user.user_metadata?.avatar_url || null,
        text: text.trim(),
        timestamp: new Date().toISOString(),
        like_count: 0,
        parent_id: parentId || null,
      };

      const { error } = await supabase.from('comments').insert(payload);
      if (error) throw error;

      // Update post comment count
      if (post) {
        const newCount = (post.comment_count || 0) + 1;
        await supabase.from('posts').update({ comment_count: newCount }).eq('id', id);
        setPost({ ...post, comment_count: newCount });
      }

      // Trigger notification
      const { NotificationTriggers } = await import('../../lib/notification-triggers');
      await NotificationTriggers.onPostCommented(id, user.id, text.trim());

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.error('Post comment error:', e);
      throw e;
    }
  };

  const commentTree = React.useMemo(() => {
    const rootComments = comments.filter(c => !c.parent_id);
    return rootComments.map(root => ({
      ...root,
      replies: comments.filter(c => c.parent_id === root.id)
    }));
  }, [comments]);

  const handleDeletePost = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await deletePost(id);
              router.back();
            }
          }
        }
      ]
    );
  };

  const renderComment = useCallback(({ item }: { item: CommentType }) => {
    return (
      <CommentItem 
        item={item} 
        currentUserId={user?.id}
        onReply={handleReply} 
        onDelete={handleDeleteComment}
      />
    );
  }, [handleReply, handleDeleteComment, user?.id]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Post</Text>
        {post?.user_id === user?.id ? (
          <TouchableOpacity onPress={handleDeletePost} style={styles.deleteBtn}>
            <Feather name="trash-2" size={20} color="#FF3B30" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior="padding"
      >
        {loading && !post ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={commentTree}
            keyExtractor={(item) => item.id}
            renderItem={renderComment}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                {post ? (
                  <PostCard post={post} />
                ) : (
                  <ActivityIndicator size="small" color={colors.tint} style={{ padding: 20 }} />
                )}
                <Text style={[styles.commentsTitle, { color: colors.text }]}>Comments ({post?.comment_count || 0})</Text>
              </View>
            }
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
        <CommentInput
          ref={inputRef}
          userAvatarSource={userAvatarSource}
          userInitial={(user?.user_metadata?.name || user?.email || '?').charAt(0).toUpperCase()}
          replyingTo={replyingTo}
          onClearReply={() => setReplyingTo(null)}
          onSubmit={handleSendComment}
          InputComponent={TextInput}
        />
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
  deleteBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-end' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 20 },
  listHeader: { paddingBottom: 10 },
  divider: { height: 8, marginVertical: 10 },
  commentsTitle: { fontSize: 16, fontWeight: 'bold', paddingHorizontal: 16, marginBottom: 10 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 14, marginTop: 12 },
});

export default function PostDetailScreen() {
  return (
    <ErrorBoundary screenName="PostDetail">
      <PostDetailContent />
    </ErrorBoundary>
  );
}
