import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../../constants/tokens';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { Post } from '../../types';
import { useAppTheme } from '../../context/ThemeContext';
import { useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfilePostGridItem } from '../../components/ProfilePostGridItem';
import { useFriendshipGlobal } from '../../hooks/use-friendship-global';
import { UserReviewService } from '../../lib/user-review-service';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';

interface UserProfile {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  followers_count: number;
  following_count: number;
  rating?: number | null;
  review_count?: number;
  phone_verified?: boolean;
  username?: string;
  email?: string;
  location?: { state?: string; lga?: string; city?: string; ward?: string };
}

export default function OtherUserProfileScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const friendship = useFriendshipGlobal(id);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollower, setIsFollower] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'reviews'>('posts');
  const [avatarError, setAvatarError] = useState(false);

  const fetchProfileAndPosts = useCallback(async () => {
    if (!id) return;
    try {
      const { data: pData } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      if (pData) {
        setProfile(pData);
        setAvatarError(false); // Reset error state on new fetch
      }

      if (currentUser) {
        const { data: fData } = await supabase
          .from('followers')
          .select('id')
          .eq('follower_id', currentUser.id)
          .eq('following_id', id)
          .maybeSingle();
        setIsFollowing(!!fData);

        const { data: fData2 } = await supabase
          .from('followers')
          .select('id')
          .eq('follower_id', id)
          .eq('following_id', currentUser.id)
          .maybeSingle();
        setIsFollower(!!fData2);
      }

      const { data: postData } = await supabase
        .from('posts')
        .select(`
          *,
          user:users!posts_user_id_fkey(
            id,
            name,
            avatar_url,
            location,
            created_at
          )
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false });
      
      if (postData) setPosts(postData as Post[]);

      // Dynamically fetch accurate follower counts
      try {
        const [{ count: fers }, { count: fing }] = await Promise.all([
          supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', id),
          supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', id)
        ]);
        setFollowersCount(fers || 0);
        setFollowingCount(fing || 0);
      } catch (fErr) {}

      // Fetch reviews
      try {
        const userReviews = await UserReviewService.getSellerReviews(id);
        setReviews(userReviews || []);
      } catch (rErr) {}
    } catch (e) {
      console.error('Error fetching profile:', e);
    } finally {
      setLoading(false);
    }
  }, [id, currentUser]);

  useEffect(() => {
    setLoading(true);
    setProfile(null);
    fetchProfileAndPosts();
  }, [id, fetchProfileAndPosts]);

  // Realtime: keep rating & review_count in sync when this user's row updates
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`profile-rating-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${id}` },
        (payload) => {
          if (payload.new) {
            setProfile((prev) => prev ? { ...prev, ...(payload.new as Partial<UserProfile>) } : prev);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleToggleFollow = async () => {
    if (!currentUser || !profile) return;
    setFollowLoading(true);

    try {
      if (isFollowing) {
        const { error } = await supabase.from('followers').delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id);
        if (error) throw error;
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase.from('followers').insert({
          follower_id: currentUser.id,
          following_id: profile.id,
        });
        if (error) throw error;
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
      <SafeAreaView style={[styles.container, { backgroundColor: DARK, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={G} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: DARK }]}>
        <View style={[styles.header, { borderBottomColor: GLASS_BORDER }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={24} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: TEXT_PRIMARY, fontFamily: 'Outfit' }]}>Profile Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: DARK }]}>
      <View style={[styles.header, { paddingTop: 54 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: MUTED, fontFamily: 'Outfit-Bold' }]}>
          @{profile.username || 'user'}
        </Text>
        <TouchableOpacity 
            onPress={() => {
              if (isOwnProfile) return;
              Alert.alert('Options', '', [
                { text: 'Block User', style: 'destructive', onPress: async () => {
                  if (!currentUser) return;
                  await supabase.from('user_blocks').insert({ blocker_id: currentUser.id, blocked_id: profile.id });
                  Alert.alert('Success', 'User blocked.');
                  router.back();
                }},
                { text: 'Report User', style: 'destructive', onPress: async () => {
                  if (!currentUser) return;
                  await supabase.from('reports').insert({ reporter_id: currentUser.id, reported_user_id: profile.id, reason: 'Inappropriate profile' });
                  Alert.alert('Success', 'User reported.');
                }},
                { text: 'Cancel', style: 'cancel' }
              ]);
            }}
            style={styles.navBtn}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile hero */}
        <View style={styles.profileHero}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatarWrap}>
              {(profile.avatar_url && !avatarError) ? (
                <Image 
                  source={{ uri: profile.avatar_url }} 
                  style={styles.avatarImg} 
                  contentFit="cover" 
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <View style={[styles.avatarImg, styles.avatarFallback]}>
                  <Text style={styles.avatarFallbackTxt}>{profile.name ? profile.name.charAt(0).toUpperCase() : '?'}</Text>
                </View>
              )}
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.heroInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.heroName}>{profile.name}</Text>
                {profile.phone_verified && (
                  <MaterialIcons name="verified" size={18} color={G} />
                )}
              </View>
              <Text style={styles.heroHandle}>@{profile.username || 'user'}</Text>
              
              <View style={styles.locationRow}>
                <Ionicons name="location" size={12} color={G} />
                <Text style={styles.locationTxt}>
                  {[profile.location?.ward, profile.location?.lga, profile.location?.state].filter(Boolean).join(', ') || 'Unknown Location'}
                </Text>
              </View>
            </View>
          </View>

          {profile.bio && (
            <Text style={styles.heroBio}>{profile.bio}</Text>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statBtn} onPress={() => router.push(`/network/${profile.id}?mode=followers` as any)}>
              <Text style={styles.statV}>{followersCount}</Text>
              <Text style={styles.statL}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statBtn} onPress={() => router.push(`/network/${profile.id}?mode=following` as any)}>
              <Text style={styles.statV}>{followingCount}</Text>
              <Text style={styles.statL}>Following</Text>
            </TouchableOpacity>
            <View style={styles.statBtn}>
              <Text style={styles.statV}>{posts.length}</Text>
              <Text style={styles.statL}>Posts</Text>
            </View>
          </View>

          {/* Mutuals */}
          {/* Note: if you have mutuals logic, insert it here */}

          {/* Action buttons */}
          {!isOwnProfile && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btnAction, { backgroundColor: isFollowing ? SURFACE : G, borderColor: isFollowing ? GLASS_BORDER : G, borderWidth: 1 }]}
                onPress={handleToggleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={isFollowing ? '#fff' : DARK} />
                ) : (
                  <>
                    {isFollowing && <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 6 }} />}
                    <Text style={[styles.btnActionTxt, { color: isFollowing ? '#fff' : DARK }]}>
                      {isFollowing ? 'Following' : isFollower ? 'Follow Back' : 'Follow'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.btnAction, { backgroundColor: SURFACE, borderColor: GLASS_BORDER, borderWidth: 1 }]}
                onPress={handleMessage}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={[styles.btnActionTxt, { color: '#fff' }]}>Message</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsWrap}>
          {(['posts', 'reviews'] as const).map(t => (
            <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={styles.tabBtn}>
              <Text style={[styles.tabTxt, { color: activeTab === t ? '#fff' : LABEL, fontFamily: activeTab === t ? 'Outfit-Bold' : 'Outfit-Medium' }]}>
                {t}
              </Text>
              {activeTab === t && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>



        <View style={styles.feedSection}>
          {activeTab === 'posts' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
              {posts.length > 0 ? (
                posts.map(post => {
                  const TARGET_TILE_WIDTH = 120;
                  const numColumns = Math.max(3, Math.floor(windowWidth / TARGET_TILE_WIDTH));
                  return (
                    <ProfilePostGridItem 
                      key={post.id} 
                      post={post} 
                      width={windowWidth / numColumns}
                      onPress={() => router.push(`/posts/${post.id}`)}
                    />
                  );
                })
              ) : (
                <View style={[styles.emptyState, { width: '100%' }]}>
                  <Feather name="image" size={40} color={LABEL} />
                  <Text style={[styles.emptyTitle, { color: MUTED, fontFamily: 'Outfit' }]}>No posts yet</Text>
                  <Text style={[styles.emptySubtitle, { color: LABEL, fontFamily: 'Inter' }]}>{profile.name} hasn't posted anything.</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.reviewsList}>
              {reviews.length > 0 ? (
                reviews.map(review => (
                  <View key={review.id} style={[styles.reviewCard, { backgroundColor: SURFACE, borderBottomColor: GLASS_BORDER }]}>
                    <View style={styles.reviewHeader}>
                      <Image source={{ uri: review.buyer?.avatar_url }} style={styles.reviewerAvatar} />
                      <View style={styles.reviewerInfo}>
                        <Text style={[styles.reviewerName, { color: TEXT_PRIMARY, fontFamily: 'Outfit' }]}>{review.buyer?.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <FontAwesome name="star" size={12} color="#FFD700" />
                          <Text style={[styles.reviewRatingText, { color: TEXT_PRIMARY, fontFamily: 'Outfit' }]}> {review.rating}</Text>
                        </View>
                      </View>
                      {review.verified_purchase && (
                        <View style={styles.verifiedBadge}>
                          <Feather name="check-circle" size={12} color={G} />
                          <Text style={[styles.verifiedText, { color: G, fontFamily: 'Inter' }]}>Verified</Text>
                        </View>
                      )}
                    </View>
                    {review.comment ? (
                      <Text style={[styles.reviewComment, { color: MUTED, fontFamily: 'Inter' }]}>{review.comment}</Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <View style={[styles.emptyState, { width: '100%' }]}>
                  <Feather name="star" size={40} color={LABEL} />
                  <Text style={[styles.emptyTitle, { color: MUTED, fontFamily: 'Outfit' }]}>No reviews yet</Text>
                  <Text style={[styles.emptySubtitle, { color: LABEL, fontFamily: 'Inter' }]}>{profile.name} doesn't have any reviews.</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12
  },
  navBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: SURFACE, borderColor: GLASS_BORDER, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, textAlign: 'center' },
  profileHero: { paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 16 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 80, height: 80, borderRadius: 40, borderWidth: 2.5, borderColor: GLASS_BORDER },
  avatarFallback: { backgroundColor: G, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackTxt: { fontSize: 32, fontFamily: 'Outfit-Bold', color: '#050505' },
  onlineDot: { position: 'absolute', bottom: 3, right: 3, width: 14, height: 14, borderRadius: 7, backgroundColor: G, borderWidth: 2, borderColor: '#050505' },
  heroInfo: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroName: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#fff' },
  heroHandle: { fontSize: 13, fontFamily: 'Inter-Regular', color: LABEL, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationTxt: { fontSize: 12, fontFamily: 'Inter-Regular', color: LABEL },
  heroBio: { fontSize: 14, fontFamily: 'Inter-Regular', color: MUTED, lineHeight: 22, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  statBtn: { alignItems: 'center' },
  statV: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#fff' },
  statL: { fontSize: 11, fontFamily: 'Inter-Regular', color: LABEL },
  actionRow: { flexDirection: 'row', gap: 12 },
  btnAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 14 },
  btnActionTxt: { fontSize: 14, fontFamily: 'Outfit-Bold' },
  tabsWrap: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER },
  tabBtn: { flex: 1, paddingVertical: 12, position: 'relative' },
  tabTxt: { fontSize: 14, textAlign: 'center', textTransform: 'capitalize' },
  tabIndicator: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, borderRadius: 99, backgroundColor: G },
  
  feedSection: { paddingTop: 16 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 12 },
  emptySubtitle: { fontSize: 14, marginTop: 6 },
  reviewsList: { paddingHorizontal: 16 },
  reviewCard: { paddingVertical: 16, borderBottomWidth: 1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reviewerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  reviewerInfo: { flex: 1 },
  reviewerName: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  reviewRatingText: { fontSize: 13, fontWeight: 'bold' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4, opacity: 0.8 },
  verifiedText: { fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  reviewComment: { fontSize: 14, lineHeight: 20, marginTop: 4 },

});
