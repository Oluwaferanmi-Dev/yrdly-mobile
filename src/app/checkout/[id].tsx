import { createStyleSheet, useStyles } from "react-native-unistyles";
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert, ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/use-supabase-auth';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
import { MARKETPLACE_CONSTANTS } from '../../lib/constants';
const COMMISSION_RATE = MARKETPLACE_CONSTANTS.COMMISSION_RATE;

interface ItemDetails {
  id: string;
  title: string;
  price: number;
  image_urls?: string[];
  image_url?: string;
  user_id: string;
  seller?: { id: string; name: string; email: string };
  condition?: string; // or cond
  area?: string;
}

type Stage = 'loading' | 'summary' | 'paying' | 'error';

export default function CheckoutScreen() {
    const { styles: stylesheet, theme } = useStyles(_stylesheet);

    const router = useRouter();
  const { id, type = 'marketplace_post' } = useLocalSearchParams<{ id: string, type?: string }>();
  const { user, profile } = useAuth();

  const [stage, setStage] = useState<Stage>('loading');
  const [item, setItem] = useState<ItemDetails | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'meetup' | 'delivery'>('meetup');

  // 1. Fetch item + seller info
  const fetchItem = useCallback(async () => {
    if (!id) return;
    try {
      if (type === 'catalog_item') {
        const { data, error } = await supabase
          .from('catalog_items')
          .select('id, title, price, images, business_id, businesses(owner_id, name)')
          .eq('id', id)
          .single();
          
        if (error || !data) throw error ?? new Error('Not found');

        const business = Array.isArray(data.businesses) ? data.businesses[0] : data.businesses;
        if (!business) throw new Error('Business not found');

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', business.owner_id)
          .single();
          
        if (userError || !userData) throw userError ?? new Error('Owner not found');

        setItem({
          id: data.id,
          title: data.title,
          price: data.price,
          image_urls: data.images,
          user_id: business.owner_id,
          seller: { id: userData.id, name: business.name || userData.name, email: userData.email },
          condition: 'New',
          area: 'Nigeria'
        });
        setStage('summary');
      } else {
        const { data, error } = await supabase
          .from('posts')
          .select('id, title, price, image_url, image_urls, condition, location, user_id, user:users!posts_user_id_fkey(id, name, email)')
          .eq('id', id)
          .single();
        if (error || !data) throw error ?? new Error('Not found');

        const seller = Array.isArray(data.user) ? data.user[0] : data.user;
        let area = 'Lagos';
        if (data.location && typeof data.location === 'object' && data.location.area) {
            area = data.location.area;
        }

        setItem({ ...data, seller, area } as any);
        setStage('summary');
      }
    } catch {
      Alert.alert('Error', 'Item not found.', [{ text: 'OK', onPress: () => router.back() }]);
    }
  }, [id, type]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  // 2. Initialize payment via web API
  const handleInitializePayment = async () => {
    if (!item || !user || !profile) return;

    if (item.user_id === user.id) {
      Alert.alert('Error', "You can't buy your own item.");
      return;
    }

    setStage('paying');
    setErrorMsg('');
    try {
      const callbackUrl = makeRedirectUri({ path: 'payment-verify' });
      const result = await api.post<{ paymentLink: string; transactionId: string }>(
        '/api/payment/initialize',
        {
          itemId: item.id,
          buyerId: user.id,
          sellerId: item.user_id,
          price: item.price ?? 0,
          buyerEmail: user.email || 'no-email@yrdly.ng',
          buyerName: profile?.name ?? user.user_metadata?.name ?? 'Yrdly User',
          itemTitle: item.title,
          sellerName: item.seller?.name ?? 'Seller',
          callbackUrl,
          itemType: type,
        }
      );

      if (!result.paymentLink) {
        router.replace({
          pathname: '/checkout/success',
          params: { transactionId: result.transactionId, itemTitle: item.title, amount: String(item.price) },
        } as any);
        return;
      }

      const browserResult = await WebBrowser.openAuthSessionAsync(result.paymentLink, callbackUrl);

      if (browserResult.type === 'success' && browserResult.url) {
        // Mock verification step
        setTimeout(() => {
            router.replace({
                pathname: '/checkout/success',
                params: { transactionId: result.transactionId, itemTitle: item.title, amount: String(item.price) },
            } as any);
        }, 1500);
      } else {
        setStage('summary');
      }
    } catch (e: any) {
      setStage('error');
      setErrorMsg(e?.message ?? 'Could not initialize payment.');
    }
  };

  const commission = item ? Math.round(item.price * COMMISSION_RATE) : 0;
  const thumbnail = item?.image_urls?.[0] || item?.image_url;

  // ── Loading ──────────────────────────────────────────────────
  if (stage === 'loading') {
    return (
      <SafeAreaView style={[stylesheet.center, { backgroundColor: theme.colors.DARK }]}>
        <ActivityIndicator size="large" color={theme.colors.G} />
      </SafeAreaView>
    );
  }

  // ── Payment In Progress ──────────────────────────────────
  if (stage === 'paying') {
    return (
      <SafeAreaView style={[stylesheet.center, { backgroundColor: theme.colors.DARK, gap: 18 }]}>
        <View style={stylesheet.payingIconContainer}>
            <Feather name="credit-card" size={28} color={theme.colors.G} />
        </View>
        <View style={{ alignItems: 'center' }}>
            <Text style={stylesheet.payingTitle}>Redirecting to Paystack</Text>
            <Text style={stylesheet.payingSubtitle}>Your payment is being processed securely.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <SafeAreaView style={[stylesheet.center, { backgroundColor: theme.colors.DARK }]}>
        <Feather name="alert-circle" size={48} color="#E53935" />
        <Text style={[stylesheet.errorTitle, { color: theme.colors.TEXT_PRIMARY }]}>Payment failed</Text>
        <Text style={[stylesheet.errorMsg, { color: theme.colors.LABEL }]}>{errorMsg}</Text>
        <TouchableOpacity style={[stylesheet.retryBtn, { backgroundColor: theme.colors.SURFACE }]} onPress={() => setStage('summary')}>
          <Text style={[stylesheet.retryBtnText, { color: theme.colors.TEXT_PRIMARY }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Order Summary ────────────────────────────────────────────
  return (
    <SafeAreaView style={[stylesheet.container, { backgroundColor: theme.colors.DARK }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[stylesheet.header, { borderBottomColor: theme.colors.GLASS_BORDER }]}>
        <TouchableOpacity onPress={() => router.back()} style={stylesheet.backBtn}>
          <Feather name="chevron-left" size={24} color={theme.colors.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={[stylesheet.headerTitle, { color: theme.colors.TEXT_PRIMARY }]}>Checkout</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={stylesheet.scroll} showsVerticalScrollIndicator={false}>
        {/* Item summary card */}
        <View style={[stylesheet.card, { flexDirection: 'row', gap: 16 }]}>
          <View style={stylesheet.itemThumbWrapper}>
            {thumbnail ? (
              <Image source={{ uri: thumbnail }} style={stylesheet.itemThumb} contentFit="cover" />
            ) : (
              <View style={[stylesheet.itemThumb, { backgroundColor: theme.colors.SURFACE, alignItems: 'center', justifyContent: 'center' }]}>
                <Feather name="image" size={24} color={theme.colors.MUTED} />
              </View>
            )}
          </View>
          <View style={stylesheet.itemInfo}>
            <Text style={stylesheet.itemTitle} numberOfLines={2}>{item?.title}</Text>
            <Text style={stylesheet.itemMeta}>Seller: {item?.seller?.name ?? 'Seller'}</Text>
            <Text style={stylesheet.itemMeta}>{item?.condition ?? 'Used'} · {item?.area ?? 'Lagos'}</Text>
          </View>
        </View>

        {/* Delivery */}
        <View style={stylesheet.card}>
            <Text style={stylesheet.sectionTitle}>DELIVERY / PICKUP</Text>

            {/* Meetup Option */}
            <TouchableOpacity 
                activeOpacity={0.7} 
                style={stylesheet.optionRow} 
                onPress={() => setDeliveryMethod('meetup')}
            >
                <View style={[stylesheet.radioOuter, { borderColor: deliveryMethod === 'meetup' ? theme.colors.G : theme.colors.GLASS_BORDER }]}>
                    {deliveryMethod === 'meetup' && <View style={stylesheet.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[stylesheet.optionTitle, { color: deliveryMethod === 'meetup' ? '#fff' : theme.colors.MUTED }]}>Meet-up · {item?.area ?? 'Local Area'}</Text>
                    <Text style={stylesheet.optionDesc}>Agree a safe public meeting point</Text>
                </View>
            </TouchableOpacity>

            {/* Delivery Option */}
            <TouchableOpacity 
                activeOpacity={0.7} 
                style={stylesheet.optionRow} 
                onPress={() => setDeliveryMethod('delivery')}
            >
                <View style={[stylesheet.radioOuter, { borderColor: deliveryMethod === 'delivery' ? theme.colors.G : theme.colors.GLASS_BORDER }]}>
                    {deliveryMethod === 'delivery' && <View style={stylesheet.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[stylesheet.optionTitle, { color: deliveryMethod === 'delivery' ? '#fff' : theme.colors.MUTED }]}>Delivery (add address)</Text>
                    <Text style={stylesheet.optionDesc}>Seller ships to you</Text>
                </View>
            </TouchableOpacity>
        </View>

        {/* Price breakdown */}
        <View style={stylesheet.card}>
            <Text style={stylesheet.sectionTitle}>ORDER SUMMARY</Text>
            
            <View style={stylesheet.priceRow}>
                <Text style={stylesheet.priceLabel}>Item price</Text>
                <Text style={stylesheet.priceValue}>{formatPrice(item?.price ?? 0)}</Text>
            </View>
            <View style={stylesheet.priceRow}>
                <Text style={stylesheet.priceLabel}>Platform fee</Text>
                <Text style={stylesheet.priceValue}>{formatPrice(commission)}</Text>
            </View>

            <View style={stylesheet.divider} />
            
            <View style={stylesheet.totalRow}>
                <Text style={stylesheet.totalLabel}>Total</Text>
                <Text style={stylesheet.totalValue}>{formatPrice((item?.price ?? 0) + commission)}</Text>
            </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={stylesheet.footer}>
        <TouchableOpacity style={stylesheet.payBtn} onPress={handleInitializePayment} activeOpacity={0.85}>
          <Text style={stylesheet.payBtnText}>Pay {formatPrice((item?.price ?? 0) + commission)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const _stylesheet = createStyleSheet(theme => ({
      container: { flex: 1 },
      center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
      scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100, gap: 16 },

      header: {
        flexDirection: 'row', alignItems: 'center', 
        paddingHorizontal: 20, paddingBottom: 12, paddingTop: 10,
        borderBottomWidth: 1, gap: 12
      },
      backBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: theme.colors.SURFACE, borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, justifyContent: 'center', alignItems: 'center' },
      headerTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', flex: 1 },

      card: {
        backgroundColor: theme.colors.SURFACE_ALT,
        borderWidth: 1,
        borderColor: theme.colors.GLASS_BORDER,
        borderRadius: 20,
        padding: 16,
      },
      itemThumbWrapper: {
        width: 64,
        height: 64,
        borderRadius: 14,
        overflow: 'hidden',
      },
      itemThumb: {
        width: '100%',
        height: '100%',
      },
      itemInfo: {
        flex: 1,
        justifyContent: 'center',
      },
      itemTitle: {
        fontFamily: 'Outfit-Bold',
        fontSize: 15,
        color: theme.colors.TEXT_PRIMARY,
        marginBottom: 4,
      },
      itemMeta: {
        fontFamily: 'Inter-Regular',
        fontSize: 12,
        color: theme.colors.LABEL,
        marginBottom: 2,
      },

      sectionTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: theme.colors.LABEL,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
      },
      optionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 16,
      },
      radioOuter: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
      },
      radioInner: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.G,
      },
      optionTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
      },
      optionDesc: {
        fontFamily: 'Inter-Regular',
        fontSize: 12,
        color: theme.colors.LABEL,
        marginTop: 2,
      },

      priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
      },
      priceLabel: {
        fontFamily: 'Inter-Regular',
        fontSize: 14,
        color: theme.colors.MUTED,
      },
      priceValue: {
        fontFamily: 'Inter-Regular',
        fontSize: 14,
        color: theme.colors.TEXT_PRIMARY,
      },
      divider: {
        height: 1,
        backgroundColor: theme.colors.GLASS_BORDER,
        marginVertical: 12,
      },
      totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      totalLabel: {
        fontFamily: 'Outfit-Bold',
        fontSize: 16,
        color: theme.colors.TEXT_PRIMARY,
      },
      totalValue: {
        fontFamily: 'Outfit-Black',
        fontSize: 18,
        color: theme.colors.G,
      },

      footer: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        paddingBottom: 34,
        borderTopWidth: 1,
        borderTopColor: theme.colors.GLASS_BORDER,
      },
      payBtn: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 18,
        backgroundColor: theme.colors.G,
        alignItems: 'center',
        justifyContent: 'center',
      },
      payBtnText: {
        fontFamily: 'Outfit-Bold',
        fontSize: 16,
        color: '#000',
      },

      payingIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(130,219,126,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(130,219,126,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
      },
      payingTitle: {
        fontFamily: 'Outfit-Bold',
        fontSize: 20,
        color: theme.colors.TEXT_PRIMARY,
        marginBottom: 6,
      },
      payingSubtitle: {
        fontFamily: 'Inter-Regular',
        fontSize: 13,
        color: theme.colors.MUTED,
      },

      errorTitle: { fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 8 },
      errorMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24, maxWidth: 280 },
      retryBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24 },
      retryBtnText: { fontWeight: '700', fontSize: 15 },
    }));
