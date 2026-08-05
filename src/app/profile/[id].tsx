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

  const fetchProfileAndPosts = useCallback(async () => {
    if (!id) return;
    try {
      const { data: pData } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      if (pData) setProfile(pData);

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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
      <View style={[styles.header, { borderBottomColor: GLASS_BORDER }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={[styles.headerTitleLeft, { color: TEXT_PRIMARY, fontFamily: 'Outfit' }]} numberOfLines={1}>
            {profile.username || profile.name}
          </Text>
          {profile.phone_verified && (
            <MaterialIcons 
              name="verified" 
              size={16} 
              color={G}
            />
          )}
        </View>
        {!isOwnProfile && (
          <TouchableOpacity 
            onPress={() => {
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
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={TEXT_PRIMARY} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {profile.cover_url && (
          <Image source={{ uri: profile.cover_url }} style={styles.cover} contentFit="cover" />
        )}

        <View style={[styles.profileHeader, { backgroundColor: DARK, borderBottomColor: GLASS_BORDER }]}>
          <View style={styles.avatarRow}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={[styles.avatar, { borderColor: DARK, backgroundColor: SURFACE }, !profile.cover_url && { marginTop: 0 }]} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { borderColor: DARK, backgroundColor: G }, !profile.cover_url && { marginTop: 0 }]}>
                <Text style={[styles.avatarFallbackText, { color: '#000000', fontFamily: 'Outfit' }]}>
                  {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: TEXT_PRIMARY, fontFamily: 'Outfit' }]}>{posts.length}</Text>
                <Text style={[styles.statLabel, { color: LABEL, fontFamily: 'Inter' }]}>Posts</Text>
              </View>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => router.push(`/network/${profile.id}?mode=followers` as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.statValue, { color: TEXT_PRIMARY, fontFamily: 'Outfit' }]}>{followersCount}</Text>
                <Text style={[styles.statLabel, { color: LABEL, fontFamily: 'Inter' }]}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => router.push(`/network/${profile.id}?mode=following` as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.statValue, { color: TEXT_PRIMARY, fontFamily: 'Outfit' }]}>{followingCount}</Text>
                <Text style={[styles.statLabel, { color: LABEL, fontFamily: 'Inter' }]}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={[styles.name, { color: TEXT_PRIMARY, fontFamily: 'Outfit' }]}>{profile.name}</Text>
            {profile.phone_verified && (
              <MaterialIcons name="verified" size={18} color={G} style={{ marginLeft: 6 }} />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
            <Text style={{ color: MUTED, fontSize: 14, fontFamily: 'Inter' }}>@{profile.username || 'user'}</Text>
            {isFollower && !isFollowing && (
              <View style={styles.followsYouBadge}>
                <Text style={styles.followsYouText}>Follows you</Text>
              </View>
            )}
            {isFollower && isFollowing && (
              <View style={styles.followsYouBadge}>
                <Text style={styles.followsYouText}>Mutual</Text>
              </View>
            )}
          </View>
          
          {(profile.review_count ?? 0) > 0 && (
            <View style={styles.ratingRow}>
              <FontAwesome name="star" size={14} color="#FFD700" />
              <Text style={[styles.ratingText, { color: TEXT_PRIMARY, fontFamily: 'Outfit' }]}>
                {profile.rating?.toFixed(1) || '0.0'}
              </Text>
              <Text style={[styles.reviewCount, { color: LABEL, fontFamily: 'Inter' }]}>
                ({profile.review_count} reviews)
              </Text>
            </View>
          )}
          
          {profile.bio && <Text style={[styles.bio, { color: MUTED, fontFamily: 'Inter' }]}>{profile.bio}</Text>}

          <View style={{ flexDirection: 'column', gap: 6, marginTop: profile.bio ? 8 : 0, marginBottom: 8 }}>
            {profile.email && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="mail-outline" size={14} color={G} />
                <Text style={{ color: MUTED, fontSize: 13, fontFamily: 'Inter' }} numberOfLines={1}>{profile.email}</Text>
              </View>
            )}
            {profile.location && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                onPress={() => {
                  const locStr = [profile.location?.ward, profile.location?.lga, profile.location?.state].filter(Boolean).join(', ');
                  if (locStr) Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(locStr)}`);
                }}
              >
                <Ionicons name="location-outline" size={14} color={G} />
                <Text style={{ color: MUTED, fontSize: 13, textDecorationLine: 'underline', fontFamily: 'Inter' }}>
                  {[profile.location?.ward, profile.location?.lga, profile.location?.state].filter(Boolean).join(', ')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {currentUser?.id !== profile.id && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btnFollow, { backgroundColor: isFollowing ? SURFACE : G, borderWidth: isFollowing ? 1 : 0, borderColor: GLASS_BORDER }]}
                onPress={handleToggleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={isFollowing ? TEXT_PRIMARY : '#000000'} />
                ) : (
                  <Text style={[styles.btnFollowText, { color: isFollowing ? TEXT_PRIMARY : '#000000', fontFamily: 'Outfit' }]}>
                    {isFollowing ? 'Following' : isFollower ? 'Follow Back' : 'Follow'}
                  </Text>
                )}
              </TouchableOpacity>

              {friendship.status === 'none' && (
                <TouchableOpacity style={[styles.btnMessage, { backgroundColor: 'rgba(130, 219, 126, 0.15)' }]} onPress={friendship.addFriend} disabled={friendship.isLoading}>
                  {friendship.isLoading ? <ActivityIndicator size="small" color={G} /> : <Feather name="user-plus" size={18} color={G} />}
                  <Text style={[styles.btnMessageText, { color: G, fontFamily: 'Outfit' }]}>Add Friend</Text>
                </TouchableOpacity>
              )}

              {friendship.status === 'request_sent' && (
                <TouchableOpacity style={[styles.btnMessage, { backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER }]} disabled>
                  <Feather name="clock" size={18} color={MUTED} />
                  <Text style={[styles.btnMessageText, { color: MUTED, fontFamily: 'Inter' }]}>Requested</Text>
                </TouchableOpacity>
              )}

              {friendship.status === 'request_received' && (
                <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.btnMessage, { backgroundColor: G, flex: 1 }]}
                    onPress={friendship.acceptRequest}
                    disabled={friendship.isLoading}
                  >
                    {friendship.isLoading
                      ? <ActivityIndicator size="small" color="#000" />
                      : <Feather name="check" size={18} color="#000" />}
                    <Text style={[styles.btnMessageText, { color: '#000', fontFamily: 'Outfit' }]}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnMessage, { backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, flex: 1 }]}
                    onPress={friendship.declineRequest}
                    disabled={friendship.isLoading}
                  >
                    <Feather name="x" size={18} color={MUTED} />
                    <Text style={[styles.btnMessageText, { color: MUTED, fontFamily: 'Inter' }]}>Decline</Text>
                  </TouchableOpacity>
                </View>
              )}

              {friendship.status === 'friends' && (
                <TouchableOpacity style={[styles.btnMessage, { backgroundColor: 'rgba(130, 219, 126, 0.15)' }]} onPress={handleMessage}>
                  <Feather name="message-circle" size={18} color={G} />
                  <Text style={[styles.btnMessageText, { color: G, fontFamily: 'Outfit' }]}>Message</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'posts' && { borderBottomColor: G, borderBottomWidth: 2 }]} 
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'posts' ? G : LABEL, fontFamily: 'Outfit' }]}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'reviews' && { borderBottomColor: G, borderBottomWidth: 2 }]} 
            onPress={() => setActiveTab('reviews')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'reviews' ? G : LABEL, fontFamily: 'Outfit' }]}>Reviews</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  headerTitleLeft: { fontSize: 20, fontWeight: '800' },
  cover: { height: 120, width: '100%' },
  profileHeader: { padding: 16, borderBottomWidth: 1 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    marginTop: -40, borderWidth: 4,
  },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { fontSize: 32, fontWeight: 'bold' },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', marginLeft: 10 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 13, marginTop: 2 },
  name: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  followsYouBadge: { backgroundColor: SURFACE, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: GLASS_BORDER },
  followsYouText: { color: MUTED, fontSize: 11, fontFamily: 'Inter', fontWeight: '600' },
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
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  ratingText: { fontSize: 14, fontWeight: 'bold', marginLeft: 4 },
  reviewCount: { fontSize: 14, marginLeft: 4 },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333' },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 15, fontWeight: 'bold' },
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
