import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { timeAgo } from '../lib/utils';
import { useAppTheme } from '../context/ThemeContext';
import { StorageService } from '../lib/storage-service';

export interface CommentType {
  id: string;
  user_id: string;
  author_name: string;
  author_image: string;
  text: string;
  timestamp: string;
  like_count: number;
  parent_id?: string;
  replies?: CommentType[];
  user?: {
    name: string;
    avatar_url: string;
  };
  is_liked?: boolean;
}

interface CommentItemProps {
  item: CommentType;
  currentUserId?: string;
  onReply?: (item: CommentType) => void;
  onLike?: (item: CommentType) => void;
  onDelete?: (item: CommentType) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({ item, currentUserId, onReply, onLike, onDelete }) => {
  const { colors } = useAppTheme();
  const [showReplies, setShowReplies] = useState(false);

  const hasReplies = item.replies && item.replies.length > 0;
  const isReply = !!item.parent_id;
  const isOwner = currentUserId && item.user_id === currentUserId;

  const avatarUri = StorageService.getOptimizedImageUrl(item.user?.avatar_url || item.author_image, 100) || '';
  const avatarSource = useMemo(() => ({ uri: avatarUri }), [avatarUri]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => onDelete?.(item) 
        }
      ]
    );
  };

  return (
    <View style={[styles.commentContainer, isReply && styles.replyContainer]}>
      <TouchableOpacity 
        style={styles.commentRow} 
        onLongPress={isOwner ? handleDelete : undefined}
        delayLongPress={500}
        activeOpacity={isOwner ? 0.6 : 1}
      >
      <View style={styles.avatar}>
        {item.user?.avatar_url || item.author_image ? (
          <Image 
            source={avatarSource} 
            style={[styles.avatarImg, isReply && styles.avatarImgSmall]} 
            contentFit="cover" 
          />
        ) : (
          <View style={[styles.avatarImg, isReply && styles.avatarImgSmall, styles.avatarFallback, { backgroundColor: colors.tint }]}>
            <Text style={[styles.avatarFallbackText, isReply && { fontSize: 12 }]}>
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
          <TouchableOpacity onPress={() => onReply?.(item)} style={{ marginRight: 12 }}>
            <Text style={[styles.replyText, { color: colors.textMuted }]}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.heartIcon} onPress={() => onLike?.(item)}>
        <Ionicons 
          name={item.is_liked ? "heart" : "heart-outline"} 
          size={isReply ? 14 : 16} 
          color={item.is_liked ? "#EF4444" : colors.textMuted} 
        />
      </TouchableOpacity>
      </TouchableOpacity>
      
      {hasReplies && !showReplies && (
        <TouchableOpacity style={styles.viewRepliesBtn} onPress={() => setShowReplies(true)}>
          <View style={[styles.viewRepliesLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.viewRepliesText, { color: colors.textMuted }]}>
            View {item.replies!.length} {item.replies!.length === 1 ? 'reply' : 'replies'}
          </Text>
        </TouchableOpacity>
      )}

      {hasReplies && showReplies && (
        <View style={styles.repliesList}>
          {item.replies!.map(reply => (
            <CommentItem 
              key={reply.id} 
              item={reply} 
              currentUserId={currentUserId}
              onReply={onReply} 
              onLike={onLike} 
              onDelete={onDelete} 
            />
          ))}
          <TouchableOpacity style={styles.viewRepliesBtn} onPress={() => setShowReplies(false)}>
            <View style={[styles.viewRepliesLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.viewRepliesText, { color: colors.textMuted }]}>Hide replies</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  commentContainer: {
    marginBottom: 16,
  },
  replyContainer: {
    marginLeft: 40,
    marginBottom: 12,
  },
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
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
  avatarImgSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
  viewRepliesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 60,
    marginTop: 8,
  },
  viewRepliesLine: {
    width: 24,
    height: 1,
    marginRight: 8,
  },
  viewRepliesText: {
    fontSize: 12,
    fontWeight: '600',
  },
  repliesList: {
    marginTop: 12,
  },
});
