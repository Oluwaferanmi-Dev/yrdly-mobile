import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Linking, FlatList, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/use-supabase-auth';
import ImageViewing from 'react-native-image-viewing';
import type { Business, CatalogItem } from '../../types';
import { Skeleton } from '../../components/Skeleton';
import { G, DARK, GLASS_BG, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY, GOLD } from '../../constants/tokens';

const { width } = Dimensions.get('window');

type Tab = 'Catalog' | 'Gallery' | 'About' | 'Reviews';

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

  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);

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

  // Realtime: patch rating & review_count when the business row updates
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`business-detail-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'businesses', filter: `id=eq.${id}` },
        (payload) => {
          if (payload.new) {
            setBusiness((prev) => prev ? { ...prev, ...(payload.new as Partial<Business>) } : prev);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleDeactivate = useCallback(() => {
    setMenuVisible(false);
    Alert.alert(
      'Deactivate Business',
      'Your business will be hidden from all listings. You can contact support to reactivate it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('businesses')
              .update({ is_active: false })
              .eq('id', id);
            if (error) {
              Alert.alert('Error', 'Could not deactivate business. Please try again.');
            } else {
              setBusiness(prev => prev ? { ...prev, is_active: false } as any : null);
            }
          },
        },
      ]
    );
  }, [id]);

  const handleCall = useCallback(() => {
    if (business?.phone) {
      Linking.openURL(`tel:${business.phone}`);
    }
  }, [business]);

  const handleMessage = useCallback(async () => {
    if (!business || !user || user.id === business.owner_id) return;

    try {
      const { data: convs, error: fetchError } = await supabase
        .from('conversations')
        .select('id, type, participant_ids, item_id')
        .eq('item_id', business.id)
        .order('created_at', { ascending: true });

      if (fetchError) console.error('Error fetching conversations:', fetchError);

      const existing = convs?.find(c => {
        if (c.type === 'briefcase' && c.item_id === business.id && c.participant_ids?.includes(user.id) && c.participant_ids?.includes(business.owner_id)) return true;
        return false;
      });

      if (existing?.id) {
        router.push({ pathname: '/chat/[id]', params: { id: existing.id } });
        return;
      }

      const imageUrl = business.cover_image || business.logo || '';
      router.push({ 
        pathname: '/chat/[id]', 
        params: { 
          id: 'new',
          type: 'briefcase',
          participant_id: business.owner_id,
          item_id: business.id,
          item_title: business.name,
          item_image: imageUrl,
        } 
      });
    } catch (e) {
      console.error('Error starting chat', e);
    }
  }, [business, user, router]);

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
      <View style={[s.root, { backgroundColor: DARK, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={G} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={[s.root, { backgroundColor: DARK, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: TEXT_PRIMARY }}>Business not found</Text>
      </View>
    );
  }

  // Non-owner visiting a deactivated or archived business
  const isArchivedOrInactive = (business as any).is_active === false || (business as any).is_archived === true || (business as any).status === 'archived';
  if (isArchivedOrInactive && !isOwner) {
    return (
      <View style={[s.root, { backgroundColor: DARK, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
        <Ionicons name="storefront-outline" size={64} color={MUTED} style={{ marginBottom: 16, opacity: 0.4 }} />
        <Text style={{ color: TEXT_PRIMARY, fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>Business No Longer Active</Text>
        <Text style={{ color: MUTED, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>This business has been deactivated by the owner and is no longer available.</Text>
        <TouchableOpacity
          style={{ marginTop: 28, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, backgroundColor: G }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const coverImg = business.cover_image || business.image_urls?.[0];
  const logoImg = business.logo || business.owner_avatar;

  return (
    <View style={[s.root, { backgroundColor: DARK }]}>
      {/* Owner menu modal */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[s.menuSheet, { backgroundColor: SURFACE, borderColor: GLASS_BORDER }]}>
            {!(business as any).is_active ? (
              <View style={[s.menuItem, { opacity: 0.5 }]}>
                <Ionicons name="archive-outline" size={18} color={MUTED} />
                <Text style={[s.menuItemTxt, { color: MUTED }]}>Already Archived</Text>
              </View>
            ) : (
              <TouchableOpacity style={s.menuItem} onPress={handleDeactivate}>
                <Ionicons name="archive-outline" size={18} color="#EF4444" />
                <Text style={[s.menuItemTxt, { color: '#EF4444' }]}>Deactivate Business</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Cover */}
        <View style={s.coverContainer}>
          {coverImg ? (
            <Image source={{ uri: coverImg }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: G, opacity: 0.2 }]} />
          )}
          <View style={s.coverOverlay} />

          {/* Back btn */}
          <TouchableOpacity 
            style={[s.backBtn, { top: insets.top + 10, backgroundColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }]} 
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={26} color={isDarkMode ? '#fff' : '#000'} />
          </TouchableOpacity>

          {/* 3-dot menu — owner only */}
          {isOwner && (
            <TouchableOpacity
              style={[s.menuBtn, { top: insets.top + 10, backgroundColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }]}
              onPress={() => setMenuVisible(true)}
            >
              <Ionicons name="ellipsis-vertical" size={22} color={isDarkMode ? '#fff' : '#000'} />
            </TouchableOpacity>
          )}

          {/* Logo */}
          <View style={[s.logoContainer, { backgroundColor: DARK, borderColor: DARK }]}>
            {logoImg ? (
              <Image source={{ uri: logoImg }} style={s.logo} contentFit="cover" />
            ) : (
              <View style={[s.logo, { backgroundColor: GLASS_BORDER, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="storefront" size={32} color={MUTED} />
              </View>
            )}
          </View>
        </View>

        {/* Info */}
        <View style={s.infoPad}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[s.nameTxt, { color: TEXT_PRIMARY, flexShrink: 1 }]}>{business.name}</Text>
            <VerifiedBadge size={20} />
          </View>
          <View style={[s.catBadge, { borderColor: GLASS_BORDER }]}>
            <Text style={[s.catBadgeTxt, { color: LABEL }]}>{business.category}</Text>
          </View>

          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Ionicons name="star" size={14} color="#FBBF24" />
              <Text style={[s.metaTxt, { color: TEXT_PRIMARY, fontWeight: '700' }]}>{business.rating?.toFixed(1) || "0.0"}</Text>
              <Text style={[s.metaTxt, { color: MUTED }]}>({business.review_count || 0})</Text>
            </View>
            <View style={s.metaItem}>
              <Ionicons name="time-outline" size={14} color={MUTED} />
              <Text style={[s.metaTxt, { color: MUTED }]}>{business.hours}</Text>
            </View>
          </View>

          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Ionicons name="location-outline" size={16} color={G} />
              <Text style={[s.metaTxt, { color: MUTED }]}>{getLocStr()}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={s.actionRow}>
            {!isOwner && (
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 16, backgroundColor: G, flex: 1, gap: 8 }} onPress={handleMessage}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#000" />
                <Text style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: 14, color: '#000' }}>Message</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 16, backgroundColor: 'transparent', borderWidth: 1, borderColor: G, flex: isOwner ? 1 : 0, paddingHorizontal: isOwner ? 0 : 20, gap: 8 }} 
              onPress={handleCall}
              disabled={!business.phone}
            >
              <Ionicons name="call-outline" size={18} color={business.phone ? G : MUTED} />
              {isOwner && <Text style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: 14, color: business.phone ? G : MUTED }}>Call</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={[s.tabRow, { borderBottomColor: GLASS_BORDER }]}>
          {(['Catalog', 'Gallery', 'About', 'Reviews'] as Tab[]).map(tab => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity key={tab} style={[s.tabItem, active && { borderBottomColor: G, borderBottomWidth: 2 }]} onPress={() => setActiveTab(tab)}>
                <Text style={[s.tabItemTxt, { color: active ? TEXT_PRIMARY : MUTED }]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        <View style={s.tabContentPad}>
          {activeTab === 'Catalog' && (
            <View>
              {isOwner && (
                <TouchableOpacity style={[s.addBtn, { backgroundColor: SURFACE, borderColor: GLASS_BORDER }]} onPress={() => router.push({ pathname: '/businesses/create-catalog-item', params: { businessId: business.id } } as any)}>
                  <Ionicons name="add" size={20} color={G} />
                  <Text style={[s.addBtnTxt, { color: G }]}>Add Catalog Item</Text>
                </TouchableOpacity>
              )}
              {catalogItems.length === 0 ? (
                <View style={s.emptyTab}>
                  <Ionicons name="cube-outline" size={48} color={MUTED} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <Text style={{ color: MUTED }}>No items in catalog yet.</Text>
                </View>
              ) : (
                <View style={s.catalogGrid}>
                  {catalogItems.map(item => (
                    <TouchableOpacity 
                      key={item.id} 
                      style={[s.catalogCard, { backgroundColor: SURFACE, borderColor: GLASS_BORDER }]}
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
                        <Text style={[s.catalogTitle, { color: TEXT_PRIMARY }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[s.catalogPrice, { color: G }]}>₦{item.price.toLocaleString()}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeTab === 'Gallery' && (
            <View>
              {(!business.image_urls || business.image_urls.length === 0) ? (
                <View style={s.emptyTab}>
                  <Ionicons name="image-outline" size={48} color={MUTED} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <Text style={{ color: MUTED }}>No gallery images yet.</Text>
                </View>
              ) : (
                <>
                  <ImageViewing
                    images={business.image_urls.map(url => ({ uri: url }))}
                    imageIndex={viewerIndex}
                    visible={isViewerVisible}
                    onRequestClose={() => setIsViewerVisible(false)}
                  />
                  <View style={s.galleryGrid}>
                    {business.image_urls.map((url, i) => (
                      <TouchableOpacity
                        key={i}
                        activeOpacity={0.8}
                        onPress={() => {
                          setViewerIndex(i);
                          setIsViewerVisible(true);
                        }}
                      >
                        <Image source={{ uri: url }} style={s.galleryGridImg} contentFit="cover" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {activeTab === 'About' && (
            <View style={s.aboutTab}>
              <Text style={[s.aboutHeading, { color: TEXT_PRIMARY }]}>About</Text>
              <Text style={[s.aboutDesc, { color: LABEL }]}>{business.description}</Text>

              <Text style={[s.aboutHeading, { color: TEXT_PRIMARY, marginTop: 24 }]}>Contact Information</Text>
              {business.email && (
                <View style={s.contactRow}>
                  <Ionicons name="mail-outline" size={18} color={MUTED} />
                  <Text style={{ color: LABEL }}>{business.email}</Text>
                </View>
              )}
              {business.phone && (
                <View style={s.contactRow}>
                  <Ionicons name="call-outline" size={18} color={MUTED} />
                  <Text style={{ color: LABEL }}>{business.phone}</Text>
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
                <Ionicons name="location-outline" size={18} color={MUTED} />
                <Text style={{ color: LABEL }}>{getLocStr()}</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'Reviews' && (
            <View>
              {reviews.length === 0 ? (
                <View style={s.emptyTab}>
                  <Text style={{ color: MUTED }}>No reviews yet.</Text>
                </View>
              ) : (
                reviews.map(review => (
                  <View key={review.id} style={[s.reviewCard, { backgroundColor: SURFACE, borderColor: GLASS_BORDER }]}>
                    <View style={s.reviewHeader}>
                      <Image source={{ uri: review.users?.avatar_url || 'https://via.placeholder.com/150' }} style={s.reviewerAvatar} />
                      <View style={s.reviewerInfo}>
                        <Text style={[s.reviewerName, { color: TEXT_PRIMARY }]}>{review.users?.name || 'Anonymous'}</Text>
                        <View style={s.reviewRating}>
                          <Ionicons name="star" size={12} color="#FBBF24" />
                          <Text style={{ fontSize: 12, color: TEXT_PRIMARY, fontWeight: '600' }}>{review.rating}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={{ color: LABEL, marginTop: 8 }}>{review.comment}</Text>
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
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  galleryGridImg: { width: (width - 48) / 3, height: (width - 48) / 3, borderRadius: 12 },
  menuBtn: { position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 80, paddingRight: 16 },
  menuSheet: { borderRadius: 14, borderWidth: 1, minWidth: 220, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuItemTxt: { fontSize: 15, fontWeight: '600' },
});
