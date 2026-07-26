import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Dimensions, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useAppTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../hooks/use-supabase-auth';
import ImageViewing from 'react-native-image-viewing';
import type { Business, CatalogItem } from '../../../types';

export default function CatalogItemScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { colors, isDarkMode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [item, setItem] = useState<CatalogItem | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    if (!itemId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const { data: itemData, error: itemError } = await supabase
          .from('catalog_items')
          .select('*')
          .eq('id', itemId)
          .maybeSingle();

        if (itemError || !itemData) {
          console.error('Error fetching catalog item:', itemError);
          setLoading(false);
          return;
        }

        setItem(itemData);

        if (itemData.business_id) {
          const { data: bizData } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', itemData.business_id)
            .maybeSingle();

          if (bizData) {
            let ownerName = bizData.owner_name || "Business Owner";
            let ownerAvatar = bizData.owner_avatar || bizData.logo || null;

            if (bizData.owner_id) {
              try {
                const { data: uData } = await supabase
                  .from('users')
                  .select('name, avatar_url')
                  .eq('id', bizData.owner_id)
                  .maybeSingle();
                if (uData) {
                  if (uData.name) ownerName = uData.name;
                  if (uData.avatar_url) ownerAvatar = uData.avatar_url;
                }
              } catch (uErr) {}
            }

            setBusiness({
              id: bizData.id,
              owner_id: bizData.owner_id,
              name: bizData.name,
              category: bizData.category,
              description: bizData.description,
              location: bizData.location,
              image_urls: bizData.image_urls,
              created_at: bizData.created_at,
              rating: bizData.rating || 0,
              review_count: bizData.review_count || 0,
              hours: bizData.hours || "Hours not specified",
              phone: bizData.phone,
              email: bizData.email,
              website: bizData.website,
              owner_name: ownerName,
              owner_avatar: ownerAvatar,
              cover_image: bizData.cover_image || bizData.image_urls?.[0],
              logo: bizData.logo || ownerAvatar || bizData.image_urls?.[0],
              distance: "0.5 km away",
              catalog: []
            });
          }
        }
      } catch (e) {
        console.error('Error in fetchData:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [itemId]);

  const handleCall = useCallback(() => {
    if (business?.phone) {
      Linking.openURL(`tel:${business.phone}`);
    }
  }, [business]);

  const handleMessage = useCallback(async () => {
    if (!business || !user) return;
    try {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, type, participant_ids, item_id')
        .eq('item_id', business.id)
        .order('created_at', { ascending: true });

      const existing = convs?.find(c => {
        if ((c.type === 'briefcase' || c.type === 'business') && c.item_id === business.id && c.participant_ids?.includes(user.id) && c.participant_ids?.includes(business.owner_id)) return true;
        return false;
      });

      if (existing?.id) {
        router.push({ pathname: '/chat/[id]', params: { id: existing.id } });
        return;
      }

      const imageUrl = (item?.images && item.images[0]) || business.cover_image || business.logo || '';
      router.push({ 
        pathname: '/chat/[id]', 
        params: { 
          id: 'new',
          type: 'briefcase',
          participant_id: business.owner_id,
          item_id: business.id,
          item_title: item ? `${item.title} (${business.name})` : business.name,
          item_image: imageUrl,
        } 
      });
    } catch (e) {
      console.error('Error starting chat from catalog item:', e);
    }
  }, [business, item, user, router]);

  const handleBuy = useCallback(() => {
    if (!item) return;
    if (!item.in_stock || (item.quantity !== undefined && item.quantity <= 0)) {
      Alert.alert("Sold Out", "This item is currently out of stock.");
      return;
    }
    router.push({
      pathname: '/checkout/[id]',
      params: { id: item.id, type: 'catalog_item' }
    });
  }, [item, router]);

  const handleRestock = useCallback(async () => {
    if (!item) return;
    Alert.prompt(
      "Restock Item",
      "Enter new stock quantity for this item:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update Stock",
          onPress: async (val?: string) => {
            const qty = parseInt(val || '0', 10);
            if (isNaN(qty) || qty < 0) {
              Alert.alert("Invalid Quantity", "Please enter a valid positive number.");
              return;
            }
            try {
              const inStock = qty > 0;
              const { error } = await supabase
                .from('catalog_items')
                .update({ quantity: qty, in_stock: inStock })
                .eq('id', item.id);
              if (error) throw error;
              setItem(prev => prev ? { ...prev, quantity: qty, in_stock: inStock } : null);
              Alert.alert("Success", `Item stock updated to ${qty}.`);
            } catch (err) {
              console.error("Error restocking item:", err);
              Alert.alert("Error", "Could not update stock.");
            }
          }
        }
      ],
      "plain-text",
      item.quantity !== undefined ? String(item.quantity) : "10"
    );
  }, [item]);

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Ionicons name="cube-outline" size={48} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 16 }} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Item not found</Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>The item you&apos;re looking for doesn&apos;t exist or has been removed.</Text>
        <TouchableOpacity style={{ backgroundColor: colors.tint, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 }} onPress={() => router.back()}>
          <Text style={{ color: '#000', fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = user?.id === business?.owner_id;

  let rawImages: string[] = [];
  if (Array.isArray(item.images)) {
    rawImages = item.images;
  } else if (typeof item.images === 'string') {
    try { rawImages = JSON.parse(item.images); } catch (e) {}
  }
  if (rawImages.length === 0 && (item as any).image_url) {
    rawImages = [(item as any).image_url];
  }

  const images = rawImages.length > 0 ? rawImages : ['https://via.placeholder.com/400'];
  const imageViewerImages = images.map(img => ({ uri: img }));
  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ImageViewing
        images={imageViewerImages}
        imageIndex={viewerIndex}
        visible={isViewerVisible}
        onRequestClose={() => setIsViewerVisible(false)}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Images Swipeable */}
        <View style={s.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / (screenWidth || 1));
              if (slide !== currentImageIndex) setCurrentImageIndex(slide);
            }}
            scrollEventThrottle={16}
            style={StyleSheet.absoluteFillObject}
          >
            {images.map((img, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.9}
                style={{ width: screenWidth, height: '100%' }}
                onPress={() => {
                  setViewerIndex(idx);
                  setIsViewerVisible(true);
                }}
              >
                <Image
                  source={{ uri: img }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={s.imageOverlay} pointerEvents="none" />

          {/* Back btn */}
          <TouchableOpacity 
            style={[s.backBtn, { top: insets.top + 10, backgroundColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }]} 
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={26} color={isDarkMode ? '#fff' : '#000'} />
          </TouchableOpacity>

          {/* Indicators */}
          {images.length > 1 && (
            <View style={s.indicators} pointerEvents="none">
              {images.map((_, idx) => (
                <View 
                  key={idx} 
                  style={[s.dot, { backgroundColor: idx === currentImageIndex ? colors.tint : 'rgba(255,255,255,0.5)' }]} 
                />
              ))}
            </View>
          )}
        </View>

        <View style={s.contentPad}>
          {/* Item Title & Price */}
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.titleTxt, { color: colors.text }]}>{item.title}</Text>
              {!!item.category && (
                <View style={[s.catBadge, { borderColor: colors.borderLight }]}>
                  <Text style={[s.catBadgeTxt, { color: colors.textSecondary }]}>{item.category}</Text>
                </View>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.priceTxt, { color: colors.tint }]}>₦{item.price.toLocaleString()}</Text>
              {!item.in_stock || (item.quantity !== undefined && item.quantity <= 0) ? (
                <View style={[s.outOfStockBadge, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Out of Stock</Text>
                </View>
              ) : item.quantity !== undefined ? (
                <View style={[s.outOfStockBadge, { backgroundColor: colors.tint + '18' }]}>
                  <Text style={{ color: colors.tint, fontSize: 12, fontWeight: '700' }}>
                    {item.quantity <= 3 ? `Only ${item.quantity} left!` : `${item.quantity} in stock`}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {isOwner && (
            <TouchableOpacity 
              onPress={handleRestock}
              style={{ backgroundColor: colors.tint + '20', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start', marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.tint} />
              <Text style={{ color: colors.tint, fontSize: 12, fontWeight: '700' }}>Restock / Update Quantity</Text>
            </TouchableOpacity>
          )}

          {!!item.description && (
            <Text style={[s.descTxt, { color: colors.textSecondary }]}>{item.description}</Text>
          )}

          {/* Business Info Card */}
          {business && (
            <TouchableOpacity 
              style={[s.bizCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
              onPress={() => router.push(`/businesses/${business.id}` as any)}
            >
              {business.logo ? (
                <Image source={{ uri: business.logo }} style={s.bizLogo} contentFit="cover" />
              ) : (
                <View style={[s.bizLogo, { backgroundColor: colors.borderLight, justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="storefront" size={24} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[s.bizName, { color: colors.text }]}>{business.name}</Text>
                <View style={s.bizMetaRow}>
                  <Ionicons name="star" size={14} color="#FBBF24" />
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginLeft: 4 }}>{business.rating?.toFixed(1) || "0.0"}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13, marginLeft: 6 }}>• {business.category}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* Action Buttons */}
          {(!isOwner || business?.phone) && (
            <View style={s.actionRow}>
              {!isOwner && (
                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: colors.tint, flex: 1 }]}
                  onPress={handleBuy}
                  disabled={!item.in_stock}
                >
                  <Ionicons name="bag-handle-outline" size={20} color="#000" style={{ marginRight: 8 }} />
                  <Text style={[s.primaryBtnTxt, { color: '#000' }]}>{item.in_stock ? 'Buy Now' : 'Out of Stock'}</Text>
                </TouchableOpacity>
              )}

              {business?.phone && (
                <TouchableOpacity
                  style={[s.outlineBtn, { borderColor: colors.borderLight, width: 50 }]}
                  onPress={handleCall}
                >
                  <Ionicons name="call-outline" size={20} color={colors.tint} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {!isOwner && business && (
            <TouchableOpacity style={[s.outlineBtn, { borderColor: colors.borderLight, marginTop: 12 }]} onPress={handleMessage}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.text} />
              <Text style={[s.outlineBtnTxt, { color: colors.text, marginLeft: 8 }]}>Message about Item</Text>
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  imageContainer: { height: 300, width: '100%', position: 'relative' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
  backBtn: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  navArrowContainer: { position: 'absolute', inset: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  navBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  indicators: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  contentPad: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  titleTxt: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  catBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  catBadgeTxt: { fontSize: 12, fontWeight: '600' },
  priceTxt: { fontSize: 24, fontWeight: '800' },
  outOfStockBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  descTxt: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  bizCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  bizLogo: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  bizName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  bizMetaRow: { flexDirection: 'row', alignItems: 'center' },
  actionRow: { flexDirection: 'row', gap: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 25 },
  primaryBtnTxt: { fontSize: 16, fontWeight: '700' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 25, borderWidth: 1 },
  outlineBtnTxt: { fontSize: 15, fontWeight: '600' },
});
