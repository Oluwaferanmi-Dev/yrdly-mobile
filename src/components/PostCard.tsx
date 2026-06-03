import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { MessageCircle, Share2, Heart } from 'lucide-react-native';
import { Post } from '../types';
import { timeAgo, formatPrice } from '../lib/utils';
import { useAuth } from '../hooks/use-supabase-auth';
import { theme } from '../theme';

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
  
  // Local state for optimistic UI updates
  const [likesCount, setLikesCount] = useState(post.liked_by?.length || 0);
  const [isLiked, setIsLiked] = useState(currentUser ? (post.liked_by || []).includes(currentUser.id) : false);

  const handleLike = () => {
    // Optimistic toggle
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    
    // Call parent handler to update DB
    if (onLike) onLike();
  };

  const getInitials = (name?: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const urls = post.image_urls?.length ? post.image_urls : post.image_url ? [post.image_url] : [];

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.authorRow}>
          <View style={styles.avatar}>
            {post.author_image ? (
              <Image source={{ uri: post.author_image }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{getInitials(post.author_name)}</Text>
            )}
          </View>
          <View style={styles.authorText}>
            <Text style={styles.authorName}>{post.author_name || 'Anonymous'}</Text>
            <Text style={styles.timeAgo}>{timeAgo(post.timestamp || post.created_at)}</Text>
          </View>
        </View>

        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{post.category || 'General'}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {!!post.title && <Text style={styles.title}>{post.title}</Text>}
        {!!post.text && <Text style={styles.bodyText} numberOfLines={3}>{post.text}</Text>}
      </View>

      {/* Images */}
      {urls.length > 0 && (
        <View style={styles.imageContainer}>
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
        <Text style={styles.price}>{formatPrice(post.price)}</Text>
      )}

      {/* Engagement Row */}
      <View style={styles.footer}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Heart
              size={22} 
              color={isLiked ? theme.colors.primary : theme.colors.textSecondary}
              fill={isLiked ? theme.colors.primary : "transparent"} />
            <Text style={styles.actionText}>{likesCount > 0 ? likesCount : ''}</Text>
          </TouchableOpacity>

          <View style={styles.dot} />

          <TouchableOpacity style={styles.actionButton} onPress={onComment}>
            <MessageCircle size={20} color={theme.colors.textSecondary} />
            <Text style={styles.actionText}>{post.comment_count || 0}</Text>
          </TouchableOpacity>

          <View style={styles.dot} />

          <TouchableOpacity style={styles.actionButton} onPress={onShare}>
            <Share2 size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.base,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceDim,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fonts.heading,
    color: theme.colors.primary,
  },
  authorText: {
    marginLeft: 10,
  },
  authorName: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fonts.heading,
    color: theme.colors.textPrimary,
  },
  timeAgo: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: theme.colors.surfaceDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.textPrimary,
  },
  content: {
    marginBottom: 12,
  },
  title: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fonts.heading,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: theme.radius.base,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: theme.colors.surfaceDim,
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
    fontFamily: theme.typography.fonts.heading,
  },
  price: {
    fontSize: 20,
    fontFamily: theme.typography.fonts.heading,
    color: theme.colors.primary,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
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
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.border,
    marginHorizontal: 12,
  },
});
