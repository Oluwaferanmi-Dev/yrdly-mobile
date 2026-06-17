import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Post } from '../types';
import { timeAgo, formatPrice } from '../lib/utils';
import { useAuth } from '../hooks/use-supabase-auth';
import { useAppTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

export function PostCard({ post, onPress, onLike, onComment, onShare }: PostCardProps) {
  const { user: currentUser } = useAuth();
  const { colors } = useAppTheme();

  const [likesCount, setLikesCount] = useState(post.liked_by?.length || 0);
  const [isLiked, setIsLiked] = useState(currentUser ? (post.liked_by || []).includes(currentUser.id) : false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    if (onLike) onLike();
  };

  const getInitials = (name?: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const urls = post.image_urls?.length ? post.image_urls : post.image_url ? [post.image_url] : [];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.container, { borderBottomColor: colors.borderLight }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.authorRow}>
          <View style={[styles.avatar, { backgroundColor: colors.inputBackground }]}>
            {post.user?.avatar_url || post.author_image ? (
              <Image source={{ uri: post.user?.avatar_url || post.author_image }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.tint }]}>
                {getInitials(post.user?.name || post.author_name)}
              </Text>
            )}
          </View>
          <View style={styles.authorText}>
            <Text style={[styles.authorName, { color: colors.text }]}>
              {post.user?.name || post.author_name || 'Anonymous'}
            </Text>
            <Text style={[styles.timeAgo, { color: colors.textMuted }]}>
              {timeAgo(post.timestamp || post.created_at)}
            </Text>
          </View>
        </View>

        <View style={[styles.categoryBadge, { backgroundColor: colors.borderLight }]}>
          <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
            {post.category || 'General'}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {!!post.title && (
          <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>
        )}
        {!!post.text && (
          <Text style={[styles.bodyText, { color: colors.textSecondary }]} numberOfLines={3}>
            {post.text}
          </Text>
        )}
      </View>

      {/* Images */}
      {urls.length > 0 && (
        <View style={[styles.imageContainer, { backgroundColor: colors.borderLight }]}>
          <Image source={{ uri: urls[0] }} style={styles.postImage} contentFit="cover" />
          {urls.length > 1 && (
            <View style={styles.imageOverlay}>
              <Text style={styles.overlayText}>+{urls.length - 1}</Text>
            </View>
          )}
        </View>
      )}

      {/* For Sale Price */}
      {post.category === 'For Sale' && post.price !== undefined && (
        <Text style={[styles.price, { color: colors.tint }]}>{formatPrice(post.price)}</Text>
      )}

      {/* Engagement Row */}
      <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Feather
              name={isLiked ? 'heart' : 'heart'}
              size={22}
              color={isLiked ? '#ED1111' : colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>
              {likesCount > 0 ? likesCount : ''}
            </Text>
          </TouchableOpacity>

          <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />

          <TouchableOpacity style={styles.actionButton} onPress={onComment}>
            <Feather name="message-circle" size={20} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>
              {post.comment_count || 0}
            </Text>
          </TouchableOpacity>

          <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />

          <TouchableOpacity style={styles.actionButton} onPress={onShare}>
            <Feather name="share" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  authorText: {
    marginLeft: 10,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: 12,
    marginTop: 1,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 8,
  },
  actionText: {
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 10,
  },
});
