import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions,
  Platform, Share, ActionSheetIOS, Alert, AppState
} from 'react-native';
import Animated, { 
  useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, 
  interpolate, Extrapolation, withSpring, withSequence 
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import ImageViewing from 'react-native-image-viewing';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { Post, User } from '../../types';
import { formatPrice, timeAgo } from '../../lib/utils';
import { useAppTheme } from '../../context/ThemeContext';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const { width } = Dimensions.get('window');

const MarketVideo = React.memo(({ url, shouldPlay }: { url: string, shouldPlay: boolean }) => {
  const player = useVideoPlayer(url, player => {
    player.loop = true;
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && shouldPlay) {
        player.play();
      } else {
        player.pause();
      }
    });
    return () => subscription.remove();
  }, [shouldPlay, player]);

  useEffect(() => {
    if (shouldPlay && AppState.currentState === 'active') {
      player.play();
    } else {
      player.pause();
    }
  }, [shouldPlay, player]);

  return (
    <VideoView
      style={styles.mainImage}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
    />
  );
});

function MarketplaceDetailContent() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const isFocused = useIsFocused();

  const [post, setPost] = useState<Post | null>(null);
  const [postUser, setPostUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Gallery state
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeScrollIndex, setActiveScrollIndex] = useState(0);
  
  // Stats state
  const [itemsSold, setItemsSold] = useState(0);
  const [joinedDate, setJoinedDate] = useState('');
  
  // Description state
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  
  // Favourite state
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const scaleValue = useSharedValue(1);

  const fetchPost = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`*, user:users!posts_user_id_fkey(*)`)
        .eq('id', id)
        .single();

      if (!error && data) {
        setPost(data);
        if (data.user) {
          setPostUser(data.user as any);
          if (data.user.created_at) {
            const date = new Date(data.user.created_at);
            setJoinedDate(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
          }
        }
        
        // Items sold query
        const { count } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', data.user_id)
          .eq('category', 'For Sale')
          .eq('is_sold', true);
        
        if (count !== null) setItemsSold(count);
        
        setIsLiked(user ? (data.liked_by || []).includes(user.id) : false);
        setLikeCount(data.liked_by?.length || 0);

        if (user) {
          const { data: bookmarkData } = await supabase
            .from('post_bookmarks')
            .select('id')
            .eq('post_id', id)
            .eq('user_id', user.id)
            .maybeSingle();
          setIsBookmarked(!!bookmarkData);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleMessageSeller = async () => {
    if (!post || !user || user.id === post.user_id) return;

    try {
      const { data: convs, error: fetchError } = await supabase
        .from('conversations')
        .select('id, type, participant_ids, item_id')
        .eq('item_id', post.id)
        .order('created_at', { ascending: true });

      if (fetchError) console.error('Error fetching conversations:', fetchError);

      const existing = convs?.find(c => {
        if (c.type === 'marketplace' && c.item_id === post.id && c.participant_ids?.includes(user.id) && c.participant_ids?.includes(post.user_id)) return true;
        return false;
      });

      if (existing?.id) {
        router.push({ pathname: '/chat/[id]', params: { id: existing.id } });
        return;
      }

      const imageUrl = post.image_urls?.[0] || post.image_url || '';
      router.push({ 
        pathname: '/chat/[id]', 
        params: { 
          id: 'new',
          type: 'marketplace',
          participant_id: post.user_id,
          item_id: post.id,
          item_title: post.title || post.text || 'Listing',
          item_image: imageUrl,
          item_price: post.price ?? ''
        } 
      });
    } catch (e) {
      console.error('Error starting chat', e);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      await Share.share({
        message: `Check out ${post.title || 'this item'} for ${post.price === 0 ? 'FREE' : formatPrice(post.price || 0)} on YRDLY!`,
        url: `https://yrdly.com/marketplace/${post.id}`
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleMore = () => {
    const saveOption = isBookmarked ? 'Unsave Item' : 'Save Item';
    const options = ['Report Item', 'Copy Link', saveOption, 'Block Seller', 'Cancel'];
    const cancelButtonIndex = 4;
    
    const handleReport = () => {
      Alert.alert('Report Item', 'Are you sure you want to report this item?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', style: 'destructive', onPress: async () => {
          if (!user || !post) return;
          await supabase.from('reports').insert({ reporter_id: user.id, reported_post_id: post.id, reason: 'Inappropriate content' });
          Alert.alert('Success', 'Item reported to admins.');
        }}
      ]);
    };

    const handleBlock = () => {
      Alert.alert('Block Seller', 'You will no longer see content from this seller.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: async () => {
          if (!user || !post) return;
          await supabase.from('user_blocks').insert({ blocker_id: user.id, blocked_id: post.user_id });
          Alert.alert('Success', 'Seller blocked.');
        }}
      ]);
    };

    const handleBookmarkToggle = async () => {
      if (!user || !post) return;
      const newBookmarked = !isBookmarked;
      setIsBookmarked(newBookmarked);
      try {
        if (newBookmarked) {
          await supabase.from('post_bookmarks').insert({ post_id: post.id, user_id: user.id });
        } else {
          await supabase.from('post_bookmarks').delete().match({ post_id: post.id, user_id: user.id });
        }
      } catch (e) {
        setIsBookmarked(!newBookmarked);
      }
    };
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, destructiveButtonIndex: 3 },
        (buttonIndex) => {
          if (buttonIndex === 0) handleReport();
          if (buttonIndex === 1) handleShare();
          if (buttonIndex === 2) handleBookmarkToggle();
          if (buttonIndex === 3) handleBlock();
        }
      );
    } else {
      Alert.alert('More Options', 'Select an option', [
        { text: 'Report Item', onPress: handleReport },
        { text: 'Copy Link', onPress: handleShare },
        { text: saveOption, onPress: handleBookmarkToggle },
        { text: 'Block Seller', onPress: handleBlock, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]);
    }
  };

  const handleToggleLike = async () => {
    if (!post || !user) return;
    
    // Animate heart
    scaleValue.value = withSequence(
      withSpring(1.3, { damping: 5, stiffness: 200 }),
      withSpring(1, { damping: 5, stiffness: 200 })
    );

    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);

    const currentLikedBy = post.liked_by || [];
    const newLikedBy = newLikedState
      ? [...new Set([...currentLikedBy, user.id])]
      : currentLikedBy.filter(id => id !== user.id);

    // Optimistic update done, now save to backend
    const { error } = await supabase
      .from('posts')
      .update({ liked_by: newLikedBy })
      .eq('id', post.id);

    if (error) {
      // Rollback
      setIsLiked(!newLikedState);
      setLikeCount(prev => !newLikedState ? prev + 1 : prev - 1);
      console.error('Error toggling like:', error);
    } else {
      setPost(prev => prev ? { ...prev, liked_by: newLikedBy } : null);
    }
  };

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }]
  }));

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [-200, 0, 300], [-100, 0, 150], Extrapolation.CLAMP);
    const scale = interpolate(scrollY.value, [-200, 0], [1.5, 1], Extrapolation.CLAMP);
    return { transform: [{ translateY }, { scale }] };
  });

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Item not found</Text>
        <TouchableOpacity style={[styles.backBtnWrapper, { backgroundColor: colors.inputBackground }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: colors.text }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const imageUrls = post.image_urls?.length ? post.image_urls : post.image_url ? [post.image_url] : [];
  const mediaItems = [];
  if (post.video_url) mediaItems.push({ type: 'video', url: post.video_url });
  imageUrls.forEach(url => mediaItems.push({ type: 'image', url }));

  const isOwner = user?.id === post.user_id;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Absolute Header Overlay */}
      <View style={styles.absoluteHeader}>
        <SafeAreaView edges={['top']} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconCircle}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={handleShare} style={styles.iconCircle}>
              <Ionicons name="share-outline" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleMore} style={styles.iconCircle}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <Animated.ScrollView 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Images and Videos */}
        {mediaItems.length > 0 ? (
          <Animated.View style={[headerAnimatedStyle, styles.galleryContainer]}>
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false} 
              style={styles.imageScroll}
              onScroll={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                setActiveScrollIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {mediaItems.map((media, i) => (
                <View key={i} style={styles.mainImageContainer}>
                  {media.type === 'video' ? (
                    <MarketVideo url={media.url} shouldPlay={activeScrollIndex === i && isFocused} />
                  ) : (
                    <TouchableOpacity 
                      activeOpacity={0.9} 
                      style={{ flex: 1 }}
                      onPress={() => {
                        const imageIndex = post.video_url ? i - 1 : i;
                        setCurrentImageIndex(Math.max(0, imageIndex));
                        setIsGalleryVisible(true);
                      }}
                    >
                      <Image source={{ uri: media.url }} style={styles.mainImage} contentFit="cover" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
            
            {/* Gallery Indicator Row */}
            <View style={styles.galleryControls}>
              <View style={styles.paginationDots}>
                {mediaItems.map((_, i) => (
                  <View key={i} style={[styles.carouselDot, activeScrollIndex === i ? [styles.activeDot, { backgroundColor: colors.tint }] : styles.inactiveDot]} />
                ))}
              </View>
              {mediaItems.length > 1 && (
                <View style={styles.counterBadge}>
                  <Text style={styles.counterText}>{activeScrollIndex + 1}/{mediaItems.length}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: colors.borderLight }]}>
            <Ionicons name="image-outline" size={64} color={colors.textMuted} />
          </View>
        )}

        <View style={styles.contentPadding}>
          {/* Summary Card */}
          <View style={[styles.card, { backgroundColor: colors.inputBackground }]}>
            <View style={styles.titlePriceRow}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {post.title || post.text || 'Untitled'}
              </Text>
              <Text style={[styles.price, { color: colors.tint }]}>
                {post.price === 0 ? 'FREE' : formatPrice(post.price || 0)}
              </Text>
            </View>
            
            <View style={styles.metaRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.timestamp, { color: colors.textMuted }]}>
                  Posted {timeAgo(post.timestamp)}
                </Text>
                {(post.state || post.lga) && (
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={16} color={colors.tint} />
                    <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                      {post.lga ? `${post.lga}, ` : ''}{post.state || 'Location'}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={handleToggleLike} style={[styles.favouriteBtn, { backgroundColor: colors.background }]}>
                <Animated.View style={animatedHeartStyle}>
                  <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? colors.tint : colors.text} />
                </Animated.View>
                {likeCount > 0 && <Text style={[styles.likeCountText, { color: colors.textSecondary }]}>{likeCount}</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {/* Description Card */}
          {post.text && (
            <View style={[styles.card, { backgroundColor: colors.inputBackground }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
              <Text 
                style={[styles.description, { color: colors.textSecondary }]} 
                numberOfLines={descriptionExpanded ? undefined : 5}
              >
                {post.text}
              </Text>
              {post.text.length > 200 && (
                <TouchableOpacity onPress={() => setDescriptionExpanded(!descriptionExpanded)} style={{ marginTop: 8 }}>
                  <Text style={[styles.readMoreText, { color: colors.tint }]}>
                    {descriptionExpanded ? 'Show Less' : 'Read More'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Premium Seller Card */}
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: colors.inputBackground }]}
            onPress={() => router.push(`/profile/${post.user_id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.sellerHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
                {postUser?.avatar_url || post.author_image ? (
                  <Image source={{ uri: postUser?.avatar_url || post.author_image }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {postUser?.name ? postUser.name.charAt(0).toUpperCase() : 'U'}
                  </Text>
                )}
              </View>
              <View style={styles.sellerInfo}>
                <Text style={[styles.sellerName, { color: colors.text }]}>{postUser?.name || post.author_name || 'Unknown Seller'}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color={colors.tint} />
                  <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                    {postUser?.rating?.toFixed(1) || '0.0'} <Text style={{ color: colors.textMuted }}>({postUser?.review_count || 0} reviews)</Text>
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

            <View style={styles.statsRow}>
              <View style={styles.statColumn}>
                <Ionicons name={postUser?.verified_seller ? "shield-checkmark" : "shield-outline"} size={20} color={colors.textSecondary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{postUser?.verified_seller ? 'Verified' : 'Unverified'}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Seller</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.statColumn}>
                <Ionicons name="cube-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{itemsSold}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Items sold</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.statColumn}>
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{joinedDate || 'Recent'}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Joined</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.stickyFooter, { backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
        <SafeAreaView edges={['bottom']} style={{ flexDirection: 'row', width: '100%', paddingBottom: Platform.OS === 'ios' ? 0 : 16 }}>
          {isOwner ? (
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton, { backgroundColor: colors.inputBackground }]}
              onPress={() => router.push(`/marketplace/edit/${post.id}`)}
            >
              <Text style={[styles.editButtonText, { color: colors.text }]}>Edit Item</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={[styles.messageButton, { borderColor: colors.tint, backgroundColor: colors.inputBackground }]} onPress={handleMessageSeller}>
                <Ionicons name="chatbubble-outline" size={20} color={colors.tint} />
                <Text style={[styles.messageButtonText, { color: colors.tint }]}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.buyButton, { backgroundColor: colors.tint }]}
                onPress={() => router.push({ pathname: '/checkout/[id]', params: { id: post.id, type: 'marketplace' } })}
              >
                <Ionicons name="bag-check-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.buyButtonText}>Buy Now</Text>
              </TouchableOpacity>
            </>
          )}
        </SafeAreaView>
      </View>

      <ImageViewing
        images={imageUrls.map(uri => ({ uri }))}
        imageIndex={currentImageIndex}
        visible={isGalleryVisible}
        onRequestClose={() => setIsGalleryVisible(false)}
        swipeToCloseEnabled={true}
        doubleTapToZoomEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, marginBottom: 20 },
  backBtnWrapper: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  backBtnText: { fontWeight: 'bold' },
  absoluteHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    paddingTop: 10,
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  scrollContent: { flex: 1 },
  galleryContainer: {
    width: width, height: width * 1.15,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: 'hidden', backgroundColor: '#000',
  },
  imageScroll: { flex: 1 },
  mainImageContainer: { width: width, height: width * 1.15 },
  mainImage: { width: width, height: '100%' },
  galleryControls: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  paginationDots: { flexDirection: 'row', alignItems: 'center' },
  carouselDot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 3 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  inactiveDot: { backgroundColor: 'rgba(255, 255, 255, 0.4)' },
  counterBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  placeholderImage: { 
    width: width, height: width * 1.15, 
    justifyContent: 'center', alignItems: 'center',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32
  },
  contentPadding: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  card: { padding: 16, borderRadius: 24 },
  titlePriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', flex: 1, marginRight: 16, lineHeight: 28 },
  price: { fontSize: 26, fontWeight: '800' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  timestamp: { fontSize: 13, marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 14, fontWeight: '500' },
  favouriteBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, 
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 
  },
  likeCountText: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  description: { fontSize: 16, lineHeight: 24 },
  readMoreText: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  sellerHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 16, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' },
  sellerInfo: { flex: 1 },
  sellerName: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, marginVertical: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8 },
  statColumn: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  statLabel: { fontSize: 12 },
  statDivider: { width: 1, height: 30 },
  stickyFooter: {
    paddingHorizontal: 16, paddingTop: 16,
    borderTopWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, 
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 10,
  },
  actionButton: { flex: 1, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
  editButton: { borderWidth: 1, borderColor: '#333' },
  editButtonText: { fontSize: 16, fontWeight: 'bold' },
  messageButton: {
    flex: 1, flexDirection: 'row', height: 54, borderRadius: 27, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  messageButtonText: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  buyButton: {
    flex: 1, flexDirection: 'row', height: 54, borderRadius: 27, 
    justifyContent: 'center', alignItems: 'center',
  },
  buyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

export default function MarketplaceDetailScreen() {
  return (
    <ErrorBoundary screenName="MarketplaceDetail">
      <MarketplaceDetailContent />
    </ErrorBoundary>
  );
}
