import { createStyleSheet, useStyles } from "react-native-unistyles";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, useWindowDimensions } from 'react-native';
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
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

function PressableCard({ style, onPress, children, activeOpacity = 0.85, ...props }: any) {
    const { styles: stylesheet, theme } = useStyles(_stylesheet);

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
    const { styles: stylesheet, theme } = useStyles(_stylesheet);

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

  const listHeader = useMemo(() => {
  return (
      <View style={stylesheet.headerContainer}>
        
        {/* ── Nav bar (YRDLY New Designs matching) ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
          <View style={{ width: 38 }} />
          <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 16, color: '#FFFFFF' }}>Profile</Text>
          <TouchableOpacity 
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#111111', borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={18} color={theme.colors.MUTED} />
          </TouchableOpacity>
        </View>

        {/* ── Identity Block (Figma New Design matching) ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
            {/* Avatar with ring */}
            <View style={{ position: 'relative' }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: '100%', height: '100%', borderRadius: 40, overflow: 'hidden', backgroundColor: theme.colors.DARK }}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.SURFACE }}>
                      <Text style={{ fontFamily: 'Outfit-ExtraBold', fontSize: 24, color: theme.colors.G }}>
                        {profile?.name ? profile.name.charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => router.push('/profile/edit')}
                style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.G, borderWidth: 2, borderColor: theme.colors.DARK, justifyContent: 'center', alignItems: 'center' }}
              >
                <Ionicons name="camera-outline" size={12} color={theme.colors.DARK} />
              </TouchableOpacity>
            </View>

            {/* Name & Handle */}
            <View style={{ flex: 1, paddingTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text style={{ fontFamily: 'Outfit-ExtraBold', fontSize: 20, color: '#FFFFFF' }} numberOfLines={1}>
                  {profile?.name || user?.user_metadata?.name || 'Anonymous'}
                </Text>
                {profile?.phone_verified && (
                  <MaterialIcons name="verified" size={18} color={theme.colors.G} />
                )}
              </View>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 13, color: theme.colors.LABEL, marginBottom: 6 }}>
                @{(profile as any)?.username || (profile as any)?.handle || user?.email?.split('@')[0] || 'user'}
              </Text>
              {formattedLocation && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="location-outline" size={13} color={theme.colors.MUTED} />
                  <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: theme.colors.MUTED }}>{formattedLocation}</Text>
                </View>
              )}
            </View>
          </View>

          {!!profile?.bio && (
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 14, color: 'rgba(255,255,255,0.68)', lineHeight: 22, marginBottom: 16 }}>
              {profile.bio}
            </Text>
          )}

          <TouchableOpacity 
            style={{ height: 36, paddingHorizontal: 20, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start' }} 
            onPress={() => router.push('/profile/edit')}
            activeOpacity={0.8}
          >
            <Text style={{ color: theme.colors.MUTED, fontSize: 13, fontFamily: 'Inter-Medium' }}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats Bar (New Design 3-Column with border dividers) ── */}
        <View style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.GLASS_BORDER, paddingVertical: 16 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Outfit-ExtraBold', fontSize: 22, color: '#FFFFFF' }}>{posts.length}</Text>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: theme.colors.LABEL, marginTop: 2 }}>Posts</Text>
          </View>
          <View style={{ width: 1, height: '100%', backgroundColor: theme.colors.GLASS_BORDER }} />
          <TouchableOpacity 
            style={{ flex: 1, alignItems: 'center' }}
            onPress={() => router.push(`/network/${user?.id}?mode=followers` as any)}
          >
            <Text style={{ fontFamily: 'Outfit-ExtraBold', fontSize: 22, color: '#FFFFFF' }}>{followersCount}</Text>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: theme.colors.LABEL, marginTop: 2 }}>Followers</Text>
          </TouchableOpacity>
          <View style={{ width: 1, height: '100%', backgroundColor: theme.colors.GLASS_BORDER }} />
          <TouchableOpacity 
            style={{ flex: 1, alignItems: 'center' }}
            onPress={() => router.push(`/network/${user?.id}?mode=following` as any)}
          >
            <Text style={{ fontFamily: 'Outfit-ExtraBold', fontSize: 22, color: '#FFFFFF' }}>{followingCount}</Text>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: theme.colors.LABEL, marginTop: 2 }}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* ── Quick Access 2x2 Grid (Figma 1:1) ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ fontFamily: 'Inter-Bold', fontSize: 11, color: theme.colors.LABEL, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>QUICK ACCESS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <PressableCard style={{ width: '48%', backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, borderRadius: 16, padding: 14 }} onPress={() => router.push('/community')}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.G + '15', borderWidth: 1, borderColor: theme.colors.G + '25', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="people-outline" size={18} color={theme.colors.G} />
              </View>
              <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 14, color: theme.colors.TEXT_PRIMARY, marginBottom: 2 }}>Community</Text>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: theme.colors.LABEL }}>Connections & people</Text>
            </PressableCard>

            <PressableCard style={{ width: '48%', backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, borderRadius: 16, padding: 14 }} onPress={() => router.push('/tickets')}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.G + '15', borderWidth: 1, borderColor: theme.colors.G + '25', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="ticket-outline" size={18} color={theme.colors.G} />
              </View>
              <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 14, color: theme.colors.TEXT_PRIMARY, marginBottom: 2 }}>Tickets</Text>
            </PressableCard>

            <PressableCard style={{ width: '48%', backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, borderRadius: 16, padding: 14 }} onPress={() => router.push('/my-events' as any)}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.G + '15', borderWidth: 1, borderColor: theme.colors.G + '25', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.G} />
              </View>
              <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 14, color: theme.colors.TEXT_PRIMARY, marginBottom: 2 }}>My Events</Text>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: theme.colors.LABEL }}>Events you run</Text>
            </PressableCard>

            <PressableCard style={{ width: '48%', backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, borderRadius: 16, padding: 14 }} onPress={handleManageStore}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.G + '15', borderWidth: 1, borderColor: theme.colors.G + '25', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="storefront-outline" size={18} color={theme.colors.G} />
              </View>
              <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 14, color: theme.colors.TEXT_PRIMARY, marginBottom: 2 }}>My Business</Text>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: theme.colors.LABEL }}>Business presence</Text>
            </PressableCard>
          </View>
        </View>

        {/* ── Subtly underlined Posts / Saved Tabs (Figma 1:1) ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 24, borderBottomWidth: 1, borderBottomColor: theme.colors.GLASS_BORDER, paddingBottom: 10 }}>
            <TouchableOpacity 
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab('posts');
              }}
              style={{ position: 'relative', paddingBottom: 6 }}
            >
              <Text style={{ fontFamily: activeTab === 'posts' ? 'Outfit-Bold' : 'Outfit-Medium', fontSize: 14, color: activeTab === 'posts' ? '#FFFFFF' : theme.colors.LABEL }}>
                Posts
              </Text>
              {activeTab === 'posts' && (
                <View style={{ position: 'absolute', bottom: -11, left: 0, right: 0, height: 2, backgroundColor: theme.colors.G, borderRadius: 1 }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab('saved');
              }}
              style={{ position: 'relative', paddingBottom: 6 }}
            >
              <Text style={{ fontFamily: activeTab === 'saved' ? 'Outfit-Bold' : 'Outfit-Medium', fontSize: 14, color: activeTab === 'saved' ? '#FFFFFF' : theme.colors.LABEL }}>
                Saved
              </Text>
              {activeTab === 'saved' && (
                <View style={{ position: 'absolute', bottom: -11, left: 0, right: 0, height: 2, backgroundColor: theme.colors.G, borderRadius: 1 }} />
              )}
            </TouchableOpacity>
          </View>
        </View>

      </View>
    );
  }, [avatarUri, profile, user, posts.length, followersCount, followingCount, formattedLocation, handleManageStore, router, activeTab]);

  const activeData = activeTab === 'posts' ? posts : savedPosts;
  const isLoading = activeTab === 'posts' ? loadingPosts : loadingSaved;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.DARK, paddingTop: insets.top }}>
      <FlatList
        key={numColumns}
        data={activeData}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => {
        return (
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
                );
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.G} />}
        contentContainerStyle={stylesheet.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading && !refreshing ? (
            <View style={{ flexDirection: 'row', padding: 8 }}>
              <PostSkeleton />
            </View>
          ) : (
            <Animated.View entering={FadeIn} style={stylesheet.emptyContainer}>
              <Ionicons name="images-outline" size={56} color="#333" style={{ marginBottom: 16 }} />
              <Text style={stylesheet.emptyHeadline}>No posts yet</Text>
              <Text style={stylesheet.emptySub}>Share something with your neighbourhood.</Text>
              <TouchableOpacity 
                style={stylesheet.createBtn}
                onPress={() => router.push('/create-post' as any)}
              >
                <Text style={stylesheet.createBtnText}>Create Post</Text>
              </TouchableOpacity>
            </Animated.View>
          )
        }
      />
    </View>
  );
}

const _stylesheet = createStyleSheet(theme => ({
      headerContainer: {
        backgroundColor: theme.colors.DARK,
      },
      listContent: {
        paddingBottom: 90,
      },
      emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
      },
      emptyHeadline: {
        fontFamily: 'Outfit-Bold',
        fontSize: 18,
        color: theme.colors.TEXT_PRIMARY,
        marginBottom: 6,
      },
      emptySub: {
        fontFamily: 'Inter-Regular',
        fontSize: 14,
        color: theme.colors.MUTED,
        textAlign: 'center',
        marginBottom: 20,
      },
      createBtn: {
        backgroundColor: theme.colors.G,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
      },
      createBtnText: {
        fontFamily: 'Outfit-Bold',
        fontSize: 14,
        color: theme.colors.DARK,
      },
    }));
