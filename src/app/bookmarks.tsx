import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/use-supabase-auth';
import { useAppTheme } from '../context/ThemeContext';
import { Post } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { PostCard } from '../components/PostCard';
import { EventCard } from '../components/EventCard';
import { useRouter } from 'expo-router';
import { PostSkeleton } from '../components/Skeleton';

const { width } = Dimensions.get('window');

export default function BookmarksScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'posts' | 'events'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookmarks = async () => {
    if (!user) return;
    try {
      if (activeTab === 'posts') {
        const { data } = await supabase
          .from('post_bookmarks')
          .select(`
            post_id,
            created_at
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (data) {
          const postIds = data.map((b: any) => b.post_id);
          if (postIds.length > 0) {
            const { data: fullPosts } = await supabase
              .from('posts')
              .select('*, profiles:user_id(*)')
              .in('id', postIds);
            
            // Re-order by bookmark time
            const orderedPosts = postIds.map(id => fullPosts?.find(p => p.id === id)).filter(Boolean);
            setPosts(orderedPosts as Post[]);
          } else {
            setPosts([]);
          }
        }
      } else {
        const { data } = await supabase
          .from('event_bookmarks')
          .select('event_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (data) {
          const eventIds = data.map((b: any) => b.event_id);
          if (eventIds.length > 0) {
            const { data: fullEvents } = await supabase
              .from('events')
              .select('*')
              .in('id', eventIds);
            
            // Re-order by bookmark time
            const orderedEvents = eventIds.map(id => fullEvents?.find(e => e.id === id)).filter(Boolean);
            setEvents(orderedEvents as Post[]);
          } else {
            setEvents([]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchBookmarks();
  }, [user, activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookmarks();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Saved Items"  />
      
      <View style={[styles.tabs, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'posts' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]} 
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'posts' ? colors.tint : colors.textSecondary, fontWeight: activeTab === 'posts' ? '600' : '500' }]}>Posts & Market</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'events' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]} 
          onPress={() => setActiveTab('events')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'events' ? colors.tint : colors.textSecondary, fontWeight: activeTab === 'events' ? '600' : '500' }]}>Events</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, padding: 16 }}>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </View>
      ) : activeTab === 'posts' ? (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No saved posts yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <PostCard 
              post={item} 
              onPress={() => {
                if (item.category === 'For Sale') router.push(`/marketplace/${item.id}`);
                else router.push(`/posts/${item.id}`);
              }} 
            />
          )}
        />
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No saved events yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <EventCard 
              event={item} 
              onPress={() => router.push(`/events/${item.id}`)} 
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  tabText: {
    fontSize: 15,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 64,
  },
  emptyText: {
    fontSize: 16,
  }
});
