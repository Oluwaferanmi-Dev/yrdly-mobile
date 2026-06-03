import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Users, Settings, Ticket } from 'lucide-react-native';
import { useAuth } from '../../hooks/use-supabase-auth';
import { supabase } from '../../lib/supabase';
import { PostCard } from '../../components/PostCard';
import { Post } from '../../types';
import { useRouter } from 'expo-router';
import { theme } from '../../theme';

export default function ProfileTab() {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setLoadingPosts(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserPosts();
  }, [fetchUserPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserPosts();
  }, [fetchUserPosts]);

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
            <Image 
              source={{ uri: profile?.avatar_url || user?.user_metadata?.avatar_url }} 
              style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          )}
        </View>
        <Text style={styles.name}>{profile?.full_name || user?.user_metadata?.name || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.communityButton} 
            onPress={() => router.push('/community')}
          >
            <Users size={20} color={theme.colors.background} />
            <Text style={styles.communityButtonText}>Community</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingsButton} 
            onPress={() => router.push('/settings')}
          >
            <Settings size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.ticketsButton} 
            onPress={() => router.push('/tickets')}
          >
            <Ticket size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>My Posts</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard 
            post={item} 
            onPress={() => router.push(`/posts/${item.id}`)} />
        )}
        ListHeaderComponent={ListHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loadingPosts ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You haven't posted anything yet.</Text>
            </View>
          ) : (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
          )
        }
        ListFooterComponent={
          <View style={styles.footerContainer}>
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={() => signOut()}
              disabled={authLoading}
            >
              {authLoading ? (
                <ActivityIndicator color="#ef4444" />
              ) : (
                <Text style={styles.logoutText}>Sign Out</Text>
              )}
            </TouchableOpacity>
          </View>
        } />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingBottom: 40 },
  headerContainer: { backgroundColor: theme.colors.card, paddingBottom: 16 },
  header: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 20 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.surfaceDim,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden',
    borderWidth: 2, borderColor: theme.colors.primary
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 36, fontFamily: theme.typography.fonts.heading, color: theme.colors.primary },
  name: { fontSize: theme.typography.sizes.xl, fontFamily: theme.typography.fonts.heading, color: theme.colors.textPrimary, marginBottom: 4 },
  email: { fontSize: theme.typography.sizes.base, fontFamily: theme.typography.fonts.body, color: theme.colors.textSecondary, marginBottom: 20 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 12 },
  communityButton: {
    flex: 1, flexDirection: 'row', height: 44, backgroundColor: theme.colors.primary, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', maxWidth: 200,
  },
  communityButtonText: { color: theme.colors.background, fontSize: theme.typography.sizes.base, fontFamily: theme.typography.fonts.heading, marginLeft: 8 },
  settingsButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceDim,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border
  },
  ticketsButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceDim,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border
  },
  divider: { height: 8, backgroundColor: theme.colors.background, width: '100%', marginTop: 24 },
  sectionTitle: { fontSize: theme.typography.sizes.lg, fontFamily: theme.typography.fonts.heading, color: theme.colors.textPrimary, paddingHorizontal: 16, paddingTop: 16 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: theme.colors.textSecondary, fontSize: theme.typography.sizes.base, fontFamily: theme.typography.fonts.body },
  footerContainer: { padding: 24, marginTop: 20 },
  logoutButton: {
    height: 54, borderWidth: 1, borderColor: theme.colors.error, backgroundColor: 'transparent',
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  logoutText: { color: theme.colors.error, fontSize: theme.typography.sizes.base, fontFamily: theme.typography.fonts.heading },
});
