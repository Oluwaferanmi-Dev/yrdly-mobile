import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Modal,
  TouchableWithoutFeedback, ScrollView, Dimensions, Animated, FlatList,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocation } from '../../context/LocationContext';
import { MarketplaceItemCard } from '../../components/MarketplaceItemCard';
import { EventList } from '../../components/EventList';
import { BusinessComingSoon } from '../../components/BusinessComingSoon';
import { Skeleton } from '../../components/Skeleton';
import { Post } from '../../types';
import { formatPrice } from '../../lib/utils';
import { StorageService } from '../../lib/storage-service';

const { width } = Dimensions.get('window');
type TabType = 'Marketplace' | 'Events' | 'Businesses';
const TABS: TabType[] = ['Marketplace', 'Events', 'Businesses'];

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
  const { colors, isDarkMode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { activeFilter } = useLocation();

  const [activeTab, setActiveTab] = useState<TabType>('Marketplace');
  const [search, setSearch] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [category, setCategory] = useState('');
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messagingItem, setMessagingItem] = useState<string | null>(null);
  const [featuredIdx, setFeaturedIdx] = useState(0);

  // Animations
  const tabIndicatorX = useRef(new Animated.Value(0)).current;
  const searchFocus = useRef(new Animated.Value(0)).current;
  const featuredScrollRef = useRef<ScrollView>(null);

  // ─── Data fetching ───────────────────────────────────────────
  const fetchItems = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      let q = supabase
        .from('posts')
        .select('*, user:users!posts_user_id_fkey(id,name,avatar_url,is_verified)')
        .eq('category', 'For Sale')
        .eq('is_sold', false);

      if (activeFilter?.state) q = q.eq('state', activeFilter.state);
      if (activeFilter?.lga)   q = q.eq('lga', activeFilter.lga);
      if (activeFilter?.ward)  q = q.eq('ward', activeFilter.ward);
      if (category)            q = q.ilike('sub_category', `%${category}%`);
      if (search)              q = q.or(`title.ilike.%${search}%,text.ilike.%${search}%`);

      if (sort === 'price_asc')  q = q.order('price', { ascending: true });
      else if (sort === 'price_desc') q = q.order('price', { ascending: false });
      else q = q.order('timestamp', { ascending: false });

      const { data, error } = await q.limit(40);
      if (error) throw error;
      setItems((data as Post[]) || []);
    } catch (e) { console.error(e); }
    finally { if (!isRefresh) setLoading(false); }
  }, [search, sort, category, activeFilter]);

  useFocusEffect(useCallback(() => { fetchItems(); }, [fetchItems]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchItems(true);
    setRefreshing(false);
  }, [fetchItems]);

  const handleMessageSeller = useCallback(async (item: Post) => {
    if (!user) { Alert.alert('Sign in required', 'Please sign in to message the seller.'); return; }
    if (user.id === item.user_id) { Alert.alert("That's your own listing!"); return; }
    setMessagingItem(item.id);
    try {
      const { data: existing } = await supabase.from('conversations').select('id')
        .eq('type', 'marketplace').contains('participant_ids', [user.id, item.user_id])
        .eq('item_id', item.id).limit(1);
      if (existing && existing.length > 0) { router.push({ pathname: '/chat/[id]', params: { id: existing[0].id } }); return; }
      const { data: created, error } = await supabase.from('conversations').insert({
        type: 'marketplace', participant_ids: [user.id, item.user_id],
        item_id: item.id, item_title: item.title || item.text || 'Listing',
        item_image: item.image_urls?.[0] || item.image_url || null,
        item_price: item.price ?? null, last_message_text: '', updated_at: new Date().toISOString(),
      }).select('id').single();
      if (error || !created) throw error ?? new Error('Failed to create conversation');
      router.push({ pathname: '/chat/[id]', params: { id: created.id } });
    } catch (e) { console.error(e); Alert.alert('Error', 'Could not open chat.'); }
    finally { setMessagingItem(null); }
  }, [user, router]);

  // ─── Tab switch animation ────────────────────────────────────
  const TAB_W = (width - 48) / TABS.length;
  const switchTab = (tab: TabType) => {
    const idx = TABS.indexOf(tab);
    setActiveTab(tab);
    Animated.spring(tabIndicatorX, { toValue: idx * TAB_W, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
  };

  const featured = items.slice(0, 3);
  const nearby = items.slice(3);

  const cardBg = isDarkMode ? 'rgba(13,17,23,0.94)' : 'rgba(255,255,255,0.96)';

  return (
    <View style={[s.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={[s.title, { color: colors.text }]}>Explore</Text>
          <Text style={[s.subtitle, { color: colors.textMuted }]}>Discover, buy and sell around you. 💚</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={[s.iconBtn, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            onPress={() => router.push('/map' as any)}>
            <Ionicons name="location-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.iconBtn, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            onPress={() => router.push('/notifications' as any)}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search + Filter ── */}
      <View style={s.searchRow}>
        <Animated.View style={[s.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight, flex: 1 }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Search Yrdly Marketplace..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            onFocus={() => Animated.timing(searchFocus, { toValue: 1, duration: 200, useNativeDriver: false }).start()}
            onBlur={() => Animated.timing(searchFocus, { toValue: 0, duration: 200, useNativeDriver: false }).start()}
          />
        </Animated.View>
        <TouchableOpacity style={[s.filterBtn, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
          onPress={() => setFilterVisible(true)}>
          <Ionicons name="options-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* ── Pill Tabs ── */}
      <View style={[s.tabBar, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <Animated.View style={[s.tabIndicator, { width: TAB_W, transform: [{ translateX: tabIndicatorX }], backgroundColor: colors.tint }]} />
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity key={tab} style={[s.tab, { width: TAB_W }]} onPress={() => switchTab(tab)} activeOpacity={0.7}>
              <Ionicons
                name={tab === 'Marketplace' ? 'bag-outline' : tab === 'Events' ? 'calendar-outline' : 'business-outline'}
                size={14} color={active ? '#0B0D0B' : colors.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text style={[s.tabTxt, { color: active ? '#0B0D0B' : colors.textMuted }]}>{tab}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Marketplace content ── */}
      {activeTab === 'Marketplace' && (
        <FlatList
          data={loading ? [] : nearby}
          keyExtractor={i => i.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={s.listContent}
          ListHeaderComponent={() => (
            <>
              {/* Category chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                {CATEGORIES.map(cat => {
                  const active = category === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      onPress={() => setCategory(cat.key)}
                      style={[s.chip, { backgroundColor: active ? colors.tint : colors.card, borderColor: active ? colors.tint : colors.borderLight }]}>
                      <Ionicons name={cat.icon as any} size={13} color={active ? '#0B0D0B' : colors.textMuted} style={{ marginRight: 4 }} />
                      <Text style={[s.chipTxt, { color: active ? '#0B0D0B' : colors.textSecondary }]}>{cat.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Featured carousel */}
              {featured.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <ScrollView
                    ref={featuredScrollRef}
                    horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={e => setFeaturedIdx(Math.round(e.nativeEvent.contentOffset.x / (width - 32)))}
                    style={{ width: width - 32 }}
                  >
                    {featured.map(item => {
                      const imgUrl = item.image_urls?.[0] || item.image_url;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={0.92}
                          onPress={() => router.push(`/marketplace/${item.id}` as any)}
                          style={[s.featuredCard, { width: width - 32 }]}>
                          {imgUrl
                            ? <Image source={{ uri: imgUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                            : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#1a2210' }]} />}
                          <View style={s.featuredOverlay} />
                          {/* Badge */}
                          <View style={s.featuredBadge}>
                            <Text style={s.featuredBadgeTxt}>🔥 Featured Near You</Text>
                          </View>
                          {/* Info */}
                          <View style={s.featuredInfo}>
                            <Text style={s.featuredTitle} numberOfLines={1}>{item.title || item.text}</Text>
                            {item.condition && <Text style={s.featuredCond}>{item.condition}</Text>}
                            <Text style={s.featuredPrice}>{item.price === 0 ? 'FREE' : formatPrice(item.price || 0)}</Text>
                            {item.lga && (
                              <View style={s.featuredLoc}>
                                <Ionicons name="location-outline" size={12} color="#aaa" />
                                <Text style={s.featuredLocTxt}>{item.lga}</Text>
                              </View>
                            )}
                          </View>
                          <TouchableOpacity style={s.featuredCTA} onPress={() => router.push(`/marketplace/${item.id}` as any)}>
                            <Text style={s.featuredCTATxt}>View Listing</Text>
                            <Ionicons name="chevron-forward" size={14} color="#0B0D0B" />
                          </TouchableOpacity>
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

              {/* Nearby header */}
              <View style={s.nearbyHeader}>
                <Text style={[s.nearbyTitle, { color: colors.text }]}>Nearby Listings</Text>
                <TouchableOpacity onPress={() => router.push('/home' as any)}>
                  <Text style={[s.seeAll, { color: colors.tint }]}>See all  ›</Text>
                </TouchableOpacity>
              </View>

              {loading && (
                <View style={s.skeletonGrid}>
                  {[1, 2, 3, 4].map(k => (
                    <View key={k} style={[s.skeletonCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                      <Skeleton width="100%" height={150} />
                      <View style={{ padding: 10 }}>
                        <Skeleton width="80%" height={12} style={{ marginBottom: 6 }} />
                        <Skeleton width="50%" height={18} />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
          renderItem={({ item }) => (
            <MarketplaceItemCard
              item={item}
              onPress={() => router.push(`/marketplace/${item.id}` as any)}
              onMessageSeller={handleMessageSeller}
              onBuyNow={item => router.push({ pathname: '/checkout/[id]', params: { id: item.id, type: 'marketplace' } })}
            />
          )}
          ListEmptyComponent={!loading ? (
            <View style={s.empty}>
              <Ionicons name="bag-outline" size={48} color={colors.textMuted} style={{ opacity: 0.4, marginBottom: 12 }} />
              <Text style={[s.emptyTxt, { color: colors.textMuted }]}>
                {search ? `No results for "${search}"` : 'No listings in your area yet'}
              </Text>
            </View>
          ) : null}
        />
      )}

      {activeTab === 'Events' && <EventList searchQuery={search} sortOption={sort} />}
      {activeTab === 'Businesses' && <BusinessComingSoon />}

      {/* ── Sort/Filter Modal ── */}
      <Modal visible={filterVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setFilterVisible(false)}>
          <View style={s.overlay} />
        </TouchableWithoutFeedback>
        <View style={[s.modal, { backgroundColor: colors.card }]}>
          <View style={s.modalHandle} />
          <Text style={[s.modalTitle, { color: colors.text }]}>Sort Listings</Text>
          {([
            { key: 'newest',     label: 'Newest First' },
            { key: 'price_asc',  label: 'Price: Low to High' },
            { key: 'price_desc', label: 'Price: High to Low' },
          ] as const).map(opt => (
            <TouchableOpacity key={opt.key} style={[s.modalOpt, { borderBottomColor: colors.borderLight }]}
              onPress={() => { setSort(opt.key); setFilterVisible(false); }}>
              <Text style={[s.modalOptTxt, { color: colors.text }]}>{opt.label}</Text>
              {sort === opt.key && <Ionicons name="checkmark" size={20} color={colors.tint} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.tint }]} onPress={() => setFilterVisible(false)}>
            <Text style={s.closeBtnTxt}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 14, height: 48, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14 },
  filterBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 28, padding: 4, marginBottom: 16, borderWidth: 1, position: 'relative', overflow: 'hidden' },
  tabIndicator: { position: 'absolute', height: '100%', top: 4, left: 4, borderRadius: 24 },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, zIndex: 1 },
  tabTxt: { fontSize: 12, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipTxt: { fontSize: 12, fontWeight: '600' },
  featuredCard: { height: 220, borderRadius: 24, overflow: 'hidden', marginRight: 0 },
  featuredOverlay: { ...StyleSheet.absoluteFillObject, background: 'transparent', backgroundColor: 'rgba(0,0,0,0.45)' },
  featuredBadge: { position: 'absolute', top: 14, left: 14, backgroundColor: 'rgba(130,219,126,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(130,219,126,0.35)' },
  featuredBadgeTxt: { color: '#82DB7E', fontSize: 11, fontWeight: '800' },
  featuredInfo: { position: 'absolute', bottom: 60, left: 16, right: 110 },
  featuredTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 2 },
  featuredCond: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 },
  featuredPrice: { color: '#82DB7E', fontSize: 22, fontWeight: '900' },
  featuredLoc: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  featuredLocTxt: { color: '#aaa', fontSize: 11 },
  featuredCTA: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#82DB7E', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  featuredCTATxt: { color: '#0B0D0B', fontWeight: '800', fontSize: 13 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  nearbyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  nearbyTitle: { fontSize: 20, fontWeight: '800' },
  seeAll: { fontSize: 13, fontWeight: '700' },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  skeletonCard: { width: '48%', borderRadius: 20, overflow: 'hidden', borderWidth: 1, marginBottom: 14 },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyTxt: { fontSize: 15, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { padding: 24, borderTopLeftRadius: 28, borderTopRightRadius: 28, position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 44 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  modalOpt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalOptTxt: { fontSize: 16 },
  closeBtn: { marginTop: 20, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  closeBtnTxt: { color: '#0B0D0B', fontSize: 16, fontWeight: '800' },
});
