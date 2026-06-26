import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal, BottomSheetFlatList, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/use-supabase-auth';
import { timeAgo } from '../lib/utils';
import { useAppTheme } from '../context/ThemeContext';
import { Post } from '../types';
import { StorageService } from '../lib/storage-service';

export interface CommentsBottomSheetProps {
  postId: string | null;
}

export type CommentsBottomSheetRef = {
  present: () => void;
  dismiss: () => void;
};

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

export const CommentsBottomSheet = forwardRef<CommentsBottomSheetRef, CommentsBottomSheetProps>(({ postId }, ref) => {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['50%', '100%'], []);
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  useImperativeHandle(ref, () => ({
    present: () => bottomSheetModalRef.current?.present(),
    dismiss: () => bottomSheetModalRef.current?.dismiss(),
  }));

  const fetchPost = useCallback(async () => {
    if (!postId) return;
    const { data, error } = await supabase
      .from('posts')
      .select('*, user:users!posts_user_id_fkey(id, name, avatar_url, location, created_at)')
      .eq('id', postId)
      .single();

    if (!error && data) {
      setPost(data);
    }
  }, [postId]);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select('*, user:users!comments_user_id_fkey(name, avatar_url)')
      .eq('post_id', postId)
      .order('timestamp', { ascending: true });

    if (!error && data) {
      setComments(data);
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    if (!postId) {
      setComments([]);
      setPost(null);
      return;
    }
    fetchPost();
    fetchComments();

    // Realtime comments
    const ch = supabase
      .channel(`comments-${postId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`,
      }, (payload) => {
        setComments((prev) => {
          // Check if it already exists (optimistic update prevention)
          if (prev.find(c => c.id === payload.new.id)) return prev;
          return [...prev, payload.new as Comment];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [postId, fetchPost, fetchComments]);

  const handleSendComment = async () => {
    if (!inputText.trim() || !user || !postId || sending) return;
    setSending(true);
    const body = inputText.trim();
    setInputText('');

    try {
      const payload = {
        post_id: postId,
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
        await supabase.from('posts').update({ comment_count: newCount }).eq('id', postId);
        setPost({ ...post, comment_count: newCount });
      }

      // Trigger notification
      const { NotificationTriggers } = await import('../lib/notification-triggers');
      await NotificationTriggers.onPostCommented(postId, user.id, body);

    } catch (e) {
      console.error('Post comment error:', e);
      setInputText(body);
    } finally {
      setSending(false);
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const renderComment = useCallback(({ item }: { item: Comment }) => {
    return (
      <View style={styles.commentRow}>
        <View style={styles.avatar}>
          {item.user?.avatar_url || item.author_image ? (
            <Image source={{ uri: StorageService.getOptimizedImageUrl(item.user?.avatar_url || item.author_image, 100) || '' }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <View style={[styles.avatarImg, styles.avatarFallback, { backgroundColor: colors.tint }]}>
              <Text style={styles.avatarFallbackText}>
                {(item.user?.name || item.author_name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.commentContent}>
          <Text style={styles.commentText}>
            <Text style={[styles.authorName, { color: colors.text }]}>
              {item.user?.name || item.author_name}{'  '}
            </Text>
            <Text style={{ color: colors.text }}>
              {item.text}
            </Text>
          </Text>
          <View style={styles.commentActionsRow}>
            <Text style={[styles.timestamp, { color: colors.textMuted }]}>{timeAgo(item.timestamp)}</Text>
            {item.like_count > 0 && (
              <Text style={[styles.likeCountText, { color: colors.textMuted }]}>{item.like_count} likes</Text>
            )}
            <TouchableOpacity>
              <Text style={[styles.replyText, { color: colors.textMuted }]}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.heartIcon}>
          <Ionicons name="heart-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    );
  }, [colors]);

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.background }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Comments</Text>
        <View style={[styles.headerDivider, { backgroundColor: colors.borderLight }]} />
      </View>

      {loading && comments.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.tint} />
        </View>
      ) : (
        <BottomSheetFlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.text }]}>No comments yet.</Text>
              <Text style={[styles.emptySubText, { color: colors.textMuted }]}>Start the conversation.</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={[styles.inputContainer, { borderTopColor: colors.borderLight, backgroundColor: colors.background }]}>
        <View style={styles.inputAvatar}>
          {user?.user_metadata?.avatar_url ? (
            <Image source={{ uri: StorageService.getOptimizedImageUrl(user.user_metadata.avatar_url, 100) || '' }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <View style={[styles.avatarImg, styles.avatarFallback, { backgroundColor: colors.tint }]}>
              <Text style={styles.avatarFallbackText}>
                {(user?.user_metadata?.name || user?.email || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground }]}>
          <BottomSheetTextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Add a comment..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleSendComment}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Text style={[
                styles.sendText,
                { color: inputText.trim() ? '#82DB7E' : colors.textMuted }
              ]}>
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  headerDivider: {
    width: '100%',
    height: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  avatar: {
    marginRight: 12,
  },
  avatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  commentContent: {
    flex: 1,
    paddingRight: 16,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 6,
  },
  commentActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    marginRight: 12,
  },
  likeCountText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 12,
  },
  replyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heartIcon: {
    padding: 4,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  inputAvatar: {
    marginRight: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
