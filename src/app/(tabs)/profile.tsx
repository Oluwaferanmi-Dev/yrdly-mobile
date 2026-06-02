import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/use-supabase-auth';
import { supabase } from '../../lib/supabase';
import { PostCard } from '../../components/PostCard';
import { Post } from '../../types';
import { useRouter } from 'expo-router';

const GREEN = '#388E3C';

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
              style={styles.avatarImage} 
            />
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
            <Ionicons name="people" size={20} color="#FFFFFF" />
            <Text style={styles.communityButtonText}>Community</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingsButton} 
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={20} color="#1C1C1C" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.ticketsButton} 
            onPress={() => router.push('/tickets')}
          >
            <Ionicons name="ticket-outline" size={20} color={GREEN} />
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
            onPress={() => router.push(`/posts/${item.id}`)}
          />
        )}
        ListHeaderComponent={ListHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loadingPosts ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You haven't posted anything yet.</Text>
            </View>
          ) : (
            <ActivityIndicator size="large" color={GREEN} style={{ marginTop: 40 }} />
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
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F2' },
  listContent: { paddingBottom: 40 },
  headerContainer: { backgroundColor: '#FFFFFF', paddingBottom: 16 },
  header: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 20 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden'
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: GREEN },
  name: { fontSize: 24, fontWeight: 'bold', color: '#1C1C1C', marginBottom: 4 },
  email: { fontSize: 16, color: '#616161', marginBottom: 20 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 12 },
  communityButton: {
    flex: 1, flexDirection: 'row', height: 44, backgroundColor: GREEN, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', maxWidth: 200,
  },
  communityButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  settingsButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2F2F2',
    justifyContent: 'center', alignItems: 'center',
  },
  ticketsButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  divider: { height: 8, backgroundColor: '#F2F2F2', width: '100%', marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1C', paddingHorizontal: 16, paddingTop: 16 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#616161', fontSize: 16 },
  footerContainer: { padding: 24, marginTop: 20 },
  logoutButton: {
    height: 54, borderWidth: 1, borderColor: '#E53935', backgroundColor: '#FFFFFF',
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  logoutText: { color: '#E53935', fontSize: 16, fontWeight: 'bold' },
});
