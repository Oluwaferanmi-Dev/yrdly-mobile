import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Modal,
  TouchableWithoutFeedback, ScrollView, Dimensions, Animated, FlatList,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { G, DARK, GLASS_BG, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY, GOLD, BLUE } from '../../constants/tokens';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocation } from '../../context/LocationContext';
import { MarketplaceItemCard } from '../../components/MarketplaceItemCard';
import { Skeleton } from '../../components/Skeleton';
import { Post, User, Business } from '../../types';
import { formatPrice, getDistanceStr } from '../../lib/utils';
import { useNotificationBadge } from '../../context/NotificationBadgeContext';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');
type TabType = 'Discover' | 'Marketplace' | 'Events' | 'Businesses';
const TABS: { key: TabType; label: string }[] = [
  { key: 'Discover', label: 'Discover' },
  { key: 'Marketplace', label: 'Marketplace' },
  { key: 'Events', label: 'Events' },
  { key: 'Businesses', label: 'Business' },
];

const CATS = ['All', 'Fashion', 'Electronics', 'Home & Living', 'Vehicles', 'Food', 'Beauty', 'Services'];

// ─── DISCOVER SECTION ────────────────────────────────────────────────────────
function DiscoverSection({ currentLoc }: { currentLoc: Location.LocationObject | null }) {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<string[]>([]);

  useEffect(() => {
    async function fetchUsers() {
      if (!user) return;
      const { data } = await supabase.from('users').select('*').neq('id', user.id).limit(20);
      if (data) setUsers(data as User[]);
      setLoading(false);
    }
    fetchUsers();
  }, [user]);

  const toggleConnect = (id: string) => {
    setConnected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const nearby = users.slice(0, Math.floor(users.length / 3));
  const mutuals = users.slice(Math.floor(users.length / 3), Math.floor(users.length / 3) * 2);
  const sellers = users.slice(Math.floor(users.length / 3) * 2);

  if (loading) return <ActivityIndicator color={G} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={s.sectionContainer} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Nearby */}
      {nearby.length > 0 && (
        <View style={s.discoverGroup}>
          <Text style={s.discoverGroupTitle}>NEARBY PEOPLE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
            {nearby.map(p => {
              const avatar = p.avatar_url && !p.avatar_url.startsWith('file://') ? { uri: p.avatar_url } : null;
              return (
                <View key={p.id} style={s.nearbyCard}>
                  <View style={s.nearbyAvatarWrap}>
                    {avatar ? (
                      <Image source={avatar} style={s.nearbyAvatar} contentFit="cover" />
                    ) : (
                      <View style={[s.nearbyAvatar, { backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ color: '#fff', fontSize: 24, fontFamily: 'Outfit-Bold' }}>{(p.name || '?')[0].toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.nearbyInfo}>
                    <Text style={s.nearbyName} numberOfLines={1}>{p.name.split(' ')[0]}</Text>
                    <Text style={s.nearbyHandle} numberOfLines={1}>@{p.name.replace(/\s+/g, '').toLowerCase()}</Text>
                    <View style={s.nearbyDistRow}>
                      <Ionicons name="location" size={11} color={LABEL} />
                      <Text style={s.nearbyDistText}>
                        {getDistanceStr(
                          currentLoc?.coords.latitude, 
                          currentLoc?.coords.longitude, 
                          p.currentLocation?.lat, 
                          p.currentLocation?.lng
                        )}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[s.connectBtn, connected.includes(p.id) && s.connectBtnActive]}
                    onPress={() => toggleConnect(p.id)}
                  >
                    <Text style={[s.connectBtnText, connected.includes(p.id) && s.connectBtnTextActive]}>
                      {connected.includes(p.id) ? '✓ Sent' : 'Connect'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Mutuals */}
      {mutuals.length > 0 && (
        <View style={s.discoverGroup}>
          <Text style={s.discoverGroupTitle}>PEOPLE YOU MAY KNOW</Text>
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            {mutuals.map(p => {
              const avatar = p.avatar_url && !p.avatar_url.startsWith('file://') ? { uri: p.avatar_url } : null;
              return (
                <View key={p.id} style={s.mutualRow}>
                  <View style={s.mutualAvatarWrap}>
                    {avatar ? (
                      <Image source={avatar} style={s.mutualAvatar} contentFit="cover" />
                    ) : (
                      <View style={[s.mutualAvatar, { backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Outfit-Bold' }}>{(p.name || '?')[0].toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.mutualInfo}>
                    <Text style={s.mutualName}>{p.name}</Text>
                    <Text style={s.mutualSub}>@{p.name.replace(/\s+/g, '').toLowerCase()} · {p.location?.state || 'Lagos'}</Text>
                    <Text style={s.mutualMeta}>Followed by 1 mutual</Text>
                  </View>
                  <TouchableOpacity 
                    style={[s.connectBtnSmall, connected.includes(p.id) && s.connectBtnActive]}
                    onPress={() => toggleConnect(p.id)}
                  >
                    <Text style={[s.connectBtnText, connected.includes(p.id) && s.connectBtnTextActive]}>
                      {connected.includes(p.id) ? '✓' : 'Connect'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Sellers */}
      {sellers.length > 0 && (
        <View style={s.discoverGroup}>
          <Text style={s.discoverGroupTitle}>ACTIVE SELLERS</Text>
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            {sellers.map(p => {
              const avatar = p.avatar_url && !p.avatar_url.startsWith('file://') ? { uri: p.avatar_url } : null;
              return (
                <View key={p.id} style={s.mutualRow}>
                  <View style={s.mutualAvatarWrap}>
                    {avatar ? (
                      <Image source={avatar} style={s.mutualAvatar} contentFit="cover" />
                    ) : (
                      <View style={[s.mutualAvatar, { backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Outfit-Bold' }}>{(p.name || '?')[0].toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.mutualInfo}>
                    <Text style={s.mutualName}>{p.name}</Text>
                    <Text style={s.mutualSub}>Active seller · 3 listings</Text>
                  </View>
                  <TouchableOpacity 
                    style={s.viewBtnSmall}
                    onPress={() => router.push(`/profile/${p.id}` as any)}
                  >
                    <Text style={s.viewBtnText}>View</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ─── MARKETPLACE SECTION ─────────────────────────────────────────────────────
function MarketplaceSection({ currentLoc }: { currentLoc: Location.LocationObject | null }) {
  const router = useRouter();
  const [category, setCategory] = useState('All');
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    async function fetchItems() {
      let q = supabase.from('posts').select('*, user:users!posts_user_id_fkey(id,name,avatar_url)').eq('category', 'For Sale').or('is_sold.eq.false,is_sold.is.null');
      if (category !== 'All') {
        q = q.ilike('sub_category', `%${category}%`);
      }
      const { data } = await q.limit(40).order('timestamp', { ascending: false });
      if (data) setItems(data as Post[]);
      setLoading(false);
    }
    fetchItems();
  }, [category]);

  return (
    <View style={s.sectionContainer}>
      <View style={s.marketplaceToolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
          {CATS.map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[s.marketplaceCatBtn, category === cat && s.marketplaceCatBtnActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[s.marketplaceCatText, category === cat && s.marketplaceCatTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={s.filterBtn} onPress={() => setShowFilter(true)}>
          <Ionicons name="options-outline" size={18} color={MUTED} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={G} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.marketplaceCard} onPress={() => router.push(`/marketplace/${item.id}` as any)} activeOpacity={0.9}>
              <View style={s.marketplaceCardImgWrap}>
                <Image source={{ uri: Array.isArray(item.image_urls) ? item.image_urls[0] : item.image_url }} style={s.marketplaceCardImg} contentFit="cover" />
                <View style={s.marketplaceCardSave}>
                  <Ionicons name="heart-outline" size={16} color="#fff" />
                </View>
                <View style={s.marketplaceCardCond}>
                  <Text style={s.marketplaceCardCondText}>{item.condition || 'Good'}</Text>
                </View>
              </View>
              <Text style={s.marketplaceCardTitle} numberOfLines={1}>{item.title || item.text}</Text>
              <Text style={s.marketplaceCardPrice}>{formatPrice(item.price || 0)}</Text>
              <View style={s.marketplaceCardSeller}>
                <View style={s.marketplaceCardAvatarWrap}>
                  <Image source={{ uri: item.user?.avatar_url }} style={s.marketplaceCardAvatar} />
                </View>
                <Text style={s.marketplaceCardArea} numberOfLines={1}>{item.user?.location?.lga || 'Lagos'}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
              <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 17, color: '#fff', marginBottom: 12 }}>Nothing nearby yet</Text>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 14, color: LABEL, textAlign: 'center', lineHeight: 22, marginBottom: 16 }}>Be the first to list something in your neighbourhood.</Text>
            </View>
          }
        />
      )}

      {/* Basic Filter Sheet placeholder - fully functional implementation will require Animated / Modal */}
      <Modal visible={showFilter} transparent animationType="slide">
        <View style={s.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowFilter(false)}><View style={{flex: 1}}/></TouchableWithoutFeedback>
          <View style={s.sheetContent}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}><Text style={s.sheetReset}>Reset</Text></TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <TouchableOpacity style={s.applyBtn} onPress={() => setShowFilter(false)}>
                <Text style={s.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── EVENTS SECTION ──────────────────────────────────────────────────────────
function EventsSection({ currentLoc }: { currentLoc: Location.LocationObject | null }) {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const EVENT_FILTERS = ['All', 'Today', 'This Week', 'Weekend', 'Community', 'Music', 'Food', 'Sports'];
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    async function fetchEvents() {
      const { data } = await supabase.from('events').select('*').limit(20).order('date', { ascending: true });
      if (data) setEvents(data);
      setLoading(false);
    }
    fetchEvents();
  }, []);

  return (
    <View style={s.sectionContainer}>
      <View style={s.eventsToolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
          {EVENT_FILTERS.map(f => (
            <TouchableOpacity 
              key={f} 
              style={[s.marketplaceCatBtn, filter === f && s.marketplaceCatBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.marketplaceCatText, filter === f && s.marketplaceCatTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={G} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={i => i.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.eventCard} onPress={() => router.push(`/events/${item.id}` as any)} activeOpacity={0.9}>
              <View style={s.eventCardImgWrap}>
                <Image source={{ uri: item.image_url }} style={s.eventCardImg} contentFit="cover" />
                <View style={s.eventCardGradient} />
                <View style={s.eventCardDate}>
                  <Text style={s.eventCardDateText}>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                </View>
                <View style={s.eventCardSave}>
                  <Ionicons name="bookmark-outline" size={16} color="#fff" />
                </View>
                <View style={s.eventCardPrice}>
                  <Text style={s.eventCardPriceText}>{item.is_free ? 'FREE' : formatPrice(item.price || 0)}</Text>
                </View>
              </View>
              <View style={s.eventCardInfo}>
                <Text style={s.eventCardTitle} numberOfLines={1}>{item.title}</Text>
                <View style={s.eventCardMetaRow}>
                  <View style={s.eventCardMetaItem}>
                    <Ionicons name="time-outline" size={12} color={LABEL} />
                    <Text style={s.eventCardMetaText}>{item.time || '10:00 AM'}</Text>
                  </View>
                  <View style={s.eventCardMetaItem}>
                    <Ionicons name="location-outline" size={12} color={LABEL} />
                    <Text style={s.eventCardMetaText}>{item.location || 'Lagos'}</Text>
                  </View>
                  <View style={s.eventCardMetaItem}>
                    <Ionicons name="people-outline" size={12} color={LABEL} />
                    <Text style={s.eventCardMetaText}>{item.attendees?.length || 0} going</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ─── PLACES SECTION ──────────────────────────────────────────────────────────
function PlacesSection({ currentLoc }: { currentLoc: Location.LocationObject | null }) {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const PLACE_CATS = ['All', 'Restaurants', 'Cafés', 'Shopping', 'Beauty', 'Health', 'Services', 'Gyms'];
  const [category, setCategory] = useState('All');

  useEffect(() => {
    async function fetchPlaces() {
      let q = supabase.from('businesses').select('*');
      if (category !== 'All') {
        q = q.ilike('category', `%${category}%`);
      }
      const { data } = await q.limit(20);
      if (data) setBusinesses(data as Business[]);
      setLoading(false);
    }
    fetchPlaces();
  }, [category]);

  return (
    <View style={s.sectionContainer}>
      <View style={s.eventsToolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
          {PLACE_CATS.map(c => (
            <TouchableOpacity 
              key={c} 
              style={[s.marketplaceCatBtn, category === c && s.marketplaceCatBtnActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[s.marketplaceCatText, category === c && s.marketplaceCatTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={G} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={i => i.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.placeRow} onPress={() => router.push(`/businesses/${item.id}` as any)} activeOpacity={0.9}>
              <View style={s.placePhotoWrap}>
                <Image source={{ uri: item.cover_image || item.logo }} style={s.placePhoto} contentFit="cover" />
              </View>
              <View style={s.placeInfo}>
                <View style={s.placeTitleRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                    <Text style={s.placeName} numberOfLines={1}>{item.name}</Text>
                    {/* Placeholder for verified badge */}
                    <Ionicons name="checkmark-circle" size={14} color={G} />
                  </View>
                  <Ionicons name="heart-outline" size={16} color={LABEL} style={{ marginLeft: 8 }} />
                </View>
                <Text style={s.placeCategory}>{item.category || 'Business'}</Text>
                <View style={s.placeMetaRow}>
                  <View style={s.placeMetaItem}>
                    <Ionicons name="star" size={12} color={GOLD} />
                    <Text style={s.placeRating}>{item.rating?.toFixed(1) || '4.0'}</Text>
                  </View>
                  <Text style={s.placeDistText}>
                    {getDistanceStr(
                      currentLoc?.coords.latitude,
                      currentLoc?.coords.longitude,
                      item.location?.geopoint?.latitude ?? (item.location as any)?.lat,
                      item.location?.geopoint?.longitude ?? (item.location as any)?.lng
                    )}
                  </Text>
                  <View style={s.placeOpenPill}>
                    <Text style={s.placeOpenText}>OPEN</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ─── MAIN EXPLORE TAB ────────────────────────────────────────────────────────
export default function CatalogTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const { unreadCount } = useNotificationBadge();
  const [activeTab, setActiveTab] = useState<TabType>('Discover');
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [currentLoc, setCurrentLoc] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCurrentLoc(l);
    })();
  }, []);

  const formattedLocation = useMemo(() => {
    if (!profile?.location) return 'Victoria Island, Lagos';
    const loc = profile.location;
    const parts = [loc.ward || loc.city, loc.lga, loc.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Neighbourhood';
  }, [profile?.location]);

  return (
    <View style={[s.root, { backgroundColor: DARK, paddingTop: insets.top }]}>
      
      {/* ── Header ── */}
      <View style={s.header}>
        {showSearch ? (
          <View style={s.searchBarContainer}>
            <View style={s.searchInputWrap}>
              <Ionicons name="search-outline" size={16} color={LABEL} style={{ marginRight: 8 }} />
              <TextInput
                autoFocus
                value={search}
                onChangeText={setSearch}
                placeholder="Search people, listings, events..."
                placeholderTextColor={MUTED}
                style={s.searchInput}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={LABEL} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearch(''); }}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View>
              <Text style={s.title}>Explore</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons name="location-outline" size={13} color={LABEL} />
                <Text style={s.subtitle}>{formattedLocation}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity style={s.headerIconBtn} onPress={() => setShowSearch(true)}>
                <Ionicons name="search-outline" size={18} color={TEXT_PRIMARY} />
              </TouchableOpacity>
              <TouchableOpacity style={s.headerIconBtn} onPress={() => router.push('/notifications' as any)}>
                <Ionicons name="notifications-outline" size={18} color={TEXT_PRIMARY} />
                {unreadCount > 0 && <View style={s.badgeDot} />}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* ── Section Pills ── */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 16 }}
        >
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[s.sectionPill, isSelected && s.sectionPillSelected]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[s.sectionPillText, isSelected && s.sectionPillTextSelected]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Tab Content ── */}
      {activeTab === 'Discover' && <DiscoverSection currentLoc={currentLoc} />}
      {activeTab === 'Marketplace' && <MarketplaceSection currentLoc={currentLoc} />}
      {activeTab === 'Events' && <EventsSection currentLoc={currentLoc} />}
      {activeTab === 'Businesses' && <PlacesSection currentLoc={currentLoc} />}

    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: { fontFamily: 'Outfit-ExtraBold', fontSize: 24, color: '#FFFFFF' },
  subtitle: { fontFamily: 'Inter-Medium', fontSize: 13, color: LABEL },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#111', borderWidth: 1, borderColor: GLASS_BORDER,
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  badgeDot: {
    position: 'absolute', top: 8, right: 8, width: 8, height: 8,
    borderRadius: 4, backgroundColor: G, borderWidth: 1.5, borderColor: DARK,
  },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111', borderWidth: 1, borderColor: GLASS_BORDER,
    borderRadius: 14, paddingHorizontal: 14, height: 42,
  },
  searchInput: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, color: '#FFFFFF' },
  cancelText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: G },
  
  // Section Pills
  sectionPill: {
    height: 36, paddingHorizontal: 18, borderRadius: 18,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: GLASS_BORDER,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionPillSelected: { backgroundColor: G, borderColor: G },
  sectionPillText: { fontFamily: 'Inter-Regular', fontSize: 13, color: LABEL },
  sectionPillTextSelected: { fontFamily: 'Inter-Bold', color: DARK },
  
  sectionContainer: { flex: 1 },

  // Discover Section
  discoverGroup: { marginBottom: 24 },
  discoverGroupTitle: {
    fontFamily: 'Inter-Bold', fontSize: 11, color: LABEL,
    letterSpacing: 1.2, paddingHorizontal: 20, marginBottom: 12,
  },
  nearbyCard: {
    width: 155, backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 20,
    alignItems: 'center',
  },
  nearbyAvatarWrap: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 2, borderColor: 'rgba(130,219,126,0.25)', overflow: 'hidden',
    marginBottom: 12,
  },
  nearbyAvatar: { width: '100%', height: '100%' },
  nearbyInfo: { alignItems: 'center', marginBottom: 12 },
  nearbyName: { fontFamily: 'Outfit-Bold', fontSize: 14, color: '#fff' },
  nearbyHandle: { fontFamily: 'Inter-Regular', fontSize: 11, color: LABEL, marginBottom: 4 },
  nearbyDistRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nearbyDistText: { fontFamily: 'Inter-Regular', fontSize: 11, color: LABEL },
  connectBtn: {
    width: '100%', height: 34, borderRadius: 17,
    backgroundColor: 'rgba(130,219,126,0.08)', borderWidth: 1, borderColor: 'rgba(130,219,126,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  connectBtnActive: { backgroundColor: 'rgba(130,219,126,0.15)', borderColor: 'rgba(130,219,126,0.4)' },
  connectBtnText: { fontFamily: 'Inter-Bold', fontSize: 13, color: G },
  connectBtnTextActive: { color: G },
  
  mutualRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER,
    borderRadius: 20,
  },
  mutualAvatarWrap: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  mutualAvatar: { width: '100%', height: '100%' },
  mutualInfo: { flex: 1 },
  mutualName: { fontFamily: 'Outfit-Bold', fontSize: 14, color: '#fff' },
  mutualSub: { fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL, marginTop: 2 },
  mutualMeta: { fontFamily: 'Inter-Regular', fontSize: 11, color: MUTED, marginTop: 4 },
  connectBtnSmall: {
    height: 34, paddingHorizontal: 14, borderRadius: 17,
    backgroundColor: 'rgba(130,219,126,0.07)', borderWidth: 1, borderColor: 'rgba(130,219,126,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  viewBtnSmall: {
    height: 34, paddingHorizontal: 14, borderRadius: 17,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER,
    justifyContent: 'center', alignItems: 'center',
  },
  viewBtnText: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED },

  // Marketplace Section
  marketplaceToolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  marketplaceCatBtn: {
    height: 32, paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: GLASS_BORDER,
    justifyContent: 'center', alignItems: 'center',
  },
  marketplaceCatBtnActive: { backgroundColor: G, borderColor: G },
  marketplaceCatText: { fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL },
  marketplaceCatTextActive: { fontFamily: 'Inter-Bold', color: DARK },
  filterBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#111',
    borderWidth: 1, borderColor: GLASS_BORDER, justifyContent: 'center', alignItems: 'center',
  },
  
  marketplaceCard: { width: (width - 40 - 16) / 2 },
  marketplaceCardImgWrap: {
    width: '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden',
    position: 'relative', marginBottom: 8,
  },
  marketplaceCardImg: { width: '100%', height: '100%' },
  marketplaceCardSave: {
    position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center',
  },
  marketplaceCardCond: {
    position: 'absolute', bottom: 8, left: 8, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.55)',
  },
  marketplaceCardCondText: { fontFamily: 'Inter-SemiBold', fontSize: 10, color: '#fff' },
  marketplaceCardTitle: { fontFamily: 'Outfit-SemiBold', fontSize: 13, color: '#fff', marginBottom: 2 },
  marketplaceCardPrice: { fontFamily: 'Outfit-ExtraBold', fontSize: 15, color: G, marginBottom: 4 },
  marketplaceCardSeller: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  marketplaceCardAvatarWrap: { width: 16, height: 16, borderRadius: 8, overflow: 'hidden' },
  marketplaceCardAvatar: { width: '100%', height: '100%' },
  marketplaceCardArea: { fontFamily: 'Inter-Regular', fontSize: 11, color: LABEL, flex: 1 },

  // Events Section
  eventsToolbar: { paddingBottom: 16 },
  eventCard: {
    width: '100%', backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER,
    borderRadius: 24, overflow: 'hidden',
  },
  eventCardImgWrap: { width: '100%', height: 160, position: 'relative' },
  eventCardImg: { width: '100%', height: '100%' },
  eventCardGradient: { position: 'absolute', inset: 0, backgroundColor: 'rgba(5,5,5,0.75)', top: '40%' },
  eventCardDate: {
    position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  eventCardDateText: { fontFamily: 'Outfit-Bold', fontSize: 12, color: '#fff' },
  eventCardSave: {
    position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center',
  },
  eventCardPrice: {
    position: 'absolute', bottom: 12, right: 12, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 8, backgroundColor: 'rgba(130,219,126,0.18)', borderWidth: 1, borderColor: 'rgba(130,219,126,0.28)',
  },
  eventCardPriceText: { fontFamily: 'Inter-Bold', fontSize: 11, color: G },
  eventCardInfo: { paddingHorizontal: 16, paddingVertical: 14 },
  eventCardTitle: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#fff', marginBottom: 6 },
  eventCardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  eventCardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventCardMetaText: { fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL },

  // Places Section
  placeRow: {
    flexDirection: 'row', backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER,
    borderRadius: 20, overflow: 'hidden',
  },
  placePhotoWrap: { width: 96, height: 96, flexShrink: 0 },
  placePhoto: { width: '100%', height: '100%' },
  placeInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  placeTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  placeName: { fontFamily: 'Outfit-Bold', fontSize: 14, color: '#fff' },
  placeCategory: { fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL, marginBottom: 8 },
  placeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  placeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  placeRating: { fontFamily: 'Outfit-Bold', fontSize: 12, color: '#fff' },
  placeDistText: { fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL },
  placeOpenPill: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
    backgroundColor: 'rgba(130,219,126,0.1)', borderWidth: 1, borderColor: 'rgba(130,219,126,0.2)',
  },
  placeOpenText: { fontFamily: 'Inter-Bold', fontSize: 10, color: G },

  // Bottom Sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  sheetContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0A0A0A', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center', marginTop: 14, marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  sheetTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  sheetReset: { fontFamily: 'Inter-Regular', fontSize: 13, color: LABEL },
  applyBtn: { backgroundColor: G, borderRadius: 16, height: 50, justifyContent: 'center', alignItems: 'center' },
  applyBtnText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: DARK },
});
