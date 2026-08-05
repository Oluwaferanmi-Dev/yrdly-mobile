import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Feather, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/use-supabase-auth';
import { supabase } from '../../lib/supabase';
import { PostSkeleton } from '../../components/Skeleton';
import { Post } from '../../types';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfilePostGridItem } from '../../components/ProfilePostGridItem';
import Animated, { FadeIn, FadeOut, Layout, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { G, GLASS_BORDER, LABEL, TEXT_PRIMARY, DARK, SURFACE, MUTED } from '../../constants/tokens';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

function PressableCard({ style, onPress, children, activeOpacity = 0.85, ...props }: any) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedTouchableOpacity
      style={[style, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={activeOpacity}
      {...props}
    >
      {children}
    </AnimatedTouchableOpacity>
  );
}

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => dynamicStyles(colors), [colors]);
  const { width: windowWidth } = useWindowDimensions();
  const TARGET_TILE_WIDTH = 120;
  const numColumns = Math.max(3, Math.floor(windowWidth / TARGET_TILE_WIDTH));
  const GRID_ITEM_WIDTH = windowWidth / numColumns;

  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const fetchUserPosts = useCallback(async (isRefresh = false) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setPosts(data as Post[]);

      const [{ count: fers }, { count: fing }] = await Promise.all([
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', user.id)
      ]);
      setFollowersCount(fers || 0);
      setFollowingCount(fing || 0);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoadingPosts(false);
      setRefreshing(false);
    }
  }, [user]);

  const fetchSavedPosts = useCallback(async () => {
    if (!user) return;
    setLoadingSaved(true);
    try {
      const { data, error } = await supabase
        .from('post_bookmarks')
        .select(`
          post_id,
          posts (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const extractedPosts = data
        .filter(item => item.posts != null)
        .map(item => item.posts as unknown as Post);
        
      setSavedPosts(extractedPosts);
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    } finally {
      setLoadingSaved(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserPosts();
    fetchSavedPosts();
  }, [fetchUserPosts, fetchSavedPosts]);

  useFocusEffect(
    useCallback(() => {
      fetchUserPosts();
      fetchSavedPosts();
    }, [fetchUserPosts, fetchSavedPosts])
  );

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchUserPosts(true);
    fetchSavedPosts();
  }, [fetchUserPosts, fetchSavedPosts]);

  const avatarUri = profile?.avatar_url || user?.user_metadata?.avatar_url || null;
  const isOnline = true;

  const formattedLocation = useMemo(() => {
    if (!profile?.location) return null;
    const loc = profile.location;
    const parts = [loc.city || loc.ward, loc.lga, loc.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }, [profile?.location]);

  const handleManageStore = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        router.push(`/businesses/${data[0].id}` as any);
      } else {
        router.push('/businesses/create' as any);
      }
    } catch (e) {
      router.push('/businesses/create' as any);
    }
  }, [user, router]);

  const listHeader = useMemo(() => (
    <View style={styles.headerContainer}>
      
      {/* ── Top Header Navigation Bar ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 }}>
        <View style={{ width: 38 }} />
        <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 16, color: '#FFFFFF' }}>Profile</Text>
        <TouchableOpacity 
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#111111', borderWidth: 1, borderColor: GLASS_BORDER, justifyContent: 'center', alignItems: 'center' }}
          onPress={() => router.push('/settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={18} color={MUTED} />
        </TouchableOpacity>
      </View>

      {/* ── Identity Block (No cover) ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
          <View style={{ position: 'relative' }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, padding: 3, borderWidth: 2, borderColor: G, justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: '100%', height: '100%', borderRadius: 40, overflow: 'hidden', backgroundColor: DARK }}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: SURFACE }}>
                    <Text style={{ fontFamily: 'Outfit-ExtraBold', fontSize: 24, color: G }}>
                      {profile?.name ? profile.name.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => router.push('/profile/edit')}
              style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: G, borderWidth: 2, borderColor: DARK, justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="camera-outline" size={12} color={DARK} />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, paddingTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Text style={{ fontFamily: 'Outfit-ExtraBold', fontSize: 20, color: '#FFFFFF' }} numberOfLines={1}>
                {profile?.name || user?.user_metadata?.name || 'Anonymous'}
              </Text>
              {profile?.phone_verified && (
                <MaterialIcons name="verified" size={18} color={G} />
              )}
            </View>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 13, color: LABEL, marginBottom: 6 }}>
              @{(profile as any)?.handle || (profile as any)?.username || user?.email?.split('@')[0] || 'user'}
            </Text>
            {formattedLocation && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="location-outline" size={13} color={MUTED} />
                <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: MUTED }}>{formattedLocation}</Text>
              </View>
            )}
          </View>
        </View>

        {!!profile?.bio && (
          <Text style={{ fontFamily: 'Inter-Regular', fontSize: 14, color: 'rgba(255,255,255,0.68)', lineHeight: 22, marginBottom: 16 }}>
            {profile.bio}
          </Text>
        )}

        <TouchableOpacity 
          style={{ height: 36, paddingHorizontal: 20, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: GLASS_BORDER, justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start' }} 
          onPress={() => router.push('/profile/edit')}
          activeOpacity={0.8}
        >
          <Text style={{ color: MUTED, fontSize: 13, fontFamily: 'Inter-Medium' }}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats Bar ── */}
      <View style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: GLASS_BORDER, paddingVertical: 16 }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Outfit-ExtraBold', fontSize: 22, color: '#FFFFFF' }}>{posts.length}</Text>
          <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL, marginTop: 2 }}>Posts</Text>
        </View>
        <View style={{ width: 1, height: '100%', backgroundColor: GLASS_BORDER }} />
        <TouchableOpacity 
          style={{ flex: 1, alignItems: 'center' }}
          onPress={() => router.push(`/network/${user?.id}?mode=followers` as any)}
        >
          <Text style={{ fontFamily: 'Outfit-ExtraBold', fontSize: 22, color: '#FFFFFF' }}>{followersCount}</Text>
          <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL, marginTop: 2 }}>Followers</Text>
        </TouchableOpacity>
        <View style={{ width: 1, height: '100%', backgroundColor: GLASS_BORDER }} />
        <TouchableOpacity 
          style={{ flex: 1, alignItems: 'center' }}
          onPress={() => router.push(`/network/${user?.id}?mode=following` as any)}
        >
          <Text style={{ fontFamily: 'Outfit-ExtraBold', fontSize: 22, color: '#FFFFFF' }}>{followingCount}</Text>
          <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL, marginTop: 2 }}>Following</Text>
        </TouchableOpacity>
      </View>

      {/* ── Quick Access 2x2 Grid ── */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 11, color: LABEL, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Quick Access</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <PressableCard style={{ width: '48%', backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 16, padding: 14 }} onPress={() => router.push('/community')}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: G + '15', borderWidth: 1, borderColor: G + '25', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="people-outline" size={18} color={G} />
            </View>
            <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 14, color: TEXT_PRIMARY, marginBottom: 2 }}>Community</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 11, color: LABEL }}>Connections & people</Text>
          </PressableCard>

          <PressableCard style={{ width: '48%', backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 16, padding: 14 }} onPress={() => router.push('/tickets')}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: G + '15', borderWidth: 1, borderColor: G + '25', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <MaterialCommunityIcons name="ticket-outline" size={18} color={G} />
            </View>
            <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 14, color: TEXT_PRIMARY, marginBottom: 2 }}>Tickets</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 11, color: G }}>2 upcoming</Text>
          </PressableCard>

          <PressableCard style={{ width: '48%', backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 16, padding: 14 }} onPress={() => router.push('/my-events' as any)}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: G + '15', borderWidth: 1, borderColor: G + '25', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="calendar-outline" size={18} color={G} />
            </View>
            <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 14, color: TEXT_PRIMARY, marginBottom: 2 }}>My Events</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 11, color: LABEL }}>Events you run</Text>
          </PressableCard>

          <PressableCard style={{ width: '48%', backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 16, padding: 14 }} onPress={handleManageStore}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: G + '15', borderWidth: 1, borderColor: G + '25', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="storefront-outline" size={18} color={G} />
            </View>
            <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 14, color: TEXT_PRIMARY, marginBottom: 2 }}>My Business</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 11, color: LABEL }}>Business presence</Text>
          </PressableCard>
        </View>
      </View>

    </View>
  ), [avatarUri, profile, user, posts.length, followersCount, followingCount, isOnline, formattedLocation, styles, colors, handleManageStore, router]);

  const activeData = activeTab === 'posts' ? posts : savedPosts;
  const isLoading = activeTab === 'posts' ? loadingPosts : loadingSaved;

  return (
    <View style={{ flex: 1, backgroundColor: DARK, paddingTop: insets.top }}>
      <FlatList
        key={numColumns}
        data={activeData}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        ListHeaderComponent={
          <>
            {listHeader}
            {/* Sticky Tabs Header */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'posts' && styles.activeTab]} 
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab('posts');
                }}
              >
                <Feather name="grid" size={18} color={activeTab === 'posts' ? '#82DB7E' : '#A1A1AA'} />
                <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>Posts</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'saved' && styles.activeTab]} 
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab('saved');
                }}
              >
                <Feather name="bookmark" size={18} color={activeTab === 'saved' ? '#82DB7E' : '#A1A1AA'} />
                <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>Saved</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <Animated.View layout={Layout.springify()} entering={FadeIn} exiting={FadeOut}>
            <ProfilePostGridItem 
              post={item} 
              width={GRID_ITEM_WIDTH}
              onPress={() => {
                if (item.category === 'For Sale') {
                  router.push(`/marketplace/${item.id}`);
                } else if (item.category === 'Event' && item.event_link) {
                  const cleanLink = item.event_link.split('?')[0];
                  const parts = cleanLink.split('/');
                  const eventId = parts.pop() || parts.pop();
                  if (eventId) {
                    router.push(`/events/${eventId}`);
                  } else {
                    router.push(`/posts/${item.id}`);
                  }
                } else {
                  router.push(`/posts/${item.id}`);
                }
              }}
            />
          </Animated.View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#82DB7E" />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading && !refreshing ? (
            <View style={{flexDirection: 'row', padding: 8}}>
              <PostSkeleton />
            </View>
          ) : (
            <Animated.View entering={FadeIn} style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={56} color="#333" style={{marginBottom: 16}} />
              <Text style={styles.emptyHeadline}>No posts yet</Text>
              <Text style={styles.emptySub}>Share something with your neighborhood.</Text>
              <TouchableOpacity 
                style={styles.createBtn}
                onPress={() => router.push('/create')}
              >
                <Text style={styles.createBtnText}>Create Post</Text>
              </TouchableOpacity>
            </Animated.View>
          )
        }
      />
    </View>
  );
}

const dynamicStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK,
  },
  listContent: { 
    paddingBottom: 100 
  },
  headerContainer: { 
    paddingHorizontal: 16, 
    paddingBottom: 8 
  },
  
  // ── Header Navigation Bar ──
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginBottom: 8,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navSpacer: { 
    width: 40 
  },
  navTitle: { 
    flex: 1,
    color: TEXT_PRIMARY, 
    fontSize: 20, 
    fontFamily: 'Outfit-ExtraBold',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  settingsBtn: {
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: GLASS_BORDER,
    backgroundColor: '#111111',
    alignItems: 'center', 
    justifyContent: 'center'
  },

  // ── Hero Floating Profile Card ──
  heroCard: {
    backgroundColor: '#0f0f0f',
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row', 
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 18,
  },
  avatarWrapper: { 
    position: 'relative' 
  },
  avatarRingBorder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: '#82DB7E',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: { 
    width: 74, 
    height: 74, 
    borderRadius: 37 
  },
  avatarPlaceholder: {
    width: 74, 
    height: 74, 
    borderRadius: 37, 
    alignItems: 'center', 
    justifyContent: 'center'
  },
  avatarText: { 
    fontSize: 28, 
    fontFamily: 'Outfit-ExtraBold' 
  },
  onlineBadgeDot: {
    position: 'absolute', 
    bottom: 2, 
    right: 2, 
    width: 18, 
    height: 18,
    borderRadius: 9, 
    backgroundColor: '#82DB7E', 
    borderWidth: 3, 
    borderColor: '#0f0f0f'
  },

  heroInfoCol: {
    flex: 1,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: G,
    marginBottom: 12,
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: SURFACE,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: G,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: TEXT_PRIMARY,
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 20,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  handle: {
    color: LABEL,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    marginBottom: 4,
  },
  bio: {
    color: MUTED,
    fontFamily: 'Inter',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
    marginTop: 6,
  },
  memberSinceText: {
    color: LABEL,
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },

  editProfileBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginTop: 14,
  },
  editProfileText: {
    color: TEXT_PRIMARY,
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
  },

  // ── Stats Row ──
  statsRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-around',
    paddingVertical: 14, 
    borderTopWidth: 1, 
    borderBottomWidth: 1,
    borderColor: GLASS_BORDER,
    marginBottom: 16,
  },
  statItem: { 
    alignItems: 'center', 
    flex: 1 
  },
  statValue: { 
    color: TEXT_PRIMARY,
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 20, 
    letterSpacing: -0.3,
  },
  statLabel: { 
    color: LABEL,
    fontFamily: 'Inter-Medium',
    fontSize: 12, 
    marginTop: 2 
  },
  statDivider: { 
    width: 1, 
    height: 28, 
    backgroundColor: GLASS_BORDER 
  },

  // ── Bio & Location ──
  bioText: { 
    color: TEXT_PRIMARY, 
    fontFamily: 'Inter-Regular',
    fontSize: 14, 
    lineHeight: 20, 
    marginBottom: 12 
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  locationText: {
    color: MUTED,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
  },

  // ── Quick Action Cards ──
  quickActionsRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    gap: 8, 
    marginBottom: 20
  },
  actionCard: {
    flex: 1, 
    backgroundColor: SURFACE, 
    borderRadius: 20, 
    padding: 14,
    borderWidth: 1, 
    borderColor: GLASS_BORDER,
    justifyContent: 'space-between',
    minHeight: 88,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionIconWrapper: {
    width: 34, 
    height: 34, 
    borderRadius: 17, 
    backgroundColor: 'rgba(130, 219, 126, 0.12)',
    alignItems: 'center', 
    justifyContent: 'center',
  },
  actionTitle: { 
    color: TEXT_PRIMARY, 
    fontFamily: 'Outfit-Bold',
    fontSize: 13, 
    marginBottom: 2 
  },
  actionSub: { 
    color: MUTED, 
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },

  // ── Tabs ──
  tabsContainer: {
    flexDirection: 'row', 
    backgroundColor: DARK,
    paddingHorizontal: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: GLASS_BORDER,
    marginBottom: 8
  },
  tab: {
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8,
    paddingVertical: 14, 
    borderBottomWidth: 2, 
    borderBottomColor: 'transparent'
  },
  activeTab: { 
    borderBottomColor: '#82DB7E' 
  },
  tabText: { 
    color: LABEL,
    fontFamily: 'Inter-SemiBold',
    fontSize: 15, 
  },
  activeTabText: { 
    color: TEXT_PRIMARY 
  },

  // ── Empty State ──
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 60, 
    paddingHorizontal: 20 
  },
  emptyHeadline: { 
    color: TEXT_PRIMARY, 
    fontFamily: 'Outfit-Bold',
    fontSize: 18, 
    marginBottom: 6 
  },
  emptySub: { 
    color: MUTED, 
    fontFamily: 'Inter',
    fontSize: 14, 
    textAlign: 'center', 
    marginBottom: 20 
  },
  createBtn: {
    backgroundColor: '#82DB7E', 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 24
  },
  createBtnText: { 
    color: '#000', 
    fontFamily: 'Outfit-Bold',
    fontSize: 15, 
  }
});
