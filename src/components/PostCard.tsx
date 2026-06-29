import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image as RNImage, FlatList, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Post } from '../types';
import { timeAgo, formatPrice } from '../lib/utils';
import { useAuth } from '../hooks/use-supabase-auth';
import { useAppTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { StorageService } from '../lib/storage-service';

const { width } = Dimensions.get('window');

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  isVisible?: boolean;
  onOpenImageViewer?: (images: { uri: string }[], index: number) => void;
}

const PostVideo = React.memo(function PostVideo({ post, isVisible, isVideoMuted, setIsVideoMuted }: { post: Post, isVisible?: boolean, isVideoMuted: boolean, setIsVideoMuted: (muted: boolean) => void }) {
  const [isReady, setIsReady] = useState(false);
  
  const player = useVideoPlayer(post.video_url || '', player => {
    player.loop = true;
    player.muted = isVideoMuted;
    if (isVisible !== false) {
      player.play();
    }
  });

  useEffect(() => {
    if (player) {
      player.muted = isVideoMuted;
    }
  }, [isVideoMuted, player]);

  useEffect(() => {
    if (player) {
      if (isVisible === false) {
        player.pause();
      } else {
        player.play();
      }
    }
  }, [isVisible, player]);

  return (
    <>
      <VideoView
        player={player}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        nativeControls={true}
        onFirstFrameRender={() => setIsReady(true)}
      />
      {!isReady && post.video_thumbnail_url && (
        <Image 
          source={{ uri: post.video_thumbnail_url }} 
          style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1 }} 
          contentFit="cover" 
        />
      )}
      <TouchableOpacity 
        style={[styles.muteButtonOverlay, { zIndex: 2 }]} 
        onPress={(e) => { 
          e.stopPropagation(); 
          setIsVideoMuted(!isVideoMuted); 
        }}
        activeOpacity={0.8}
      >
        <Ionicons name={isVideoMuted ? "volume-mute" : "volume-medium"} size={20} color="#FFF" />
      </TouchableOpacity>
    </>
  );
});

export const PostCard = React.memo(function PostCard({ post, onPress, onLike, onComment, onShare, isVisible, onOpenImageViewer }: PostCardProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { colors } = useAppTheme();

  const [imageHeights, setImageHeights] = useState<Record<string, number>>({});
  const imageDisplayWidth = width - 32;
  const [isExpanded, setIsExpanded] = useState(false);

  const [likesCount, setLikesCount] = useState(post.liked_by?.length || 0);
  const [isLiked, setIsLiked] = useState(currentUser ? (post.liked_by || []).includes(currentUser.id) : false);

  // Sync state when post prop changes (crucial for FlashList cell recycling)
  useEffect(() => {
    setLikesCount(post.liked_by?.length || 0);
    setIsLiked(currentUser ? (post.liked_by || []).includes(currentUser.id) : false);
  }, [post.liked_by, currentUser]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveImageIndex(viewableItems[0].index || 0);
    }
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const urls = post.image_urls?.length ? post.image_urls : post.image_url ? [post.image_url] : [];

  useEffect(() => {
    if (isVisible === false) {
      setIsVideoMuted(true);
    }
  }, [isVisible]);

  useEffect(() => {
    urls.forEach((url) => {
      if (!url || imageHeights[url]) return;

      if (post.image_width && post.image_height) {
        const displayHeight = (post.image_height / post.image_width) * imageDisplayWidth;
        setImageHeights((prev) => ({ ...prev, [url]: Math.min(displayHeight, imageDisplayWidth * 1.5) }));
        return;
      }

      RNImage.getSize(url, (naturalWidth, naturalHeight) => {
        if (naturalWidth && naturalHeight) {
          const displayHeight = (naturalHeight / naturalWidth) * imageDisplayWidth;
          setImageHeights((prev) => ({ ...prev, [url]: Math.min(displayHeight, imageDisplayWidth * 1.5) }));
        }
      }, () => {
        // Silently handle get size errors
      });
    });
  }, [urls, post.image_width, post.image_height, imageDisplayWidth]);

  const triggerHeartAnimation = () => {
    heartScale.value = withSequence(
      withTiming(0, { duration: 0 }),
      withSpring(1.2, { damping: 10, stiffness: 100 }),
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 200 })
    );
    heartOpacity.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(1, { duration: 100 }),
      withTiming(1, { duration: 400 }),
      withTiming(0, { duration: 200 })
    );
  };

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }]
  }));

  const handleImageTap = (index: number) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      lastTapRef.current = 0;
      
      if (!isLiked) {
        handleLike();
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      triggerHeartAnimation();
    } else {
      lastTapRef.current = now;
      singleTapTimerRef.current = setTimeout(() => {
        if (onOpenImageViewer) {
          onOpenImageViewer(urls.map(u => ({ uri: u })), index);
        }
      }, DOUBLE_PRESS_DELAY);
    }
  };

  const handleLike = async () => {
    if (!currentUser) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);
    if (onLike) onLike();

    try {
      const currentLikedBy = post.liked_by || [];
      let newLikedBy;
      
      if (newIsLiked) {
        // Add to array only if not already present to avoid duplicates
        newLikedBy = currentLikedBy.includes(currentUser.id) 
          ? currentLikedBy 
          : [...currentLikedBy, currentUser.id];
      } else {
        newLikedBy = currentLikedBy.filter(id => id !== currentUser.id);
      }

      const { error } = await supabase
        .from('posts')
        .update({ liked_by: newLikedBy })
        .eq('id', post.id);

      if (error) throw error;

      // Trigger notification
      if (newIsLiked) {
        const { NotificationTriggers } = await import('../lib/notification-triggers');
        await NotificationTriggers.onPostLiked(post.id, currentUser.id);
      }
    } catch (e) {
      console.error('Error liking post:', e);
      // Revert optimistic update on failure
      setIsLiked(!newIsLiked);
      setLikesCount(prev => newIsLiked ? prev - 1 : prev + 1);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = `https://app.yrdly.ng/posts/${post.id}`;
      
      const shareOptions = {
        message: shareUrl,
        url: shareUrl,
      };
      
      await Share.share(shareOptions);
      if (onShare) onShare();
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const getInitials = (name?: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.container, { borderBottomColor: colors.borderLight }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.authorRow}
          onPress={(e) => {
            e.stopPropagation();
            router.push(`/profile/${post.user_id}`);
          }}
        >
          <View style={[styles.avatar, { backgroundColor: colors.inputBackground }]}>
            {post.user?.avatar_url || post.author_image ? (
              <Image source={{ uri: StorageService.getOptimizedImageUrl(post.user?.avatar_url || post.author_image || null, 150) || '' }} style={styles.avatarImage} />
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
            {(post.ward || post.user?.location?.ward) || (post.lga || post.user?.location?.lga) || (post.state || post.user?.location?.state) ? (
              <Text style={[styles.timeAgo, { color: colors.textMuted }]}>
                {[post.ward || post.user?.location?.ward, (post.lga || post.user?.location?.lga) || (post.state || post.user?.location?.state)].filter(Boolean).join(', ')} • {timeAgo(post.timestamp || post.created_at)}
              </Text>
            ) : (
              <Text style={[styles.timeAgo, { color: colors.textMuted }]}>
                {timeAgo(post.timestamp || post.created_at)}
              </Text>
            )}
          </View>
        </TouchableOpacity>

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
          <View>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]} numberOfLines={isExpanded ? undefined : 3}>
              {post.text}
            </Text>
            {post.text.length > 120 && (
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} style={{ marginTop: 4 }}>
                <Text style={{ color: colors.tint, fontWeight: '600' }}>
                  {isExpanded ? 'Show less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Video */}
      {post.video_url && (
        <View style={[styles.imageContainer, { width: imageDisplayWidth, height: imageDisplayWidth, backgroundColor: '#000' }]}>
          <PostVideo 
            post={post} 
            isVisible={isVisible} 
            isVideoMuted={isVideoMuted} 
            setIsVideoMuted={setIsVideoMuted} 
          />
        </View>
      )}

      {/* Images */}
      {urls.length > 0 && (
        <View style={{ position: 'relative' }}>
          <FlatList
            data={urls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item, index }) => (
              <TouchableOpacity 
                activeOpacity={0.95}
                onPress={() => handleImageTap(index)}
                style={[styles.imageContainer, { backgroundColor: colors.borderLight, width: imageDisplayWidth, height: imageHeights[item] ?? 200 }]}
              >
                <Image source={{ uri: StorageService.getOptimizedImageUrl(item, 800) || item }} style={[styles.postImage, { height: imageHeights[item] ?? 200 }]} contentFit="cover" />
                
                <Animated.View style={[styles.heartOverlay, heartAnimatedStyle]}>
                  <Ionicons name="heart" size={100} color="#fff" style={styles.heartShadow} />
                </Animated.View>
              </TouchableOpacity>
            )}
          />
          {urls.length > 1 && (
            <View style={styles.paginationDots}>
              {urls.map((_, i) => (
                <View key={i} style={[styles.carouselDot, activeImageIndex === i ? [styles.activeDot, { backgroundColor: colors.tint }] : styles.inactiveDot]} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Price or Ticket Info */}
      {(post.category === 'For Sale' || post.category === 'Event') && post.price !== undefined && (
        <Text style={[styles.price, { color: colors.tint }]}>
          {post.category === 'Event' && (post.price === 0 || !post.price) 
            ? 'FREE' 
            : formatPrice(post.price)}
        </Text>
      )}

      {/* Engagement Row */}
      <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={isLiked ? '#ED1111' : colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>
              {likesCount > 0 ? likesCount : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={onComment}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>
              {post.comment_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.liked_by?.length === nextProps.post.liked_by?.length &&
    prevProps.post.comment_count === nextProps.post.comment_count &&
    prevProps.isVisible === nextProps.isVisible
  );
});

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
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 12,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
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
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
  },
  muteButtonOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  postImage: {
    width: '100%',
  },
  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heartShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
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

});
