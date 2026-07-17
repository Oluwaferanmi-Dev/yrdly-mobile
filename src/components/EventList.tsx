import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, Text, RefreshControl, ScrollView,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { EventCard, EventCardCompact } from './EventCard';
import { Skeleton, PostSkeleton } from './Skeleton';
import { supabase } from '../lib/supabase';
import { Post } from '../types';
import { useRouter, useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { useAppTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';

const { width } = Dimensions.get('window');

interface EventListProps {
  searchQuery?: string;
  sortOption?: 'newest' | 'price_asc' | 'price_desc';
}

const EVENT_CATEGORIES = [
  { key: '', label: 'All', icon: 'apps-outline' },
  { key: 'Party', label: 'Parties', icon: 'musical-notes-outline' },
  { key: 'Music', label: 'Music', icon: 'headset-outline' },
  { key: 'Sports', label: 'Sports', icon: 'football-outline' },
  { key: 'Food', label: 'Food', icon: 'restaurant-outline' },
  { key: 'Networking', label: 'Networking', icon: 'people-outline' },
  { key: 'Community', label: 'Community', icon: 'home-outline' },
  { key: 'Education', label: 'Education', icon: 'book-outline' },
];

export function EventList({ searchQuery = '', sortOption = 'newest' }: EventListProps) {
  const { colors } = useAppTheme();
  const { activeFilter } = useLocation();
  const router = useRouter();
  const [events, setEvents] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('');
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const featuredRef = useRef<ScrollView>(null);
  const listRef = useRef<FlatList>(null);

  const getEventId = (item: Post) => {
    if (item.event_link) {
      const cleanLink = item.event_link.split('?')[0];
      const parts = cleanLink.split('/');
      return parts.pop() || parts.pop() || item.id;
    }
    return item.id;
  };

  const navigateToEvent = (item: Post) => {
    router.push(`/events/${getEventId(item)}`);
  };

  const fetchEvents = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    const filterString = `${activeFilter?.state || ''}_${activeFilter?.lga || ''}_${activeFilter?.ward || ''}_${category}_${searchQuery}_${sortOption}`;
    const cacheFile = FileSystem.documentDirectory + `yrdly_events_cache_${filterString.replace(/\W/g, '_')}.json`;
    try {
      if (!isRefresh) {
        const fileInfo = await FileSystem.getInfoAsync(cacheFile);
        if (fileInfo.exists) {
          const cachedData = await FileSystem.readAsStringAsync(cacheFile);
          if (cachedData) setEvents(JSON.parse(cachedData) as Post[]);
        }
      }
    } catch (e) {}
    try {
      let query = supabase
        .from('posts')
        .select('*, users!posts_user_id_fkey(name, avatar_url), attendees:post_attendees(user_id)')
        .eq('category', 'Event')
        .order('created_at', { ascending: false })
        .limit(30);
      if (activeFilter?.ward) query = query.eq('ward', activeFilter.ward);
      else if (activeFilter?.lga) query = query.eq('lga', activeFilter.lga);
      else if (activeFilter?.state) query = query.eq('state', activeFilter.state);
      if (category) query = query.eq('event_category', category);
      if (searchQuery) query = query.ilike('title', `%${searchQuery}%`);
      const { data } = await query;
      if (data) {
        setEvents(data as Post[]);
        try { await FileSystem.writeAsStringAsync(cacheFile, JSON.stringify(data)); } catch (e) {}
      }
    } catch (e) {}
    setLoading(false);
  }, [activeFilter, category, searchQuery, sortOption]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents(true);
    setRefreshing(false);
  }, [fetchEvents]);

  useFocusEffect(useCallback(() => { fetchEvents(); }, [fetchEvents]));

  const featured = events.slice(0, 3);
  const horizontal = events.slice(3, 9);
  const rest = events.slice(9);

  // ── ListHeader MUST be defined before any conditional returns ──
  const listHeaderElement = useMemo(() => (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chipsContent}>
        {EVENT_CATEGORIES.map(cat => {
          const active = category === cat.key;
          return (
            <TouchableOpacity
              key={cat.key} onPress={() => setCategory(active ? '' : cat.key)}
              style={[s.chip, { backgroundColor: active ? colors.tint : colors.card, borderColor: active ? colors.tint : colors.borderLight }]}>
              <Ionicons name={cat.icon as any} size={13} color={active ? '#0B0D0B' : colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[s.chipTxt, { color: active ? '#0B0D0B' : colors.textSecondary }]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {featured.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Upcoming Events</Text>
          </View>
          <ScrollView
            ref={featuredRef}
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            style={{ width: width - 32 }}
            onMomentumScrollEnd={e => setFeaturedIdx(Math.round(e.nativeEvent.contentOffset.x / (width - 32)))}
          >
            {featured.map(item => {
              const imgUrl = item.image_urls?.[0] || item.image_url;
              const d = item.event_date ? new Date(item.event_date) : null;
              const location = typeof item.event_location === 'string'
                ? item.event_location
                : (item.event_location as any)?.address || '';
              return (
                <TouchableOpacity
                  key={item.id} activeOpacity={0.93}
                  onPress={() => navigateToEvent(item)}
                  style={[s.heroCard, { width: width - 32 }]}
                >
                  {imgUrl
                    ? <Image source={{ uri: imgUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={300} />
                    : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0d1a0d' }]} />}
                  <View style={s.heroOverlay} />
                  <View style={s.featBadge}>
                    <Ionicons name="star-outline" size={10} color="#82DB7E" style={{ marginRight: 4 }} />
                    <Text style={s.featBadgeTxt}>Featured Event</Text>
                  </View>
                  <View style={s.heroInfo}>
                    <Text style={s.heroTitle} numberOfLines={2}>{item.title || item.text}</Text>
                    {d && (
                      <View style={s.heroMetaRow}>
                        <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" />
                        <Text style={s.heroMeta}>
                          {d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    )}
                    {!!location && (
                      <View style={s.heroMetaRow}>
                        <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
                        <Text style={s.heroMeta} numberOfLines={1}>{location}</Text>
                      </View>
                    )}
                    <View style={s.heroFooter}>
                      <View style={s.attendeeAvatars}>
                        {(item.attendees?.length || 0) > 0 && (
                          <>
                            <Ionicons name="people" size={14} color="rgba(255,255,255,0.8)" style={{ marginRight: 4 }} />
                            <Text style={s.aCount}>{item.attendees?.length} attending</Text>
                          </>
                        )}
                      </View>
                      <TouchableOpacity style={s.heroCTA} onPress={() => navigateToEvent(item)}>
                        <Text style={s.heroCTATxt}>View Tickets</Text>
                        <Ionicons name="chevron-forward" size={14} color="#0B0D0B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {featured.length > 1 && (
            <View style={s.dots}>
              {featured.map((_, i) => (
                <View key={i} style={[s.dot, { backgroundColor: i === featuredIdx ? colors.tint : colors.borderLight }]} />
              ))}
            </View>
          )}
        </View>
      )}

      {horizontal.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>More Events For You</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {horizontal.map(item => (
              <EventCardCompact key={item.id} event={item} onPress={() => navigateToEvent(item)} />
            ))}
          </ScrollView>
        </View>
      )}

      <TouchableOpacity
        style={[s.createBanner, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
        onPress={() => router.push({ pathname: '/new-post', params: { category: 'Event' } } as any)}>
        <View style={[s.createIcon, { backgroundColor: 'rgba(130,219,126,0.1)' }]}>
          <Ionicons name="calendar-outline" size={24} color={colors.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.createTitle, { color: colors.text }]}>Can't find your event?</Text>
          <Text style={[s.createSub, { color: colors.textMuted }]}>Create and share events with your community.</Text>
        </View>
        <TouchableOpacity style={[s.createCTA, { backgroundColor: colors.tint }]} onPress={() => router.push({ pathname: '/new-post', params: { category: 'Event' } } as any)}>
          <Text style={s.createCTATxt}>Create Event</Text>
          <Ionicons name="add-circle-outline" size={14} color="#0B0D0B" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </TouchableOpacity>

      {rest.length > 0 && (
        <Text style={[s.sectionTitle, { color: colors.text, paddingHorizontal: 16, marginBottom: 8 }]}>All Events</Text>
      )}
    </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [featured, horizontal, rest, featuredIdx, category, colors]);

  // ── Conditional returns AFTER all hooks ──
  if (loading && events.length === 0) {
    return (
      <View style={{ flex: 1, paddingTop: 16 }}>
        <Skeleton width={width - 32} height={220} style={{ marginHorizontal: 16, borderRadius: 24, marginBottom: 16 }} />
        <PostSkeleton /><PostSkeleton />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={s.empty}>
        <Ionicons name="calendar-outline" size={52} color={colors.textMuted} style={{ opacity: 0.35, marginBottom: 14 }} />
        <Text style={[s.emptyTxt, { color: colors.textMuted }]}>
          {searchQuery ? `No events found for "${searchQuery}"` : 'No upcoming events in your area'}
        </Text>
        <TouchableOpacity
          style={[s.createBtn, { backgroundColor: colors.tint }]}
          onPress={() => router.push({ pathname: '/new-post', params: { category: 'Event' } } as any)}>
          <Ionicons name="add-circle-outline" size={16} color="#0B0D0B" style={{ marginRight: 6 }} />
          <Text style={s.createBtnTxt}>Create Event</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={rest}
      keyExtractor={i => `rest-${i.id}`}
      ref={listRef}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      contentContainerStyle={s.listContent}
      renderItem={({ item }) => (
        <EventCard event={item} onPress={() => navigateToEvent(item)} />
      )}
      ListHeaderComponent={listHeaderElement}
    />
  );
}

const s = StyleSheet.create({
  listContent: { paddingBottom: 100 },
  chipsScroll: { marginBottom: 16 },
  chipsContent: { paddingHorizontal: 16, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipTxt: { fontSize: 12, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  seeAll: { fontSize: 13, fontWeight: '700' },
  heroCard: { height: 260, borderRadius: 24, overflow: 'hidden', marginHorizontal: 0, position: 'relative' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  featBadge: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(130,219,126,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(130,219,126,0.3)' },
  featBadgeTxt: { color: '#82DB7E', fontSize: 11, fontWeight: '800' },
  heroInfo: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 4, lineHeight: 26 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  heroMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 12, flex: 1 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  attendeeAvatars: { flexDirection: 'row', alignItems: 'center' },
  aCount: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginLeft: 6 },
  heroCTA: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#82DB7E', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, gap: 4 },
  heroCTATxt: { color: '#0B0D0B', fontWeight: '800', fontSize: 13 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  createBanner: { marginHorizontal: 16, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, marginBottom: 24 },
  createIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  createTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  createSub: { fontSize: 12 },
  createCTA: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16 },
  createCTATxt: { color: '#0B0D0B', fontWeight: '800', fontSize: 12 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, paddingTop: 80 },
  emptyTxt: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  createBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 },
  createBtnTxt: { color: '#0B0D0B', fontWeight: '800', fontSize: 14 },
});
