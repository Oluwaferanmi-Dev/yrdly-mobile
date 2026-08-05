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
      <View style={styles.navHeader}>
        {router.canGoBack() ? (
          <TouchableOpacity 
            style={styles.headerBackBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.navSpacer} />
        )}

        <Text style={styles.navTitle}>Profile</Text>

        <TouchableOpacity 
          style={styles.settingsBtn}
          onPress={() => router.push('/settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* ── Hero Profile Floating Card ── */}
      <PressableCard style={styles.heroCard} activeOpacity={0.98}>
        {/* Top Info Row: Avatar + Name & Username + Edit Profile Button */}
        <View style={styles.heroTopRow}>
          <TouchableOpacity 
            style={styles.avatarWrapper}
            onPress={() => router.push('/profile/edit')}
            activeOpacity={0.9}
          >
            <View style={styles.avatarRingBorder}>
              {avatarUri ? (
                <Image 
                  source={{ uri: avatarUri }} 
                  style={styles.avatarImage} 
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.tint + '1F' }]}>
                  <Text style={[styles.avatarText, { color: colors.tint }]}>
                    {profile?.name ? profile.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
            </View>
            {isOnline && <View style={styles.onlineBadgeDot} />}
          </TouchableOpacity>

          <View style={styles.heroInfoCol}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>
                {profile?.name || user?.user_metadata?.name || 'Anonymous'}
              </Text>
              {(profile as any)?.verified_seller && (
                <MaterialIcons name="verified" size={18} color="#82DB7E" style={{ marginLeft: 4 }} />
              )}
            </View>

            <Text style={styles.handleText}>
              @{(profile as any)?.handle || (profile as any)?.username || user?.email?.split('@')[0] || 'user'}
            </Text>

            {(profile as any)?.role_tag ? (
              <View style={styles.roleTagPill}>
                <Text style={styles.roleTagText}>{(profile as any).role_tag}</Text>
              </View>
            ) : (profile as any)?.verified_seller ? (
              <View style={styles.roleTagPill}>
                <Text style={styles.roleTagText}>Verified Seller</Text>
              </View>
            ) : null}
          </View>


        </View>

        {/* Stats Row: Posts | Followers | Following */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity 
            style={styles.statItem} 
            onPress={() => router.push(`/network/${user?.id}?mode=followers` as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.statValue}>{followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => router.push(`/network/${user?.id}?mode=following` as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.statValue}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* Bio */}
        {profile?.bio ? (
          <Text style={styles.bioText}>{profile.bio}</Text>
        ) : null}

        {/* Location */}
        {formattedLocation ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={15} color="#82DB7E" />
            <Text style={styles.locationText}>{formattedLocation}</Text>
          </View>
        ) : null}

        {/* Instagram-style Edit Profile row */}
        <TouchableOpacity 
          style={styles.editProfileBtn} 
          onPress={() => router.push('/profile/edit')}
          activeOpacity={0.8}
        >
          <Text style={styles.editProfileText}>Edit profile</Text>
        </TouchableOpacity>
      </PressableCard>

      {/* ── Quick Access 2x2 Grid ── */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: LABEL, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Quick Access</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <PressableCard style={{ width: '48%', backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 16, padding: 14 }} onPress={() => router.push('/community')}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: G + '15', borderWidth: 1, borderColor: G + '25', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="people-outline" size={18} color={G} />
            </View>
            <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 14, color: TEXT_PRIMARY, marginBottom: 2 }}>Community</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 11, color: LABEL }}>Connections & people</Text>
          </PressableCard>

          <PressableCard style={{ width: '48%', backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 16, padding: 14 }} onPress={() => router.push('/tickets')}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: G + '15', borderWidth: 1, borderColor: G + '25', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <MaterialCommunityIcons name="ticket-outline" size={18} color={G} />
            </View>
            <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 14, color: TEXT_PRIMARY, marginBottom: 2 }}>Tickets</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 11, color: G }}>2 upcoming</Text>
          </PressableCard>

          <PressableCard style={{ width: '48%', backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 16, padding: 14 }} onPress={() => router.push('/my-events' as any)}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: G + '15', borderWidth: 1, borderColor: G + '25', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="calendar-outline" size={18} color={G} />
            </View>
            <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 14, color: TEXT_PRIMARY, marginBottom: 2 }}>My Events</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 11, color: LABEL }}>Events you run</Text>
          </PressableCard>

          <PressableCard style={{ width: '48%', backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 16, padding: 14 }} onPress={handleManageStore}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: G + '15', borderWidth: 1, borderColor: G + '25', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="storefront-outline" size={18} color={G} />
            </View>
            <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 14, color: TEXT_PRIMARY, marginBottom: 2 }}>My Business</Text>
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
    color: colors.text, 
    fontSize: 20, 
    fontWeight: '800',
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
    fontWeight: '800' 
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
    justifyContent: 'center',
    paddingTop: 2,
  },
  nameRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 2 
  },
  displayName: { 
    color: TEXT_PRIMARY,
    fontFamily: 'Outfit',
    fontSize: 22, 
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  handleText: { 
    color: MUTED,
    fontFamily: 'Inter',
    fontSize: 14, 
    fontWeight: '500',
    marginBottom: 6,
  },
  roleTagPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(130, 219, 126, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(130, 219, 126, 0.3)',
  },
  roleTagText: {
    color: '#82DB7E',
    fontSize: 12,
    fontWeight: '600',
  },

  editProfileBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginTop: 14,
  },
  editProfileText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
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
    fontFamily: 'Outfit',
    fontSize: 20, 
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statLabel: { 
    color: LABEL,
    fontFamily: 'Inter',
    fontSize: 12, 
    fontWeight: '500',
    marginTop: 2 
  },
  statDivider: { 
    width: 1, 
    height: 28, 
    backgroundColor: GLASS_BORDER 
  },

  // ── Bio & Location ──
  bioText: { 
    color: colors.text, 
    fontSize: 14, 
    lineHeight: 20, 
    fontWeight: '400',
    marginBottom: 12 
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  locationText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
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
    backgroundColor: colors.card, 
    borderRadius: 20, 
    padding: 14,
    borderWidth: 1, 
    borderColor: colors.borderLight,
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
    color: colors.text, 
    fontSize: 13, 
    fontWeight: '700',
    marginBottom: 2 
  },
  actionSub: { 
    color: colors.textSecondary, 
    fontSize: 11,
    fontWeight: '400',
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
    fontFamily: 'Inter',
    fontSize: 15, 
    fontWeight: '600' 
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
    color: colors.text, 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 6 
  },
  emptySub: { 
    color: colors.textSecondary, 
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
    fontSize: 15, 
    fontWeight: '700' 
  }
});
