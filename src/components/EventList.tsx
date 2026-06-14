import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text } from 'react-native';
import { EventCard } from './EventCard';
import { supabase } from '../lib/supabase';
import { Post } from '../types';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../context/ThemeContext';

interface EventListProps {
  searchQuery?: string;
}

export function EventList({ searchQuery = '' }: EventListProps) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [events, setEvents] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select('*')
        .eq('category', 'Event');

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,text.ilike.%${searchQuery}%`);
      }

      // Order by event date ascending to show upcoming events first
      const { data, error } = await query
        .order('event_date', { ascending: true })
        .limit(30);

      if (error) throw error;
      setEvents(data as Post[]);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
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
      renderItem={({ item }) => (
        <EventCard 
          event={item} 
          onPress={() => router.push(`/events/${item.id}`)}
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
