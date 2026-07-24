import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useAppTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../hooks/use-supabase-auth';
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

  useEffect(() => {
    if (!itemId) return;

    const fetchData = async () => {
      try {
        const { data: itemData, error: itemError } = await supabase
          .from('catalog_items')
          .select('*')
          .eq('id', itemId)
          .single();

        if (itemError || !itemData) throw itemError;
        setItem(itemData);

        const { data: bizData, error: bizError } = await supabase
          .from('businesses')
          .select('*, users(name, avatar_url)')
          .eq('id', itemData.business_id)
          .single();

        if (!bizError && bizData) {
          const ownerData = Array.isArray(bizData.users) ? bizData.users[0] : bizData.users;
          
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
            owner_name: ownerData?.name || bizData.owner_name || "Unknown Owner",
            owner_avatar: ownerData?.avatar_url || bizData.owner_avatar,
            cover_image: bizData.cover_image || bizData.image_urls?.[0],
            logo: bizData.logo || bizData.owner_avatar,
            distance: "0.5 km away",
            catalog: []
          });
        }
      } catch (e) {
        console.error(e);
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

  const handleMessage = useCallback(() => {
    // Navigate to chat
    if (business) {
      router.push(`/chat/business/${business.id}?itemId=${item?.id}` as any);
    }
  }, [business, item, router]);

  const handleBuy = useCallback(() => {
    if (!item) return;
    router.push({
      pathname: '/checkout/[id]',
      params: { id: item.id, type: 'catalog_item' }
    });
  }, [item, router]);

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!item || !business) {
    return (
      <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Item not found</Text>
      </View>
    );
  }

  const isOwner = user?.id === business.owner_id;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Images */}
        <View style={s.imageContainer}>
          <Image 
            source={{ uri: item.images?.[currentImageIndex] || 'https://via.placeholder.com/400' }} 
            style={StyleSheet.absoluteFillObject} 
            contentFit="cover" 
          />
          <View style={s.imageOverlay} />

          {/* Back btn */}
          <TouchableOpacity 
            style={[s.backBtn, { top: insets.top + 10, backgroundColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }]} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
          </TouchableOpacity>

          {/* Nav arrows */}
          {item.images && item.images.length > 1 && (
            <View style={s.navArrowContainer}>
              <TouchableOpacity 
                style={[s.navBtn, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }]} 
                onPress={() => setCurrentImageIndex(prev => (prev - 1 + item.images.length) % item.images.length)}
              >
                <Ionicons name="chevron-back" size={20} color={isDarkMode ? '#fff' : '#000'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.navBtn, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }]} 
                onPress={() => setCurrentImageIndex(prev => (prev + 1) % item.images.length)}
              >
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#fff' : '#000'} />
              </TouchableOpacity>
            </View>
          )}

          {/* Indicators */}
          {item.images && item.images.length > 1 && (
            <View style={s.indicators}>
              {item.images.map((_, idx) => (
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
              <View style={[s.catBadge, { borderColor: colors.borderLight }]}>
                <Text style={[s.catBadgeTxt, { color: colors.textSecondary }]}>{item.category}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.priceTxt, { color: colors.tint }]}>₦{item.price.toLocaleString()}</Text>
              {!item.in_stock && (
                <View style={[s.outOfStockBadge, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Out of Stock</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={[s.descTxt, { color: colors.textSecondary }]}>{item.description}</Text>

          {/* Business Info Card */}
          <TouchableOpacity 
            style={[s.bizCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            onPress={() => router.push(`/businesses/${business.id}` as any)}
          >
            <Image source={{ uri: business.logo || 'https://via.placeholder.com/150' }} style={s.bizLogo} />
            <View style={{ flex: 1 }}>
              <Text style={[s.bizName, { color: colors.text }]}>{business.name}</Text>
              <View style={s.bizMetaRow}>
                <Ionicons name="star" size={12} color="#FBBF24" />
                <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 4 }}>{business.rating?.toFixed(1) || "0.0"}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginHorizontal: 4 }}>•</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{business.review_count || 0} reviews</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Actions */}
          <View style={s.actionRow}>
            {!isOwner ? (
              item.in_stock ? (
                <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.tint, flex: 1 }]} onPress={handleBuy}>
                  <Text style={[s.primaryBtnTxt, { color: '#000' }]}>Buy Now</Text>
                </TouchableOpacity>
              ) : (
                <View style={[s.primaryBtn, { backgroundColor: colors.borderLight, flex: 1 }]}>
                  <Text style={[s.primaryBtnTxt, { color: colors.textMuted }]}>Unavailable</Text>
                </View>
              )
            ) : null}
            <TouchableOpacity 
              style={[s.outlineBtn, { borderColor: colors.tint, flex: isOwner ? 1 : 0, paddingHorizontal: isOwner ? 0 : 20 }]} 
              onPress={handleCall}
              disabled={!business.phone}
            >
              <Ionicons name="call-outline" size={18} color={business.phone ? colors.tint : colors.textMuted} />
              {isOwner && <Text style={[s.outlineBtnTxt, { color: business.phone ? colors.tint : colors.textMuted, marginLeft: 8 }]}>Call Business</Text>}
            </TouchableOpacity>
          </View>

          {!isOwner && (
            <TouchableOpacity style={[s.outlineBtn, { borderColor: colors.borderLight, marginTop: 12 }]} onPress={handleMessage}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
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
  backBtn: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
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
