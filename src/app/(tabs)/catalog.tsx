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
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocation } from '../../context/LocationContext';
import { MarketplaceItemCard } from '../../components/MarketplaceItemCard';
import { EventList } from '../../components/EventList';
import { Skeleton } from '../../components/Skeleton';
import { BusinessHub } from '../../components/BusinessHub';
import { Post } from '../../types';
import { formatPrice } from '../../lib/utils';
import { useNotificationBadge } from '../../context/NotificationBadgeContext';

const { width } = Dimensions.get('window');
type TabType = 'Discover' | 'Marketplace' | 'Events' | 'Businesses';
const TABS: { key: TabType; label: string }[] = [
  { key: 'Discover', label: 'Discover' },
  { key: 'Marketplace', label: 'Marketplace' },
  { key: 'Events', label: 'Events' },
  { key: 'Businesses', label: 'Business' },
];

const CATEGORIES = [
  { key: '', label: 'All', icon: 'apps-outline' },
  { key: 'Electronics', label: 'Electronics', icon: 'phone-portrait-outline' },
  { key: 'Fashion', label: 'Fashion', icon: 'shirt-outline' },
  { key: 'Home & Living', label: 'Home & Living', icon: 'home-outline' },
  { key: 'Gaming', label: 'Gaming', icon: 'game-controller-outline' },
  { key: 'Books', label: 'Books', icon: 'book-outline' },
  { key: 'Beauty', label: 'Beauty', icon: 'sparkles-outline' },
  { key: 'Vehicles', label: 'Vehicles', icon: 'car-outline' },
];

export default function CatalogTab() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { activeFilter } = useLocation();
  const { unreadCount } = useNotificationBadge();

  const [activeTab, setActiveTab] = useState<TabType>('Discover');
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredIdx, setFeaturedIdx] = useState(0);

  const formattedLocation = useMemo(() => {
    if (!profile?.location) return 'Victoria Island, Lagos';
    const loc = profile.location;
    const parts = [loc.ward || loc.city, loc.lga, loc.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Neighbourhood';
  }, [profile?.location]);

  // Data fetching
  const fetchItems = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    try {
      let q = supabase
        .from('posts')
        .select('*, user:users!posts_user_id_fkey(id,name,avatar_url)')
        .eq('category', 'For Sale')
        .or('is_sold.eq.false,is_sold.is.null');

      if (activeFilter?.state) q = q.eq('state', activeFilter.state);
      if (activeFilter?.lga)   q = q.eq('lga', activeFilter.lga);
      if (activeFilter?.ward)  q = q.eq('ward', activeFilter.ward);
      if (category)            q = q.ilike('sub_category', `%${category}%`);
      if (search)              q = q.or(`title.ilike.%${search}%,text.ilike.%${search}%`);

      if (sort === 'price_asc')  q = q.order('price', { ascending: true });
      else if (sort === 'price_desc') q = q.order('price', { ascending: false });
      else                      q = q.order('timestamp', { ascending: false });

      const { data, error } = await q.limit(60);
      if (!error && data) {
        setItems(data as Post[]);
      }
    } catch (e) {
      console.error('Fetch marketplace items error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, category, search, sort]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchItems(true);
  }, [fetchItems]);

  const featured = useMemo(() => items.slice(0, 5), [items]);
  const nearby = useMemo(() => items.slice(0), [items]);

  const listHeaderElement = useMemo(() => (
    <>
      {/* Categories Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 12 }}
      >
        {CATEGORIES.map(c => {
          const isSelected = category === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              style={[
                s.categoryChip,
                isSelected && s.categoryChipSelected
              ]}
              onPress={() => setCategory(c.key)}
            >
              <Ionicons name={c.icon as any} size={14} color={isSelected ? DARK : TEXT_PRIMARY} />
              <Text style={[s.categoryChipText, isSelected && s.categoryChipTextSelected]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Featured Items Header */}
      {featured.length > 0 && !category && !search && (
        <View style={{ marginBottom: 16 }}>
          <View style={s.sectionTitleRow}>
            <Text style={s.sectionTitle}>Featured Items</Text>
          </View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
              setFeaturedIdx(idx);
            }}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {featured.map((item) => {
              const imgUrl = Array.isArray(item.image_urls) ? item.image_urls[0] : (item.image_url || null);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[s.featuredCard, { width: width - 40 }]}
                  onPress={() => router.push(`/marketplace/${item.id}` as any)}
                  activeOpacity={0.9}
                >
                  {imgUrl ? (
                    <Image source={{ uri: imgUrl }} style={s.featuredImg} contentFit="cover" />
                  ) : (
                    <View style={[s.featuredImg, s.featuredImgPlaceholder]}>
                      <Ionicons name="bag-handle-outline" size={40} color={MUTED} />
                    </View>
                  )}
                  <View style={s.featuredInfo}>
                    <Text style={s.featuredTitle} numberOfLines={1}>{item.title || item.text}</Text>
                    <Text style={s.featuredPrice}>{item.price === 0 ? 'FREE' : formatPrice(item.price || 0)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Section Title */}
      <View style={s.sectionTitleRow}>
        <Text style={s.sectionTitle}>Nearby Listings</Text>
      </View>
    </>
  ), [featured, category, search, router]);

  return (
    <View style={[s.root, { backgroundColor: DARK, paddingTop: insets.top }]}>
      
      {/* ── Header (Figma 1:1 Matching) ── */}
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
              <TouchableOpacity 
                style={s.headerIconBtn}
                onPress={() => setShowSearch(true)}
              >
                <Ionicons name="search-outline" size={18} color={TEXT_PRIMARY} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={s.headerIconBtn}
                onPress={() => router.push('/notifications' as any)}
              >
                <Ionicons name="notifications-outline" size={18} color={TEXT_PRIMARY} />
                {unreadCount > 0 && (
                  <View style={s.badgeDot} />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* ── Section Pills (Figma 1:1 Matching) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12 }}
      >
        {TABS.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                s.sectionPill,
                isSelected && s.sectionPillSelected
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[s.sectionPillText, isSelected && s.sectionPillTextSelected]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Tab Content ── */}
      {activeTab === 'Discover' && (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={G} />}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={s.listContent}
          ListHeaderComponent={listHeaderElement}
          renderItem={({ item }) => (
            <MarketplaceItemCard
              item={item}
              onPress={() => router.push(`/marketplace/${item.id}` as any)}
            />
          )}
        />
      )}

      {activeTab === 'Marketplace' && (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={G} />}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={s.listContent}
          ListHeaderComponent={listHeaderElement}
          renderItem={({ item }) => (
            <MarketplaceItemCard
              item={item}
              onPress={() => router.push(`/marketplace/${item.id}` as any)}
            />
          )}
        />
      )}

      {activeTab === 'Events' && (
        <EventList />
      )}

      {activeTab === 'Businesses' && (
        <BusinessHub searchQuery={search} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: { fontFamily: 'Outfit-ExtraBold', fontSize: 22, color: '#FFFFFF' },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: G,
    borderWidth: 1.5,
    borderColor: DARK,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#FFFFFF',
  },
  cancelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: G,
  },
  sectionPill: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionPillSelected: {
    backgroundColor: G,
    borderColor: G,
  },
  sectionPillText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: LABEL,
  },
  sectionPillTextSelected: {
    fontFamily: 'Outfit-Bold',
    color: DARK,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  categoryChipSelected: {
    backgroundColor: G,
    borderColor: G,
  },
  categoryChipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: TEXT_PRIMARY,
  },
  categoryChipTextSelected: {
    color: DARK,
    fontFamily: 'Outfit-Bold',
  },
  sectionTitleRow: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  featuredCard: {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    position: 'relative',
  },
  featuredImg: { width: '100%', height: '100%' },
  featuredImgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  featuredInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  featuredTitle: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#FFFFFF' },
  featuredPrice: { fontFamily: 'Outfit-ExtraBold', fontSize: 15, color: G },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
});
