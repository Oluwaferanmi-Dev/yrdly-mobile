import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Linking, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/use-supabase-auth';
import type { Business, CatalogItem } from '../../types';
import { Skeleton } from '../../components/Skeleton';

const { width } = Dimensions.get('window');

type Tab = 'Catalog' | 'About' | 'Reviews';

export default function BusinessProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDarkMode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Catalog');

  const isOwner = user?.id === business?.owner_id;

  useEffect(() => {
    if (!id) return;

    const fetchBusiness = async () => {
      try {
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', id)
          .single();

        if (businessError) throw businessError;

        if (businessData) {
          let ownerData = null;
          if (businessData.owner_id) {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('name, avatar_url')
              .eq('id', businessData.owner_id)
              .single();
            if (!userError && userData) {
              ownerData = userData;
            }
          }

          const biz: Business = {
            id: businessData.id,
            owner_id: businessData.owner_id,
            name: businessData.name,
            category: businessData.category,
            description: businessData.description,
            location: businessData.location,
            image_urls: businessData.image_urls,
            created_at: businessData.created_at,
            rating: businessData.rating || 0,
            review_count: businessData.review_count || 0,
            hours: businessData.hours || "Hours not specified",
            phone: businessData.phone,
            email: businessData.email,
            website: businessData.website,
            owner_name: ownerData?.name || businessData.owner_name || "Unknown Owner",
            owner_avatar: ownerData?.avatar_url || businessData.owner_avatar,
            cover_image: businessData.cover_image || businessData.image_urls?.[0],
            logo: businessData.logo || businessData.owner_avatar,
            distance: "0.5 km away",
            catalog: []
          };
          setBusiness(biz);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    const fetchCatalog = async () => {
      const { data } = await supabase
        .from('catalog_items')
        .select('*')
        .eq('business_id', id)
        .order('created_at', { ascending: false });
      if (data) setCatalogItems(data);
    };

    const fetchReviews = async () => {
      const { data } = await supabase
        .from('business_reviews')
        .select(`*, users!business_reviews_user_id_fkey(name, avatar_url)`)
        .eq('business_id', id)
        .order('created_at', { ascending: false });
      if (data) setReviews(data);
    };

    fetchBusiness();
    fetchCatalog();
    fetchReviews();
  }, [id]);

  const handleCall = useCallback(() => {
    if (business?.phone) {
      Linking.openURL(`tel:${business.phone}`);
    }
  }, [business]);

  const handleMessage = useCallback(() => {
    // Navigate to chat
    if (business) {
      // Assuming you have a route like /chat/business/[id] or similar.
      // For now, let's just log it or route to generic chat
      router.push(`/chat/business/${business.id}` as any);
    }
  }, [business, router]);

  const shortenAddress = (addr: string, len: number) => {
    if (addr.length > len) return addr.substring(0, len) + '...';
    return addr;
  };

  const getLocStr = () => {
    if (!business) return '';
    if (typeof business.location === 'string') return shortenAddress(business.location, 50);
    if (business.location?.address) return shortenAddress(business.location.address, 50);
    if (business.state || business.lga) return [business.lga, business.state].filter(Boolean).join(", ");
    return 'Location not specified';
  };

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Business not found</Text>
      </View>
    );
  }

  const coverImg = business.cover_image || business.image_urls?.[0];
  const logoImg = business.logo || business.owner_avatar;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Cover */}
        <View style={s.coverContainer}>
          {coverImg ? (
            <Image source={{ uri: coverImg }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.tint, opacity: 0.2 }]} />
          )}
          <View style={s.coverOverlay} />

          {/* Back btn */}
          <TouchableOpacity 
            style={[s.backBtn, { top: insets.top + 10, backgroundColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }]} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
          </TouchableOpacity>

          {/* Logo */}
          <View style={[s.logoContainer, { backgroundColor: colors.background, borderColor: colors.background }]}>
            {logoImg ? (
              <Image source={{ uri: logoImg }} style={s.logo} contentFit="cover" />
            ) : (
              <View style={[s.logo, { backgroundColor: colors.borderLight, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="storefront" size={32} color={colors.textMuted} />
              </View>
            )}
          </View>
        </View>

        {/* Info */}
        <View style={s.infoPad}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[s.nameTxt, { color: colors.text, flexShrink: 1 }]}>{business.name}</Text>
            <Ionicons name="checkmark-circle" size={20} color="#FBBF24" style={{ marginLeft: 6 }} />
          </View>
          <View style={[s.catBadge, { borderColor: colors.borderLight }]}>
            <Text style={[s.catBadgeTxt, { color: colors.textSecondary }]}>{business.category}</Text>
          </View>

          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Ionicons name="star" size={14} color="#FBBF24" />
              <Text style={[s.metaTxt, { color: colors.text, fontWeight: '700' }]}>{business.rating?.toFixed(1) || "0.0"}</Text>
              <Text style={[s.metaTxt, { color: colors.textMuted }]}>({business.review_count || 0})</Text>
            </View>
            <View style={s.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <Text style={[s.metaTxt, { color: colors.textMuted }]}>{business.hours}</Text>
            </View>
          </View>

          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Ionicons name="location-outline" size={16} color={colors.tint} />
              <Text style={[s.metaTxt, { color: colors.textMuted }]}>{getLocStr()}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={s.actionRow}>
            {!isOwner && (
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.tint, flex: 1 }]} onPress={handleMessage}>
                <Ionicons name="chatbubble-outline" size={18} color="#000" />
                <Text style={[s.actionBtnTxt, { color: '#000' }]}>Message</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[s.actionBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.tint, flex: isOwner ? 1 : 0, paddingHorizontal: isOwner ? 0 : 20 }]} 
              onPress={handleCall}
              disabled={!business.phone}
            >
              <Ionicons name="call-outline" size={18} color={business.phone ? colors.tint : colors.textMuted} />
              {isOwner && <Text style={[s.actionBtnTxt, { color: business.phone ? colors.tint : colors.textMuted }]}>Call</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={[s.tabRow, { borderBottomColor: colors.borderLight }]}>
          {(['Catalog', 'About', 'Reviews'] as Tab[]).map(tab => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity key={tab} style={[s.tabItem, active && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]} onPress={() => setActiveTab(tab)}>
                <Text style={[s.tabItemTxt, { color: active ? colors.text : colors.textMuted }]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        <View style={s.tabContentPad}>
          {activeTab === 'Catalog' && (
            <View>
              {isOwner && (
                <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.card, borderColor: colors.borderLight }]} onPress={() => {}}>
                  <Ionicons name="add" size={20} color={colors.tint} />
                  <Text style={[s.addBtnTxt, { color: colors.tint }]}>Add Catalog Item</Text>
                </TouchableOpacity>
              )}
              {catalogItems.length === 0 ? (
                <View style={s.emptyTab}>
                  <Ionicons name="cube-outline" size={48} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <Text style={{ color: colors.textMuted }}>No items in catalog yet.</Text>
                </View>
              ) : (
                <View style={s.catalogGrid}>
                  {catalogItems.map(item => (
                    <TouchableOpacity 
                      key={item.id} 
                      style={[s.catalogCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
                      activeOpacity={0.8}
                      onPress={() => router.push(`/businesses/catalog/${item.id}` as any)}
                    >
                      <View style={s.catalogImgBox}>
                        <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }} style={s.catalogImg} contentFit="cover" />
                        {!item.in_stock && (
                          <View style={s.outOfStockBadge}>
                            <Text style={s.outOfStockTxt}>Out of Stock</Text>
                          </View>
                        )}
                      </View>
                      <View style={s.catalogInfo}>
                        <Text style={[s.catalogTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[s.catalogPrice, { color: colors.tint }]}>₦{item.price.toLocaleString()}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeTab === 'About' && (
            <View style={s.aboutTab}>
              <Text style={[s.aboutHeading, { color: colors.text }]}>About</Text>
              <Text style={[s.aboutDesc, { color: colors.textSecondary }]}>{business.description}</Text>

              <Text style={[s.aboutHeading, { color: colors.text, marginTop: 24 }]}>Contact Information</Text>
              {business.email && (
                <View style={s.contactRow}>
                  <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                  <Text style={{ color: colors.textSecondary }}>{business.email}</Text>
                </View>
              )}
              {business.phone && (
                <View style={s.contactRow}>
                  <Ionicons name="call-outline" size={18} color={colors.textMuted} />
                  <Text style={{ color: colors.textSecondary }}>{business.phone}</Text>
                </View>
              )}
              <TouchableOpacity 
                style={s.contactRow}
                onPress={() => {
                  const locStr = getLocStr();
                  if (locStr && locStr !== 'Location not specified') {
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locStr)}`);
                  }
                }}
              >
                <Ionicons name="location-outline" size={18} color={colors.textMuted} />
                <Text style={{ color: colors.textSecondary }}>{getLocStr()}</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'Reviews' && (
            <View>
              {reviews.length === 0 ? (
                <View style={s.emptyTab}>
                  <Text style={{ color: colors.textMuted }}>No reviews yet.</Text>
                </View>
              ) : (
                reviews.map(review => (
                  <View key={review.id} style={[s.reviewCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                    <View style={s.reviewHeader}>
                      <Image source={{ uri: review.users?.avatar_url || 'https://via.placeholder.com/150' }} style={s.reviewerAvatar} />
                      <View style={s.reviewerInfo}>
                        <Text style={[s.reviewerName, { color: colors.text }]}>{review.users?.name || 'Anonymous'}</Text>
                        <View style={s.reviewRating}>
                          <Ionicons name="star" size={12} color="#FBBF24" />
                          <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>{review.rating}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{review.comment}</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  coverContainer: { height: 200, width: '100%', position: 'relative', marginBottom: 40 },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  backBtn: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  logoContainer: { position: 'absolute', bottom: -30, left: 16, width: 80, height: 80, borderRadius: 16, borderWidth: 4, overflow: 'hidden' },
  logo: { width: '100%', height: '100%' },
  infoPad: { paddingHorizontal: 16 },
  nameTxt: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  catBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  catBadgeTxt: { fontSize: 12, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaTxt: { fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 24 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 24, gap: 8 },
  actionBtnTxt: { fontSize: 15, fontWeight: '700' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
  tabItem: { paddingVertical: 12, marginRight: 24 },
  tabItemTxt: { fontSize: 15, fontWeight: '600' },
  tabContentPad: { padding: 16 },
  emptyTab: { alignItems: 'center', paddingVertical: 40 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', marginBottom: 16, gap: 8 },
  addBtnTxt: { fontSize: 14, fontWeight: '600' },
  catalogGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  catalogCard: { width: '48%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, marginBottom: 16 },
  catalogImgBox: { width: '100%', aspectRatio: 1, position: 'relative' },
  catalogImg: { width: '100%', height: '100%' },
  outOfStockBadge: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  outOfStockTxt: { color: '#fff', fontSize: 12, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  catalogInfo: { padding: 10 },
  catalogTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  catalogPrice: { fontSize: 15, fontWeight: '800' },
  aboutTab: { paddingBottom: 20 },
  aboutHeading: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  aboutDesc: { fontSize: 14, lineHeight: 22 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  reviewCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewerAvatar: { width: 40, height: 40, borderRadius: 20 },
  reviewerInfo: { flex: 1 },
  reviewerName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  reviewRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
