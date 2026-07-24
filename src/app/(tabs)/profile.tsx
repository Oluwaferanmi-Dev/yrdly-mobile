import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/use-supabase-auth';
import { supabase } from '../../lib/supabase';
import { PostSkeleton } from '../../components/Skeleton';
import { Post } from '../../types';
import { useRouter, useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { useAppTheme } from '../../context/ThemeContext';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfilePostGridItem } from '../../components/ProfilePostGridItem';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const router = useRouter();
  const { colors } = useAppTheme();
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
  const isOnline = true; // Hardcoded to true for authenticated user's own profile

  const listHeader = useMemo(() => (
    <View style={styles.headerContainer}>
      
      {/* Top Navigation */}
      <View style={styles.navHeader}>
        <View style={styles.navSpacer} />
        <Text style={styles.navTitle}>Profile</Text>
        <TouchableOpacity 
          style={styles.settingsBtn}
          onPress={() => router.push('/settings')}
        >
          <Feather name="settings" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Hero Profile Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.avatarWrapper}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {profile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            {isOnline && <View style={styles.onlineIndicator} />}
          </View>
          
          <TouchableOpacity 
            style={styles.editProfileBtn}
            onPress={() => router.push('/settings')}
          >
            <Feather name="edit-2" size={14} color="#FFF" />
            <Text style={styles.editProfileText}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.name}>{profile?.name || user?.user_metadata?.name || 'No Name'}</Text>
          {profile?.verified_seller && (
            <Ionicons name="checkmark-circle" size={18} color="#82DB7E" style={{ marginLeft: 4 }} />
          )}
        </View>
        <Text style={styles.username}>@{profile?.username || user?.user_metadata?.username || 'user'}</Text>

        {/* Stats Row within Card */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity 
            style={styles.statItem} 
            onPress={() => router.push(`/network/${user?.id}?mode=followers` as any)}
          >
            <Text style={styles.statValue}>{followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => router.push(`/network/${user?.id}?mode=following` as any)}
          >
            <Text style={styles.statValue}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {profile?.bio && (
          <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>
        )}
        
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color="#82DB7E" />
          <Text style={styles.locationText}>Lagos, Nigeria</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/community')}>
          <View style={styles.actionIconWrapper}>
            <Feather name="users" size={20} color="#82DB7E" />
          </View>
          <View>
            <Text style={styles.actionTitle}>Community</Text>
            <Text style={styles.actionSub}>Connections</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/tickets')}>
          <View style={styles.actionIconWrapper}>
            <MaterialCommunityIcons name="ticket-outline" size={20} color="#82DB7E" />
          </View>
          <View>
            <Text style={styles.actionTitle}>Tickets</Text>
            <Text style={styles.actionSub}>Your RSVPs</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/my-events' as any)}>
          <View style={styles.actionIconWrapper}>
            <Ionicons name="calendar-outline" size={20} color="#82DB7E" />
          </View>
          <View>
            <Text style={styles.actionTitle}>My Events</Text>
            <Text style={styles.actionSub}>Created</Text>
          </View>
        </TouchableOpacity>
      </View>

    </View>
  ), [avatarUri, profile, user, posts.length, followersCount, followingCount, isOnline]);

  const activeData = activeTab === 'posts' ? posts : savedPosts;
  const isLoading = activeTab === 'posts' ? loadingPosts : loadingSaved;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
              <Ionicons name="images-outline" size={64} color="#333" style={{marginBottom: 16}} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  listContent: { paddingBottom: 100 },
  headerContainer: { paddingHorizontal: 16, paddingBottom: 16 },
  
  navHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, marginBottom: 8
  },
  navSpacer: { width: 40 },
  navTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center'
  },

  heroCard: {
    backgroundColor: '#161616',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 20
  },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 16
  },
  avatarWrapper: { position: 'relative' },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(130, 219, 126, 0.1)',
    alignItems: 'center', justifyContent: 'center'
  },
  avatarText: { color: '#82DB7E', fontSize: 28, fontWeight: 'bold' },
  onlineIndicator: {
    position: 'absolute', bottom: 2, right: 2, width: 16, height: 16,
    borderRadius: 8, backgroundColor: '#82DB7E', borderWidth: 3, borderColor: '#161616'
  },
  editProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)'
  },
  editProfileText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  name: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  username: { color: '#A1A1AA', fontSize: 15, marginBottom: 16 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    marginBottom: 16, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#A1A1AA', fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.06)' },

  bio: { color: '#FFF', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { color: '#A1A1AA', fontSize: 14 },

  quickActions: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 24
  },
  actionCard: {
    flex: 1, backgroundColor: '#161616', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
  },
  actionIconWrapper: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(130, 219, 126, 0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8
  },
  actionTitle: { color: '#FFF', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  actionSub: { color: '#A1A1AA', fontSize: 11 },

  tabsContainer: {
    flexDirection: 'row', backgroundColor: '#050505',
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderBottomWidth: 2, borderBottomColor: 'transparent'
  },
  activeTab: { borderBottomColor: '#82DB7E' },
  tabText: { color: '#A1A1AA', fontSize: 15, fontWeight: '600' },
  activeTabText: { color: '#FFF' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyHeadline: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySub: { color: '#A1A1AA', fontSize: 15, textAlign: 'center', marginBottom: 24 },
  createBtn: {
    backgroundColor: '#82DB7E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24
  },
  createBtnText: { color: '#050505', fontSize: 16, fontWeight: 'bold' }
});
