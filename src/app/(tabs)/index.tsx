import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { PostCard } from '../../components/PostCard';
import { PostSkeleton } from '../../components/Skeleton';
import { supabase } from '../../lib/supabase';
import { Post } from '../../types';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocation } from '../../context/LocationContext';
import { LocationChip } from '../../components/LocationChip';
import Animated, {
  useAnimatedScrollHandler, useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { Image } from 'expo-image';
import { MapIcon, NotificationsIcon } from '../../components/SvgIcons';
import { usePosts } from '../../hooks/use-posts';
import { useAuth } from '../../hooks/use-supabase-auth';
import { CommentsBottomSheet, CommentsBottomSheetRef } from '../../components/CommentsBottomSheet';
import ImageViewing from 'react-native-image-viewing';
import { useNotificationBadge } from '../../context/NotificationBadgeContext';
import { useScrollToTop, useIsFocused } from '@react-navigation/native';
import { AlertBanner } from '../../components/AlertBanner';
import { AlertService, Alert } from '../../lib/alert-service';
import * as SecureStore from 'expo-secure-store';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList as any) as any;

/** Staggered entrance for each feed item — only animates on first mount */
const FeedItemWrapper = memo(({ index, children }: { index: number; children: React.ReactNode }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(18);

  useEffect(() => {
    const delay = Math.min(index, 6) * 60; // stagger first 6, cap rest
    opacity.value = withDelay(delay, withTiming(1, { duration: 350 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 150 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
});

const QuickPostBox = memo(() => {
  const { user, profile } = useAuth();
  const { colors, isDarkMode } = useAppTheme();
  const router = useRouter();

  const avatarUri = profile?.avatar_url || user?.user_metadata?.avatar_url || null;

  const content = (
    <>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.tint, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' }}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <Text style={{ color: 'white', fontWeight: 'bold' }}>{profile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}</Text>
        )}
      </View>
      <TouchableOpacity 
        style={{ flex: 1, height: 36, justifyContent: 'center' }}
        onPress={() => router.push('/create')}
        activeOpacity={0.7}
      >
        <Text style={{ color: colors.textSecondary, fontSize: 15 }} numberOfLines={1} ellipsizeMode="tail">What's happening, neighbour?</Text>
      </TouchableOpacity>
      
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity 
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDarkMode ? '#333' : '#F0F0F0', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => router.push('/create')}
        >
          <Feather name="image" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={{ paddingHorizontal: 16, height: 36, borderRadius: 18, backgroundColor: colors.tint, justifyContent: 'center', alignItems: 'center' }}
          onPress={() => router.push('/create')}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Post</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const containerStyle = {
    padding: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={() => router.push('/create')}
      style={{ overflow: 'hidden', marginHorizontal: 16, marginTop: 12, marginBottom: 8, borderRadius: 24 }}
    >
      {isLiquidGlassSupported ? (
        <LiquidGlassView
          {...({ intensity: 80, tint: isDarkMode ? 'dark' : 'light', fallbackColor: isDarkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)' } as any)}
          style={containerStyle}
          pointerEvents="none"
        >
          {content}
        </LiquidGlassView>
      ) : (
        <BlurView
          intensity={80}
          tint={isDarkMode ? 'dark' : 'light'}
          style={[containerStyle, { backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.5)' }]}
          pointerEvents="none"
        >
          {content}
        </BlurView>
      )}
    </TouchableOpacity>
  );
});

export default function HomeTab() {
  const { colors, isDarkMode } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeFilter } = useLocation();
  const { posts: allPosts, loading, refreshPosts } = usePosts(activeFilter);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [viewerImages, setViewerImages] = useState<{ uri: string }[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const bottomSheetRef = useRef<CommentsBottomSheetRef>(null);
  const { unreadCount } = useNotificationBadge();
  const flashListRef = useRef<any>(null);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const isFocused = useIsFocused();
  
  useScrollToTop(flashListRef);
  
  const HEADER_HEIGHT = Platform.OS === 'ios' ? 44 + insets.top : 56 + insets.top;

  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const isScrollingUp = useSharedValue(true);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      if (currentY > lastScrollY.value && currentY > 50) {
        isScrollingUp.value = false;
      } else if (currentY < lastScrollY.value) {
        isScrollingUp.value = true;
      }
      lastScrollY.value = currentY;
      scrollY.value = currentY;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = withTiming(isScrollingUp.value || scrollY.value <= 50 ? 0 : -HEADER_HEIGHT, { duration: 250 });
    return {
      transform: [{ translateY }],
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      height: HEADER_HEIGHT,
    };
  });

  const posts = useMemo(() => {
    return allPosts.filter(post => {
      if (post.category === 'Event' && post.event_date) {
        return new Date(post.event_date).getTime() >= Date.now();
      }
      return true;
    });
  }, [allPosts]);

  const fetchAlerts = useCallback(async () => {
    const alerts = await AlertService.getActiveAlerts();
    const visibleAlerts = [];
    for (const alert of alerts) {
      const dismissed = await SecureStore.getItemAsync(`yrdly_dismissed_alert_${alert.id}`);
      if (!dismissed) visibleAlerts.push(alert);
    }
    setActiveAlerts(visibleAlerts);
  }, []);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await Promise.all([
      refreshPosts(),
      fetchAlerts()
    ]);
    setRefreshing(false);
  }, [refreshPosts, fetchAlerts]);

  useFocusEffect(
    useCallback(() => {
      refreshPosts();
      fetchAlerts();
    }, [refreshPosts, fetchAlerts])
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setActivePostId(viewableItems[0].key);
    } else {
      setActivePostId(null);
    }
  }, []);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View style={headerAnimatedStyle}>
          {isLiquidGlassSupported ? (
            <LiquidGlassView 
              {...({ intensity: 80, tint: isDarkMode ? 'dark' : 'light', fallbackColor: isDarkMode ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.85)' } as any)}
              style={StyleSheet.absoluteFill} 
            />
          ) : (
            <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          )}
          <View style={[styles.headerContent, { paddingTop: insets.top, borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.headerTitle, { color: colors.tint }]}>YRDLY</Text>
            
            <View style={{flex: 1, paddingHorizontal: 12, alignItems: 'flex-start'}}>
              <LocationChip />
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity style={{ marginRight: 16 }} onPress={() => router.push('/map')}>
                <MapIcon size={24} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/notifications')} style={{ position: 'relative' }}>
                <NotificationsIcon size={24} color={colors.text} />
                {unreadCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    right: -4,
                    top: -4,
                    backgroundColor: '#EF4444',
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                    borderWidth: 1.5,
                    borderColor: colors.background
                  }}>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
        <View style={{ paddingTop: HEADER_HEIGHT }}>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={headerAnimatedStyle}>
        {isLiquidGlassSupported ? (
          <LiquidGlassView 
            {...({ intensity: 80, tint: isDarkMode ? 'dark' : 'light', fallbackColor: isDarkMode ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.85)' } as any)}
            style={StyleSheet.absoluteFill} 
          />
        ) : (
          <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        )}
        <View style={[styles.headerContent, { paddingTop: insets.top, borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.headerTitle, { color: colors.tint }]}>YRDLY</Text>
          
          <View style={{flex: 1, paddingHorizontal: 12, alignItems: 'flex-start'}}>
            <LocationChip />
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={{ marginRight: 16 }} onPress={() => router.push('/map')}>
              <MapIcon size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={{ position: 'relative' }}>
              <NotificationsIcon size={24} color={colors.text} />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  right: -4,
                  top: -4,
                  backgroundColor: '#EF4444',
                  borderRadius: 10,
                  minWidth: 18,
                  height: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                  borderWidth: 1.5,
                  borderColor: colors.background
                }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <AnimatedFlashList
        ref={flashListRef}
        data={posts}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        keyExtractor={(item: Post) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }: { item: Post; index: number }) => (
          <FeedItemWrapper index={index}>
            <PostCard 
              post={item} 
              isVisible={isFocused && activePostId === item.id}
              onPress={() => {
                if (item.category === 'For Sale') {
                  router.push(`/marketplace/${item.id}`);
                } else if (item.category === 'Event') {
                  let eventId = item.id; // Fallback to post id for legacy events
                  if (item.event_link) {
                    const cleanLink = item.event_link.split('?')[0];
                    const parts = cleanLink.split('/');
                    eventId = parts.pop() || parts.pop() || item.id;
                  }
                  router.push(`/events/${eventId}`);
                } else {
                  router.push(`/posts/${item.id}`);
                }
              }}
              onComment={() => {
                setActiveCommentPostId(item.id);
                bottomSheetRef.current?.present();
              }}
              onOpenImageViewer={(images, index) => {
                setViewerImages(images);
                setViewerIndex(index);
                setViewerVisible(true);
              }}
            />
          </FeedItemWrapper>
        )}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.tint} 
            colors={[colors.tint]} 
            progressViewOffset={HEADER_HEIGHT}
          />
        }
        ListHeaderComponent={
          <View>
            {activeAlerts.length === 1 && (
              <AlertBanner 
                alert={activeAlerts[0]} 
                onPress={() => router.push('/alerts')} 
                onDismiss={async () => {
                  // Persist dismissal so it doesn't reappear on refresh
                  await SecureStore.setItemAsync(`yrdly_dismissed_alert_${activeAlerts[0].id}`, 'true');
                  setActiveAlerts([]);
                }}
              />
            )}
            {activeAlerts.length > 1 && (
              <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => router.push('/alerts')}
                style={{
                  marginHorizontal: 16,
                  marginTop: 16,
                  marginBottom: 8,
                  borderRadius: 16,
                  elevation: 4,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  overflow: 'visible',
                }}
              >
                {isLiquidGlassSupported ? (
                  <LiquidGlassView
                    {...({ intensity: 90, tint: "light", fallbackColor: "rgba(254, 226, 226, 0.95)" } as any)}
                    style={{
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: 'rgba(252, 165, 165, 0.5)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      overflow: 'hidden'
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="warning" size={24} color="#7f1d1d" />
                      <Text style={{ marginLeft: 12, fontFamily: 'Inter-Bold', fontSize: 14, color: '#7f1d1d' }}>
                        {activeAlerts.length} Active Safety Alerts
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#7f1d1d" />
                  </LiquidGlassView>
                ) : (
                  <BlurView
                    intensity={90}
                    tint="light"
                    style={{
                      borderRadius: 16,
                      padding: 16,
                      backgroundColor: 'rgba(254, 226, 226, 0.4)',
                      borderWidth: 1,
                      borderColor: 'rgba(252, 165, 165, 0.5)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      overflow: 'hidden'
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="warning" size={24} color="#7f1d1d" />
                      <Text style={{ marginLeft: 12, fontFamily: 'Inter-Bold', fontSize: 14, color: '#7f1d1d' }}>
                        {activeAlerts.length} Active Safety Alerts
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#7f1d1d" />
                  </BlurView>
                )}
              </TouchableOpacity>
            )}
            <QuickPostBox />
          </View>
        }
        contentContainerStyle={[styles.listContent, { paddingTop: HEADER_HEIGHT, paddingBottom: 80 }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No posts yet. Be the first to post!</Text>
          </View>
        }
      />
      <CommentsBottomSheet ref={bottomSheetRef} postId={activeCommentPostId} />
      <ImageViewing
        images={viewerImages}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
        swipeToCloseEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    // handled dynamically
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
