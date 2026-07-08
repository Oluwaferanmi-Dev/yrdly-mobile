import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/use-supabase-auth';
import { supabase } from '../../lib/supabase';
import { PostCard } from '../../components/PostCard';
import { PostSkeleton } from '../../components/Skeleton';
import { Post } from '../../types';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppTheme } from '../../context/ThemeContext';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfilePostGridItem } from '../../components/ProfilePostGridItem';
import { ScreenHeader } from '../../components/ScreenHeader';

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const GRID_ITEM_WIDTH = windowWidth / 3;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const fetchUserPosts = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setPosts(data as Post[]);

      // Fetch dynamic follower/following counts
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

  useEffect(() => {
    fetchUserPosts();
  }, [fetchUserPosts]);

  useFocusEffect(
    useCallback(() => {
      fetchUserPosts();
    }, [fetchUserPosts])
  );

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchUserPosts();
  }, [fetchUserPosts]);

  const avatarUri = profile?.avatar_url || user?.user_metadata?.avatar_url || null;

  const listHeader = useMemo(() => (
    <View style={[styles.headerContainer, { backgroundColor: colors.card, paddingTop: 10 }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
        >
          <Feather name="settings" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.avatarPlaceholder}>
          {avatarUri ? (
            <Image 
              source={{ uri: avatarUri }} 
              style={styles.avatarImage}
              cachePolicy="memory-disk"
              transition={0}
            />
          ) : (
            <Text style={[styles.avatarText, { color: colors.tint }]}>
              {profile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          )}
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{profile?.name || user?.user_metadata?.name || 'No Name'}</Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
        
        {profile?.bio ? (
          <Text style={[styles.bio, { color: colors.text }]}>{profile.bio}</Text>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{posts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{followersCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{followingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Following</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.communityButton, { backgroundColor: colors.tint }]} 
            onPress={() => router.push('/community')}
          >
            <Feather name="users" size={20} color="#FFFFFF" />
            <Text style={styles.communityButtonText}>Community</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.ticketsButton} 
            onPress={() => router.push('/tickets')}
          >
            <Ionicons name="ticket-outline" size={24} color={colors.tint} />
          </TouchableOpacity>
          
          {(profile?.role === 'admin' || profile?.is_admin) && (
            <TouchableOpacity 
              style={[styles.ticketsButton, { backgroundColor: '#fee2e2' }]} 
              onPress={() => router.push('/(admin)/create-alert')}
            >
              <Ionicons name="shield-half-outline" size={24} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
    </View>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [avatarUri, profile?.name, profile?.bio, profile?.role, profile?.is_admin, user?.email, posts.length, followersCount, followingCount, colors, insets.top]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Profile" />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <ProfilePostGridItem 
            post={item} 
            width={GRID_ITEM_WIDTH}
            onPress={() => router.push(`/posts/${item.id}`)}
          />
        )}
        ListHeaderComponent={() => listHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loadingPosts && !refreshing ? (
            <View>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>You haven't posted anything yet.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingBottom: 40 },
  headerContainer: { paddingBottom: 16 },
  header: { alignItems: 'center', paddingHorizontal: 20, position: 'relative' },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden'
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 36, fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  email: { fontSize: 16, marginBottom: 12 },
  bio: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 16, paddingHorizontal: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 32, marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 12 },
  communityButton: {
    paddingHorizontal: 24, flexDirection: 'row', height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  communityButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  settingsButton: { 
    position: 'absolute',
    top: 0,
    right: 20,
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center',
    zIndex: 10
  },
  ticketsButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F5E9' },
  divider: { height: 8, width: '100%', marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', paddingHorizontal: 16, paddingTop: 16 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16 },
});
