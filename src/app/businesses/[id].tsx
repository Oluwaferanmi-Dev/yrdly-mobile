import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Linking, Alert, Modal, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { LinearGradient } from 'expo-linear-gradient';
import type { Business, CatalogItem } from '../../types';
import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../../constants/tokens';

const { width } = Dimensions.get('window');
type Tab = 'catalog' | 'reviews' | 'analytics';

export default function BusinessProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [isCustomerView, setIsCustomerView] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [catalogSheet, setCatalogSheet] = useState<CatalogItem | null>(null);

  const isOwner = user?.id === business?.owner_id;
  const viewAsCustomer = !isOwner || isCustomerView;

  useEffect(() => {
    if (!id) return;
    const fetchBusiness = async () => {
      try {
        const { data: bData, error: bError } = await supabase.from('businesses').select('*').eq('id', id).single();
        if (bError) throw bError;
        if (bData) {
          let oData = null;
          if (bData.owner_id) {
            const { data: uData } = await supabase.from('users').select('name, avatar_url').eq('id', bData.owner_id).single();
            if (uData) oData = uData;
          }
          setBusiness({
            ...bData,
            owner_name: oData?.name || bData.owner_name || "Unknown Owner",
            owner_avatar: oData?.avatar_url || bData.owner_avatar,
            cover_image: bData.cover_image || bData.image_urls?.[0],
            logo: bData.logo || bData.owner_avatar,
          });
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    const fetchCatalog = async () => {
      const { data } = await supabase.from('catalog_items').select('*').eq('business_id', id).order('created_at', { ascending: false });
      if (data) setCatalogItems(data);
    };
    const fetchReviews = async () => {
      const { data } = await supabase.from('business_reviews').select(`*, users!business_reviews_user_id_fkey(name, avatar_url)`).eq('business_id', id).order('created_at', { ascending: false });
      if (data) setReviews(data);
    };
    fetchBusiness(); fetchCatalog(); fetchReviews();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel(`business-detail-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'businesses', filter: `id=eq.${id}` }, (payload) => {
        if (payload.new) setBusiness(prev => prev ? { ...prev, ...(payload.new as Partial<Business>) } : prev);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleDeactivate = useCallback(() => {
    setMenuVisible(false);
    Alert.alert('Deactivate Business', 'Your business will be hidden from all listings. You can contact support to reactivate it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('businesses').update({ is_active: false }).eq('id', id);
          if (!error) setBusiness(prev => prev ? { ...prev, is_active: false } as any : null);
        }
      },
    ]);
  }, [id]);

  const handleMessage = useCallback(async () => {
    if (!business || !user || user.id === business.owner_id) return;
    try {
      const { data: convs } = await supabase.from('conversations').select('id, type, participant_ids, item_id').eq('item_id', business.id).order('created_at', { ascending: true });
      const existing = convs?.find(c => c.type === 'briefcase' && c.item_id === business.id && c.participant_ids?.includes(user.id) && c.participant_ids?.includes(business.owner_id));
      if (existing?.id) return router.push({ pathname: '/chat/[id]', params: { id: existing.id } });
      router.push({ pathname: '/chat/[id]', params: { id: 'new', type: 'briefcase', participant_id: business.owner_id, item_id: business.id, item_title: business.name, item_image: business.cover_image || business.logo || '' }});
    } catch (e) { console.error(e); }
  }, [business, user, router]);

  const shortenAddress = (addr: string, len: number) => addr.length > len ? addr.substring(0, len) + '...' : addr;
  const getLocStr = () => {
    if (!business) return '';
    if (typeof business.location === 'string') return shortenAddress(business.location, 50);
    if (business.location?.address) return shortenAddress(business.location.address, 50);
    if (business.state || business.lga) return [business.lga, business.state].filter(Boolean).join(", ");
    return 'Location not specified';
  };

  if (loading) return <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={G} /></View>;
  if (!business) return <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}><Text style={{ color: TEXT_PRIMARY }}>Business not found</Text></View>;

  const isArchived = (business as any).is_active === false || (business as any).is_archived === true || (business as any).status === 'archived';
  if (isArchived && !isOwner) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
        <Ionicons name="storefront-outline" size={64} color={MUTED} style={{ marginBottom: 16, opacity: 0.4 }} />
        <Text style={{ color: TEXT_PRIMARY, fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>Business No Longer Active</Text>
        <Text style={{ color: MUTED, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>This business has been deactivated by the owner and is no longer available.</Text>
        <TouchableOpacity style={{ marginTop: 28, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, backgroundColor: G }} onPress={() => router.back()}>
          <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const coverImg = business.cover_image || business.image_urls?.[0] || 'https://via.placeholder.com/600x300';
  const logoImg = business.logo || business.owner_avatar || 'https://via.placeholder.com/150';

  return (
    <View style={s.root}>
      {/* Catalog Item Sheet */}
      <Modal visible={!!catalogSheet} transparent animationType="slide" onRequestClose={() => setCatalogSheet(null)}>
        <TouchableOpacity style={s.sheetOverlay} activeOpacity={1} onPress={() => setCatalogSheet(null)}>
          <Pressable style={s.sheetContent} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            {catalogSheet && (
              <>
                <View style={s.sheetHeader}>
                  <Image source={{ uri: catalogSheet.images?.[0] || 'https://via.placeholder.com/150' }} style={s.sheetImg} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.sheetTitle}>{catalogSheet.title}</Text>
                    <Text style={s.sheetPrice}>₦{catalogSheet.price.toLocaleString()}</Text>
                  </View>
                  {!catalogSheet.in_stock && (
                    <View style={s.sheetOutOfStock}>
                      <Text style={s.sheetOutOfStockTxt}>OUT OF STOCK</Text>
                    </View>
                  )}
                </View>
                
                {viewAsCustomer ? (
                  <>
                    <TouchableOpacity style={s.sheetActionItem} onPress={() => { setCatalogSheet(null); handleMessage(); }}>
                      <View style={[s.sheetActionIconBox, { backgroundColor: 'rgba(130,219,126,0.1)' }]}>
                        <Ionicons name="chatbubbles-outline" size={16} color={G} />
                      </View>
                      <Text style={[s.sheetActionTxt, { color: G }]}>Inquire / Order via Chat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.sheetActionItem, { borderBottomWidth: 0 }]} onPress={() => setCatalogSheet(null)}>
                      <View style={[s.sheetActionIconBox, { backgroundColor: SURFACE }]}>
                        <Ionicons name="share-social-outline" size={16} color={MUTED} />
                      </View>
                      <Text style={[s.sheetActionTxt, { color: '#fff' }]}>Share Listing</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={s.sheetActionItem} onPress={() => { setCatalogSheet(null); router.push(`/businesses/create-catalog-item?business_id=${business.id}&id=${catalogSheet.id}` as any); }}>
                      <View style={[s.sheetActionIconBox, { backgroundColor: SURFACE }]}>
                        <Ionicons name="pencil-outline" size={16} color={MUTED} />
                      </View>
                      <Text style={[s.sheetActionTxt, { color: '#fff' }]}>Edit Item</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.sheetActionItem} onPress={async () => {
                      const in_stock = !catalogSheet.in_stock;
                      setCatalogItems(its => its.map(i => i.id === catalogSheet.id ? { ...i, in_stock } : i));
                      setCatalogSheet(null);
                      await supabase.from('catalog_items').update({ in_stock }).eq('id', catalogSheet.id);
                    }}>
                      <View style={[s.sheetActionIconBox, { backgroundColor: SURFACE }]}>
                        <Ionicons name="cube-outline" size={16} color={MUTED} />
                      </View>
                      <Text style={[s.sheetActionTxt, { color: '#fff' }]}>{catalogSheet.in_stock ? 'Mark Out of Stock' : 'Mark In Stock'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.sheetActionItem, { borderBottomWidth: 0 }]} onPress={async () => {
                      setCatalogItems(its => its.filter(i => i.id !== catalogSheet.id));
                      setCatalogSheet(null);
                      await supabase.from('catalog_items').delete().eq('id', catalogSheet.id);
                    }}>
                      <View style={[s.sheetActionIconBox, { backgroundColor: 'rgba(239,68,68,0.08)' }]}>
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </View>
                      <Text style={[s.sheetActionTxt, { color: '#ef4444' }]}>Delete Item</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </Pressable>
        </TouchableOpacity>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Cover banner */}
        <View style={s.coverContainer}>
          <Image source={{ uri: coverImg }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          <LinearGradient colors={['rgba(5,5,5,0.1)', 'rgba(5,5,5,0.72)']} style={StyleSheet.absoluteFillObject} />
          
          <TouchableOpacity style={[s.backBtn, { top: insets.top + 10 }]} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          {isOwner && (
            <View style={[s.customerToggleWrap, { top: insets.top + 10 }]}>
              <Text style={s.customerToggleTxt}>Customer view</Text>
              <TouchableOpacity 
                style={[s.toggleTrack, { backgroundColor: isCustomerView ? G : 'rgba(255,255,255,0.18)' }]} 
                activeOpacity={0.8}
                onPress={() => setIsCustomerView(!isCustomerView)}
              >
                <View style={[s.toggleKnob, { transform: [{ translateX: isCustomerView ? 16 : 0 }] }]} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={s.infoPad}>
          {/* Avatar overlapping banner */}
          <View style={s.avatarOverlapWrap}>
            <Image source={{ uri: logoImg }} style={s.avatarImage} contentFit="cover" />
          </View>

          {/* Name + verified */}
          <View style={s.nameRow}>
            <Text style={s.nameTxt}>{business.name}</Text>
            {(business as any).is_verified && <MaterialIcons name="verified" size={18} color={G} />}
          </View>

          <Text style={s.catLocationTxt}>{business.category || 'Business'} · {getLocStr()}</Text>

          {/* Stats row */}
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statVal}>{(business as any).followers_count || '1.2k'}</Text>
              <Text style={s.statLabel}>Followers</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statVal}>{catalogItems.length}</Text>
              <Text style={s.statLabel}>Items</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statVal}>{business.rating ? `${business.rating.toFixed(1)} ★` : '0 ★'}</Text>
              <Text style={s.statLabel}>Rating</Text>
            </View>
          </View>

          {/* Quick actions */}
          <View style={s.quickActionsRow}>
            {isOwner && !isCustomerView ? (
              <>
                <TouchableOpacity onPress={() => router.push(`/businesses/create-catalog-item?business_id=${business.id}` as any)} style={[s.actionBtn, s.actionBtnPrimary]}>
                  <Ionicons name="add" size={18} color={G} style={{ marginRight: 4 }} />
                  <Text style={s.actionBtnPrimaryTxt}>Add Item</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push(`/businesses/create?id=${business.id}` as any)} style={[s.actionBtn, s.actionBtnSecondary]}>
                  <Ionicons name="pencil" size={16} color={MUTED} style={{ marginRight: 4 }} />
                  <Text style={s.actionBtnSecondaryTxt}>Edit Info</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={handleMessage} style={[s.actionBtn, s.actionBtnPrimary, { flex: 1 }]}>
                <Ionicons name="chatbubbles" size={18} color={G} style={{ marginRight: 4 }} />
                <Text style={s.actionBtnPrimaryTxt}>Message</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.actionBtn, s.actionBtnSecondary, isOwner && !isCustomerView ? undefined : { flex: 1 }]}>
              <Ionicons name="share-social" size={16} color={MUTED} style={{ marginRight: 4 }} />
              <Text style={s.actionBtnSecondaryTxt}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={s.tabsWrap}>
            {(['catalog', 'reviews', 'analytics'] as const).map(t => (
              <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={s.tabBtn}>
                <Text style={[s.tabTxt, { color: activeTab === t ? '#fff' : LABEL, fontFamily: activeTab === t ? 'Outfit-Bold' : 'Outfit-Medium' }]}>
                  {t}
                </Text>
                {activeTab === t && <View style={s.tabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tab Content */}
        <View style={s.tabContentPad}>
          {activeTab === 'catalog' && (
            <>
              {isOwner && viewAsCustomer && (
                <View style={s.customerWarningBox}>
                  <Ionicons name="cube" size={14} color={G} />
                  <Text style={s.customerWarningTxt}>Viewing as customer — this is how your storefront appears</Text>
                </View>
              )}
              <View style={s.catalogGrid}>
                {catalogItems.map(item => (
                  <TouchableOpacity key={item.id} onPress={() => setCatalogSheet(item)} style={s.catalogCard} activeOpacity={0.8}>
                    <View style={s.catalogImgBox}>
                      <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/300x200' }} style={s.catalogImg} contentFit="cover" />
                      {!item.in_stock && (
                        <View style={s.outOfStockOverlay}>
                          <Text style={s.outOfStockOverlayTxt}>OUT OF STOCK</Text>
                        </View>
                      )}
                      {!viewAsCustomer && (
                        <View style={s.stockBadge}>
                          <Text style={[s.stockBadgeTxt, { color: item.in_stock ? G : '#ef4444' }]}>
                            {item.in_stock ? 'In Stock' : 'Sold Out'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={s.catalogInfo}>
                      <Text style={s.catalogTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={s.catalogPrice}>₦{item.price.toLocaleString()}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {!viewAsCustomer && (
                  <TouchableOpacity onPress={() => router.push(`/businesses/create-catalog-item?business_id=${business.id}` as any)} style={s.addItemCard}>
                    <View style={s.addItemIconBox}>
                      <Ionicons name="add" size={18} color={G} />
                    </View>
                    <Text style={s.addItemTxt}>Add Item</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {activeTab === 'reviews' && (
            <View>
              <View style={s.ratingHeader}>
                <Text style={s.ratingBigNum}>{business.rating?.toFixed(1) || '0.0'}</Text>
                <View>
                  <View style={s.ratingStars}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <Ionicons key={n} name={n <= (business.rating || 0) ? "star" : "star-outline"} size={16} color="#FFB648" />
                    ))}
                  </View>
                  <Text style={s.ratingBasedOn}>Based on {business.review_count || 0} reviews</Text>
                </View>
              </View>

              {reviews.map(r => (
                <View key={r.id} style={s.reviewItem}>
                  <Image source={{ uri: r.users?.avatar_url || 'https://via.placeholder.com/80' }} style={s.reviewAvatar} contentFit="cover" />
                  <View style={s.reviewBody}>
                    <View style={s.reviewNameRow}>
                      <Text style={s.reviewName}>{r.users?.name || 'Anonymous'}</Text>
                      <Text style={s.reviewDate}>2d ago</Text>
                    </View>
                    <View style={s.reviewStarsRow}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <Ionicons key={n} name={n <= r.rating ? "star" : "star-outline"} size={11} color="#FFB648" />
                      ))}
                    </View>
                    <Text style={s.reviewText}>{r.comment}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'analytics' && (
            <View style={{ gap: 12 }}>
              {[
                { l: 'Total Catalog Items', v: catalogItems.length.toString(), icon: '📦' },
                { l: 'Profile Views (30d)', v: '1,247', icon: '👁️' },
                { l: 'Inquiries Received', v: '34', icon: '💬' },
                { l: 'Average Rating', v: `${business.rating?.toFixed(1) || '0'} ★`, icon: '⭐' },
              ].map(sItem => (
                <View key={sItem.l} style={s.analyticsCard}>
                  <View style={s.analyticsIconBox}>
                    <Text style={{ fontSize: 20 }}>{sItem.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.analyticsLabel}>{sItem.l}</Text>
                    <Text style={s.analyticsValue}>{sItem.v}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  coverContainer: { height: 155, width: '100%', position: 'relative' },
  backBtn: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  customerToggleWrap: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  customerToggleTxt: { fontFamily: 'Inter', fontSize: 13, color: '#fff' },
  toggleTrack: { width: 36, height: 20, borderRadius: 10, padding: 2 },
  toggleKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#050505' },
  
  infoPad: { paddingHorizontal: 20 },
  avatarOverlapWrap: { marginTop: -28, marginBottom: 12 },
  avatarImage: { width: 64, height: 64, borderRadius: 18, borderWidth: 3, borderColor: '#050505' },
  
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  nameTxt: { fontFamily: 'Outfit-Bold', fontSize: 24, color: '#fff' },
  catLocationTxt: { fontFamily: 'Inter', fontSize: 14, color: LABEL, marginBottom: 16 },
  
  statsRow: { flexDirection: 'row', gap: 24, marginBottom: 20 },
  statItem: { alignItems: 'flex-start' },
  statVal: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#fff', marginBottom: 2 },
  statLabel: { fontFamily: 'Inter', fontSize: 13, color: LABEL },
  
  quickActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 12, paddingHorizontal: 16 },
  actionBtnPrimary: { backgroundColor: 'rgba(130,219,126,0.1)' },
  actionBtnPrimaryTxt: { fontFamily: 'Outfit-Bold', fontSize: 14, color: G },
  actionBtnSecondary: { backgroundColor: SURFACE },
  actionBtnSecondaryTxt: { fontFamily: 'Inter', fontSize: 14, color: '#fff' },
  
  tabsWrap: { flexDirection: 'row', gap: 16, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER },
  tabBtn: { paddingBottom: 12, position: 'relative' },
  tabTxt: { fontSize: 14, textTransform: 'capitalize' },
  tabIndicator: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, borderRadius: 2, backgroundColor: G },
  
  tabContentPad: { paddingHorizontal: 20, paddingBottom: 32, marginTop: 16 },
  
  customerWarningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(130,219,126,0.06)', borderWidth: 1, borderColor: 'rgba(130,219,126,0.2)', borderRadius: 12, marginBottom: 16 },
  customerWarningTxt: { fontFamily: 'Inter', fontSize: 12, color: G },
  
  catalogGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  catalogCard: { width: '48%', backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 18, overflow: 'hidden', marginBottom: 10 },
  catalogImgBox: { position: 'relative', height: 100, width: '100%' },
  catalogImg: { width: '100%', height: '100%' },
  outOfStockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  outOfStockOverlayTxt: { fontFamily: 'Outfit-Bold', fontSize: 12, color: '#ef4444' },
  stockBadge: { position: 'absolute', top: 6, right: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.65)' },
  stockBadgeTxt: { fontFamily: 'Outfit-Bold', fontSize: 10 },
  catalogInfo: { paddingHorizontal: 12, paddingVertical: 10 },
  catalogTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#fff', marginBottom: 2, lineHeight: 17 },
  catalogPrice: { fontFamily: 'Outfit-Bold', fontSize: 14, color: G },
  
  addItemCard: { width: '48%', height: 160, borderRadius: 18, backgroundColor: 'rgba(130,219,126,0.04)', borderWidth: 1, borderColor: 'rgba(130,219,126,0.2)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
  addItemIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(130,219,126,0.1)', alignItems: 'center', justifyContent: 'center' },
  addItemTxt: { fontFamily: 'Inter', fontSize: 12, color: G },
  
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheetContent: { backgroundColor: '#0A0A0A', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 20, paddingBottom: 40, paddingTop: 14 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER, marginBottom: 20 },
  sheetImg: { width: 52, height: 52, borderRadius: 14 },
  sheetTitle: { fontFamily: 'Outfit-Bold', fontSize: 15, color: '#fff', marginBottom: 2 },
  sheetPrice: { fontFamily: 'Outfit-Bold', fontSize: 14, color: G },
  sheetOutOfStock: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  sheetOutOfStockTxt: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#ef4444' },
  sheetActionItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER },
  sheetActionIconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetActionTxt: { fontFamily: 'Inter', fontSize: 15 },
  
  ratingHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 20, marginBottom: 16 },
  ratingBigNum: { fontFamily: 'Outfit-Bold', fontSize: 48, color: '#fff', lineHeight: 56 },
  ratingStars: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  ratingBasedOn: { fontFamily: 'Inter', fontSize: 13, color: LABEL },
  
  reviewItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 18, marginBottom: 12 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewBody: { flex: 1 },
  reviewNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  reviewName: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#fff' },
  reviewDate: { fontFamily: 'Inter', fontSize: 11, color: LABEL },
  reviewStarsRow: { flexDirection: 'row', gap: 2, marginBottom: 6 },
  reviewText: { fontFamily: 'Inter', fontSize: 13, color: MUTED, lineHeight: 20 },
  
  analyticsCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 18 },
  analyticsIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center' },
  analyticsLabel: { fontFamily: 'Inter', fontSize: 13, color: LABEL },
  analyticsValue: { fontFamily: 'Outfit-Bold', fontSize: 20, color: '#fff' },
});
