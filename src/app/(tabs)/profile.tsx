import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/use-supabase-auth';
import { supabase } from '../../lib/supabase';
import { PostCard } from '../../components/PostCard';
import { PostSkeleton } from '../../components/Skeleton';
import { Post } from '../../types';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../context/ThemeContext';

export default function ProfileTab() {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const { colors } = useAppTheme();

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchUserPosts();
  }, [fetchUserPosts]);

  const ListHeader = () => (
    <View style={[styles.headerContainer, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
            <Image 
              source={{ uri: profile?.avatar_url || user?.user_metadata?.avatar_url }} 
              style={styles.avatarImage} 
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

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.communityButton, { backgroundColor: colors.tint }]} 
            onPress={() => router.push('/community')}
          >
            <Feather name="users" size={20} color="#FFFFFF" />
            <Text style={styles.communityButtonText}>Community</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingsButton, { backgroundColor: colors.borderLight }]} 
            onPress={() => router.push('/settings')}
          >
            <Feather name="settings" size={20} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.ticketsButton} 
            onPress={() => router.push('/tickets')}
          >
            <Feather name="tag" size={20} color={colors.tint} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>My Posts</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard 
            post={item} 
            onPress={() => router.push(`/posts/${item.id}`)}
            onComment={() => router.push(`/posts/${item.id}`)}
          />
        )}
        ListHeaderComponent={ListHeader}
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
        ListFooterComponent={
          <View style={styles.footerContainer}>
            <TouchableOpacity 
              style={[styles.logoutButton, { backgroundColor: colors.card }]} 
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
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingBottom: 40 },
  headerContainer: { paddingBottom: 16 },
  header: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 20 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden'
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 36, fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  email: { fontSize: 16, marginBottom: 12 },
  bio: { fontSize: 14, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20, lineHeight: 20 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 12 },
  communityButton: {
    flex: 1, flexDirection: 'row', height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', maxWidth: 160,
  },
  communityButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  settingsButton: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  ticketsButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  divider: { height: 8, width: '100%', marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', paddingHorizontal: 16, paddingTop: 16 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16 },
  footerContainer: { padding: 24, marginTop: 20 },
  logoutButton: {
    height: 54, borderWidth: 1, borderColor: '#E53935',
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  logoutText: { color: '#E53935', fontSize: 16, fontWeight: 'bold' },
});
