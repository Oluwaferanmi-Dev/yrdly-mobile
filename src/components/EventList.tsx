import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, RefreshControl } from 'react-native';
import { EventCard } from './EventCard';
import { PostSkeleton } from './Skeleton';
import { supabase } from '../lib/supabase';
import { Post } from '../types';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';

interface EventListProps {
  searchQuery?: string;
  sortOption?: 'newest' | 'price_asc' | 'price_desc';
}

export function EventList({ searchQuery = '', sortOption = 'newest' }: EventListProps) {
  const { colors } = useAppTheme();
  const { activeFilter } = useLocation();
  const router = useRouter();
  const [events, setEvents] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select('*')
        .eq('category', 'Event');

      if (activeFilter?.state) query = query.eq('state', activeFilter.state);
      if (activeFilter?.lga) query = query.eq('lga', activeFilter.lga);
      if (activeFilter?.ward) query = query.eq('ward', activeFilter.ward);

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,text.ilike.%${searchQuery}%`);
      }

      // Adjust sorting based on sortOption
      if (sortOption === 'price_asc') {
        query = query.order('price', { ascending: true });
      } else if (sortOption === 'price_desc') {
        query = query.order('price', { ascending: false });
      } else {
        // Default to newest event date
        query = query.order('event_date', { ascending: true });
      }

      const { data, error } = await query.limit(30);

      if (error) throw error;
      const validEvents = (data as Post[]).filter(post => {
        if (post.event_date) {
          return new Date(post.event_date).getTime() >= Date.now();
        }
        return false;
      });
      setEvents(validEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [searchQuery, sortOption, activeFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents(true);
    setRefreshing(false);
  }, [fetchEvents]);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents])
  );

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {searchQuery ? `No events found for "${searchQuery}"` : "No upcoming events"}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      renderItem={({ item }) => (
        <EventCard 
          event={item} 
          onPress={() => {
            let eventId = item.id;
            if (item.event_link) {
              const cleanLink = item.event_link.split('?')[0];
              const parts = cleanLink.split('/');
              eventId = parts.pop() || parts.pop() || item.id;
            }
            router.push(`/events/${eventId}`);
          }}
        />
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 8,
    paddingBottom: 100, // padding for the FAB later
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
