import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PostCard } from '../../components/PostCard';
import { PostSkeleton } from '../../components/Skeleton';
import { supabase } from '../../lib/supabase';
import { Post } from '../../types';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocation } from '../../context/LocationContext';
import { LocationChip } from '../../components/LocationChip';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

export default function HomeTab() {
  const { colors, isDarkMode } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeFilter } = useLocation();
  
  const HEADER_HEIGHT = Platform.OS === 'ios' ? 44 + insets.top : 56 + insets.top;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const isScrollingUp = useSharedValue(true);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      if (currentY > lastScrollY.value && currentY > 50) {
        isScrollingUp.value = false;
      } else if (currentY < lastScrollY.value) {
        isScrollingUp.value = true;
      }
      lastScrollY.value = currentY;
      scrollY.value = currentY;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = withTiming(isScrollingUp.value || scrollY.value <= 50 ? 0 : -HEADER_HEIGHT, { duration: 250 });
    return {
      transform: [{ translateY }],
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      height: HEADER_HEIGHT,
    };
  });

  const fetchPosts = async () => {
    try {
      let query = supabase
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
        `);

      if (activeFilter?.state) query = query.eq('state', activeFilter.state);
      if (activeFilter?.lga) query = query.eq('lga', activeFilter.lga);
      if (activeFilter?.ward) query = query.eq('ward', activeFilter.ward);

      const { data, error } = await query
        .order('timestamp', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error fetching posts:', error);
      } else {
        const validPosts = (data as Post[]).filter(post => {
          if (post.category === 'Event' && post.event_date) {
            return new Date(post.event_date).getTime() >= Date.now();
          }
          return true;
        });
        setPosts(validPosts);
      }
    } catch (error) {
      console.error('Unexpected error fetching posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeFilter]);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchPosts();
  }, [activeFilter]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View style={headerAnimatedStyle}>
          <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[styles.headerContent, { paddingTop: insets.top, borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.headerTitle, { color: colors.tint }]}>YRDLY</Text>
            
            <View style={{flex: 1, paddingHorizontal: 12, alignItems: 'flex-start'}}>
              <LocationChip />
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity style={{ marginRight: 16 }} onPress={() => router.push('/map')}>
                <Ionicons name="location-outline" size={24} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/notifications')}>
                <Feather name="bell" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
        <View style={{ paddingTop: HEADER_HEIGHT }}>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={headerAnimatedStyle}>
        <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[styles.headerContent, { paddingTop: insets.top, borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.headerTitle, { color: colors.tint }]}>YRDLY</Text>
          
          <View style={{flex: 1, paddingHorizontal: 12, alignItems: 'flex-start'}}>
            <LocationChip />
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={{ marginRight: 16 }} onPress={() => router.push('/map')}>
              <Ionicons name="location-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <Feather name="bell" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.FlatList
        data={posts}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard 
            post={item} 
            onPress={() => {
              if (item.category === 'For Sale') router.push(`/marketplace/${item.id}`);
              else if (item.category === 'Event') router.push(`/events/${item.id}`);
              else router.push(`/posts/${item.id}`);
            }}
            onComment={() => router.push(`/posts/${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.tint} 
            colors={[colors.tint]} 
            progressViewOffset={HEADER_HEIGHT}
          />
        }
        contentContainerStyle={[styles.listContent, { paddingTop: HEADER_HEIGHT, paddingBottom: 80 }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No posts yet. Be the first to post!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    // handled dynamically
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
