import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, SafeAreaView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { PostCard } from '../../components/PostCard';
import { Post } from '../../types';

const GREEN = '#388E3C';

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friends'>('none');
  const [loadingAction, setLoadingAction] = useState(false);

  const fetchProfileAndPosts = useCallback(async () => {
    if (!id) return;
    try {
      // Fetch User
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      if (!userError && userData) setProfile(userData);

      // Fetch Posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', id)
        .order('timestamp', { ascending: false });
      if (postsData) setPosts(postsData as Post[]);

      // Check Friend Status
      if (currentUser && currentUser.id !== id) {
        // Query friend_requests table
        const { data: reqData } = await supabase
          .from('friend_requests')
          .select('*')
          .or(`and(from_user_id.eq.${currentUser.id},to_user_id.eq.${id}),and(from_user_id.eq.${id},to_user_id.eq.${currentUser.id})`)
          .single();
        
        if (reqData) {
          if (reqData.status === 'accepted') setFriendStatus('friends');
          else setFriendStatus('pending');
        }
      }

    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [id, currentUser]);

  useEffect(() => {
    fetchProfileAndPosts();
  }, [fetchProfileAndPosts]);

  const handleFriendAction = async () => {
    if (!currentUser || !id || loadingAction) return;
    setLoadingAction(true);
    try {
      if (friendStatus === 'none') {
        await supabase.from('friend_requests').insert({
          from_user_id: currentUser.id,
          to_user_id: id,
          status: 'pending'
        });
        setFriendStatus('pending');
      } else if (friendStatus === 'pending' || friendStatus === 'friends') {
        // Cancel/Remove
        await supabase.from('friend_requests').delete()
          .or(`and(from_user_id.eq.${currentUser.id},to_user_id.eq.${id}),and(from_user_id.eq.${id},to_user_id.eq.${currentUser.id})`);
        setFriendStatus('none');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleMessage = async () => {
    if (!currentUser || !id) return;
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${id}),and(user1_id.eq.${id},user2_id.eq.${currentUser.id})`)
        .is('post_id', null)
        .limit(1);

      if (existing && existing.length > 0) {
        router.push({ pathname: '/chat/[id]', params: { id: existing[0].id, type: 'social' } });
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            user1_id: currentUser.id,
            user2_id: id,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (newConv) {
          router.push({ pathname: '/chat/[id]', params: { id: newConv.id, type: 'social' } });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={GREEN} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity style={styles.backBtnWrapper} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isSelf = currentUser?.id === id;

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          )}
        </View>
        <Text style={styles.name}>{profile.name || 'Anonymous'}</Text>
        {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        {!isSelf && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.friendButton, friendStatus !== 'none' && styles.friendButtonActive]} 
              onPress={handleFriendAction}
              disabled={loadingAction}
            >
              <Text style={[styles.friendButtonText, friendStatus !== 'none' && styles.friendButtonTextActive]}>
                {friendStatus === 'none' ? 'Add Friend' : friendStatus === 'pending' ? 'Requested' : 'Friends'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
              <Ionicons name="chatbubble-outline" size={20} color={GREEN} />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Posts</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.navHeaderTitle}>{profile.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} onPress={() => router.push(`/posts/${item.id}`)} />
        )}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>This user hasn't posted anything yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F2' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F2' },
  errorText: { fontSize: 18, color: '#1C1C1C', marginBottom: 20 },
  backBtnWrapper: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#E0E0E0', borderRadius: 8 },
  backBtnText: { color: '#1C1C1C', fontWeight: 'bold' },
  navHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F2', backgroundColor: '#FFFFFF'
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  navHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1C', flex: 1, textAlign: 'center' },
  listContent: { paddingBottom: 40 },
  headerContainer: { backgroundColor: '#FFFFFF', paddingBottom: 16 },
  header: { alignItems: 'center', paddingTop: 20, paddingHorizontal: 20 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden'
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: GREEN },
  name: { fontSize: 24, fontWeight: 'bold', color: '#1C1C1C', marginBottom: 8 },
  bio: { fontSize: 14, color: '#424242', textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 12, marginTop: 10 },
  friendButton: {
    flex: 1, height: 44, backgroundColor: GREEN, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', maxWidth: 150,
  },
  friendButtonActive: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: GREEN
  },
  friendButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  friendButtonTextActive: { color: GREEN },
  messageButton: {
    flex: 1, flexDirection: 'row', height: 44, backgroundColor: 'rgba(56, 142, 60, 0.05)', 
    borderWidth: 1, borderColor: GREEN, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', maxWidth: 150,
  },
  messageButtonText: { color: GREEN, fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
  divider: { height: 8, backgroundColor: '#F2F2F2', alignSelf: 'stretch', marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1C', paddingHorizontal: 16, paddingTop: 16 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#616161', fontSize: 16 },
});
