import React, { useState, useCallback, useRef } from 'react';
import {
  View, StyleSheet, FlatList, Text, RefreshControl, ScrollView,
  TouchableOpacity, Dimensions, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { EventCard, EventCardCompact } from './EventCard';
import { Skeleton, PostSkeleton } from './Skeleton';
import { supabase } from '../lib/supabase';
import { Post } from '../types';
import { formatPrice } from '../lib/utils';
import { useRouter, useFocusEffect } from 'expo-router';
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
    try {
      let query = supabase
        .from('posts')
        .select('*')
        .eq('category', 'Event');

      if (activeFilter?.state) query = query.eq('state', activeFilter.state);
      if (activeFilter?.lga) query = query.eq('lga', activeFilter.lga);
      if (activeFilter?.ward) query = query.eq('ward', activeFilter.ward);
      if (category) query = query.ilike('sub_category', `%${category}%`);
      if (searchQuery) query = query.or(`title.ilike.%${searchQuery}%,text.ilike.%${searchQuery}%`);

      if (sortOption === 'price_asc') query = query.order('price', { ascending: true });
      else if (sortOption === 'price_desc') query = query.order('price', { ascending: false });
      else query = query.order('event_date', { ascending: true });

      const { data, error } = await query.limit(30);
      if (error) throw error;

      const valid = ((data as Post[]) || []).filter(p =>
        p.event_date ? new Date(p.event_date).getTime() >= Date.now() : false
      );
      setEvents(valid);
    } catch (e) { console.error('Error fetching events:', e); }
    finally { if (!isRefresh) setLoading(false); }
  }, [searchQuery, sortOption, activeFilter, category]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents(true);
    setRefreshing(false);
  }, [fetchEvents]);

  useFocusEffect(useCallback(() => { fetchEvents(); }, [fetchEvents]));

  const featured = events.slice(0, 3);     // Hero carousel
  const horizontal = events.slice(3, 9);   // "More Events For You"
  const rest = events.slice(9);            // Full cards list

  if (loading) {
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
          onPress={() => router.push('/create' as any)}>
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
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      contentContainerStyle={s.listContent}
      renderItem={({ item }) => (
        <EventCard event={item} onPress={() => navigateToEvent(item)} />
      )}
      ListHeaderComponent={() => (
        <>
          {/* ── Category chips ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chipsContent}>
            {EVENT_CATEGORIES.map(cat => {
              const active = category === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key} onPress={() => setCategory(cat.key)}
                  style={[s.chip, { backgroundColor: active ? colors.tint : colors.card, borderColor: active ? colors.tint : colors.borderLight }]}>
                  <Ionicons name={cat.icon as any} size={13} color={active ? '#0B0D0B' : colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[s.chipTxt, { color: active ? '#0B0D0B' : colors.textSecondary }]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Upcoming Events featured carousel ── */}
          {featured.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>Upcoming Events</Text>
                <TouchableOpacity>
                  <Text style={[s.seeAll, { color: colors.tint }]}>See all  ›</Text>
                </TouchableOpacity>
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
                  const location = typeof item.event_location === 'string' ? item.event_location : (item.event_location as any)?.address || '';
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.93}
                      onPress={() => navigateToEvent(item)}
                      style={[s.heroCard, { width: width - 32 }]}
                    >
                      {imgUrl
                        ? <Image source={{ uri: imgUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={300} />
                        : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0d1a0d' }]} />}
                      <View style={s.heroOverlay} />

                      {/* Featured badge */}
                      <View style={s.featBadge}>
                        <Ionicons name="star-outline" size={10} color="#82DB7E" style={{ marginRight: 4 }} />
                        <Text style={s.featBadgeTxt}>Featured Event</Text>
                      </View>

                      {/* Info overlay */}
                      <View style={s.heroInfo}>
                        <Text style={s.heroTitle} numberOfLines={2}>{item.title || item.text}</Text>
                        {item.text && item.title && (
                          <Text style={s.heroTagline}>{item.text.toUpperCase()}</Text>
                        )}
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
                        {/* Attendee row */}
                        <View style={s.heroFooter}>
                          <View style={s.attendeeAvatars}>
                            {[0, 1, 2].map(i => (
                              <View key={i} style={[s.aAvatar, { marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i, backgroundColor: '#82DB7E' }]}>
                                <Ionicons name="person" size={10} color="#0B0D0B" />
                              </View>
                            ))}
                            <Text style={s.aCount}>+{Math.floor(Math.random() * 40) + 10}</Text>
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

              {/* Dots */}
              {featured.length > 1 && (
                <View style={s.dots}>
                  {featured.map((_, i) => (
                    <View key={i} style={[s.dot, { backgroundColor: i === featuredIdx ? colors.tint : colors.borderLight }]} />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── More Events For You (horizontal) ── */}
          {horizontal.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>More Events For You</Text>
                <TouchableOpacity>
                  <Text style={[s.seeAll, { color: colors.tint }]}>See all  ›</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                {horizontal.map(item => (
                  <EventCardCompact key={item.id} event={item} onPress={() => navigateToEvent(item)} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Can't find your event? ── */}
          <TouchableOpacity
            style={[s.createBanner, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            onPress={() => router.push('/create' as any)}>
            <View style={[s.createIcon, { backgroundColor: 'rgba(130,219,126,0.1)' }]}>
              <Ionicons name="calendar-outline" size={24} color={colors.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.createTitle, { color: colors.text }]}>Can't find your event?</Text>
              <Text style={[s.createSub, { color: colors.textMuted }]}>Create and share events with your community.</Text>
            </View>
            <TouchableOpacity style={[s.createCTA, { backgroundColor: colors.tint }]} onPress={() => router.push('/create' as any)}>
              <Text style={s.createCTATxt}>Create Event</Text>
              <Ionicons name="add-circle-outline" size={14} color="#0B0D0B" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Rest header */}
          {rest.length > 0 && (
            <Text style={[s.sectionTitle, { color: colors.text, paddingHorizontal: 16, marginBottom: 8 }]}>All Events</Text>
          )}
        </>
      )}
      ListEmptyComponent={rest.length === 0 && events.length > 0 ? null : null}
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
  heroTagline: { color: '#82DB7E', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  heroMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 12, flex: 1 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  attendeeAvatars: { flexDirection: 'row', alignItems: 'center' },
  aAvatar: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(0,0,0,0.6)' },
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
