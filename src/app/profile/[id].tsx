import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { Post } from '../../types';
import { useAppTheme } from '../../context/ThemeContext';
import { useWindowDimensions } from 'react-native';
import { ProfilePostGridItem } from '../../components/ProfilePostGridItem';

interface UserProfile {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  followers_count: number;
  following_count: number;
}

export default function OtherUserProfileScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const { width: windowWidth } = useWindowDimensions();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const fetchProfileAndPosts = useCallback(async () => {
    if (!id) return;
    try {
      const { data: pData } = await supabase.from('users').select('*').eq('id', id).single();
      if (pData) setProfile(pData);

      if (currentUser) {
        const { data: fData } = await supabase
          .from('followers')
          .select('id')
          .eq('follower_id', currentUser.id)
          .eq('following_id', id)
          .maybeSingle();
        setIsFollowing(!!fData);
      }

      const { data: postData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false });
      
      if (postData) setPosts(postData as Post[]);

      // Dynamically fetch accurate follower counts
      const [{ count: fers }, { count: fing }] = await Promise.all([
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', id),
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', id)
      ]);
      setFollowersCount(fers || 0);
      setFollowingCount(fing || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, currentUser]);

  useEffect(() => {
    fetchProfileAndPosts();
  }, [fetchProfileAndPosts]);

  const handleToggleFollow = async () => {
    if (!currentUser || !profile) return;
    setFollowLoading(true);

    try {
      if (isFollowing) {
        await supabase.from('followers').delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase.from('followers').insert({
          follower_id: currentUser.id,
          following_id: profile.id,
        });
        setFollowersCount(prev => prev + 1);
        
        // Trigger notification
        const { NotificationTriggers } = await import('../../lib/notification-triggers');
        await NotificationTriggers.onNewFollower(currentUser.id, profile.id);
      }
      setIsFollowing(!isFollowing);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!currentUser || !profile) return;
    // Find existing friend chat or create one
    const { data: existing } = await supabase.from('conversations')
      .select('id')
      .eq('type', 'friend')
      .contains('participant_ids', [currentUser.id, profile.id])
      .limit(1)
      .maybeSingle();
      
    if (existing) {
      router.push(`/chat/${existing.id}`);
    } else {
      const { data: newConv, error } = await supabase.from('conversations').insert({
        type: 'friend',
        participant_ids: [currentUser.id, profile.id],
      }).select().single();
      
      if (newConv && !error) {
        router.push(`/chat/${newConv.id}`);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{profile.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {profile.cover_url ? (
          <Image source={{ uri: profile.cover_url }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={[styles.cover, { backgroundColor: colors.inputBackground }]} />
        )}

        <View style={[styles.profileHeader, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}>
          <View style={styles.avatarRow}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.tint }]}>
                <Text style={styles.avatarFallbackText}>
                  {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            
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
          </View>

          <Text style={[styles.name, { color: colors.text }]}>{profile.name}</Text>
          {profile.bio && <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>}

          {currentUser?.id !== profile.id && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btnFollow, isFollowing && [styles.btnFollowing, { backgroundColor: colors.inputBackground }], { backgroundColor: isFollowing ? colors.inputBackground : colors.tint }]}
                onPress={handleToggleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={isFollowing ? colors.text : '#FFF'} />
                ) : (
                  <Text style={[styles.btnFollowText, isFollowing && [styles.btnFollowingText, { color: colors.text }]]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btnMessage, { backgroundColor: '#E8F5E9' }]} onPress={handleMessage}>
                <Feather name="message-circle" size={18} color={colors.tint} />
                <Text style={[styles.btnMessageText, { color: colors.tint }]}>Message</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.feedSection}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
            {posts.length > 0 ? (
              posts.map(post => (
                <ProfilePostGridItem 
                  key={post.id} 
                  post={post} 
                  width={windowWidth / 3}
                  onPress={() => router.push(`/posts/${post.id}`)}
                />
              ))
            ) : (
              <View style={[styles.emptyState, { width: '100%' }]}>
                <Feather name="image" size={40} color={colors.border} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No posts yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>{profile.name} hasn't posted anything.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  cover: { height: 120, width: '100%' },
  profileHeader: { padding: 16, borderBottomWidth: 1 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    marginTop: -40, borderWidth: 4, borderColor: '#FFFFFF',
    backgroundColor: '#E8F5E9',
  },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold' },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', marginLeft: 10 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 13, marginTop: 2 },
  name: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  bio: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnFollow: {
    flex: 1, paddingVertical: 10, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  btnFollowText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  btnFollowing: { },
  btnFollowingText: { },
  btnMessage: {
    flex: 1, flexDirection: 'row', paddingVertical: 10, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  btnMessageText: { fontWeight: 'bold', fontSize: 15 },
  feedSection: { paddingVertical: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', paddingHorizontal: 16, marginBottom: 12 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 12 },
  emptySubtitle: { fontSize: 14, marginTop: 6 },
});
