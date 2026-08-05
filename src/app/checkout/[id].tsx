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
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/use-supabase-auth';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
import { MARKETPLACE_CONSTANTS } from '../../lib/constants';
import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../../constants/tokens';

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
  const { colors } = useAppTheme();
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
      <SafeAreaView style={[styles.center, { backgroundColor: DARK }]}>
        <ActivityIndicator size="large" color={G} />
      </SafeAreaView>
    );
  }

  // ── Payment In Progress ──────────────────────────────────
  if (stage === 'paying') {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: DARK, gap: 18 }]}>
        <View style={styles.payingIconContainer}>
            <Feather name="credit-card" size={28} color={G} />
        </View>
        <View style={{ alignItems: 'center' }}>
            <Text style={styles.payingTitle}>Redirecting to Paystack</Text>
            <Text style={styles.payingSubtitle}>Your payment is being processed securely.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: DARK }]}>
        <Feather name="alert-circle" size={48} color="#E53935" />
        <Text style={[styles.errorTitle, { color: TEXT_PRIMARY }]}>Payment failed</Text>
        <Text style={[styles.errorMsg, { color: LABEL }]}>{errorMsg}</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: SURFACE }]} onPress={() => setStage('summary')}>
          <Text style={[styles.retryBtnText, { color: TEXT_PRIMARY }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Order Summary ────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: DARK }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: GLASS_BORDER }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TEXT_PRIMARY }]}>Checkout</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Item summary card */}
        <View style={[styles.card, { flexDirection: 'row', gap: 16 }]}>
          <View style={styles.itemThumbWrapper}>
            {thumbnail ? (
              <Image source={{ uri: thumbnail }} style={styles.itemThumb} contentFit="cover" />
            ) : (
              <View style={[styles.itemThumb, { backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center' }]}>
                <Feather name="image" size={24} color={MUTED} />
              </View>
            )}
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={2}>{item?.title}</Text>
            <Text style={styles.itemMeta}>Seller: {item?.seller?.name ?? 'Seller'}</Text>
            <Text style={styles.itemMeta}>{item?.condition ?? 'Used'} · {item?.area ?? 'Lagos'}</Text>
          </View>
        </View>

        {/* Delivery */}
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>DELIVERY / PICKUP</Text>

            {/* Meetup Option */}
            <TouchableOpacity 
                activeOpacity={0.7} 
                style={styles.optionRow} 
                onPress={() => setDeliveryMethod('meetup')}
            >
                <View style={[styles.radioOuter, { borderColor: deliveryMethod === 'meetup' ? G : GLASS_BORDER }]}>
                    {deliveryMethod === 'meetup' && <View style={styles.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.optionTitle, { color: deliveryMethod === 'meetup' ? '#fff' : MUTED }]}>Meet-up · {item?.area ?? 'Local Area'}</Text>
                    <Text style={styles.optionDesc}>Agree a safe public meeting point</Text>
                </View>
            </TouchableOpacity>

            {/* Delivery Option */}
            <TouchableOpacity 
                activeOpacity={0.7} 
                style={styles.optionRow} 
                onPress={() => setDeliveryMethod('delivery')}
            >
                <View style={[styles.radioOuter, { borderColor: deliveryMethod === 'delivery' ? G : GLASS_BORDER }]}>
                    {deliveryMethod === 'delivery' && <View style={styles.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.optionTitle, { color: deliveryMethod === 'delivery' ? '#fff' : MUTED }]}>Delivery (add address)</Text>
                    <Text style={styles.optionDesc}>Seller ships to you</Text>
                </View>
            </TouchableOpacity>
        </View>

        {/* Price breakdown */}
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>
            
            <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Item price</Text>
                <Text style={styles.priceValue}>{formatPrice(item?.price ?? 0)}</Text>
            </View>
            <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Platform fee</Text>
                <Text style={styles.priceValue}>{formatPrice(commission)}</Text>
            </View>

            <View style={styles.divider} />
            
            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatPrice((item?.price ?? 0) + commission)}</Text>
            </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.payBtn} onPress={handleInitializePayment} activeOpacity={0.85}>
          <Text style={styles.payBtnText}>Pay {formatPrice((item?.price ?? 0) + commission)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100, gap: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: 20, paddingBottom: 12, paddingTop: 10,
    borderBottomWidth: 1, gap: 12
  },
  backBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', flex: 1 },

  card: {
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
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
    color: '#fff',
    marginBottom: 4,
  },
  itemMeta: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: LABEL,
    marginBottom: 2,
  },

  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: LABEL,
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
    backgroundColor: G,
  },
  optionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  optionDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: LABEL,
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
    color: MUTED,
  },
  priceValue: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: GLASS_BORDER,
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
    color: '#fff',
  },
  totalValue: {
    fontFamily: 'Outfit-Black',
    fontSize: 18,
    color: G,
  },

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: GLASS_BORDER,
  },
  payBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: G,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: DARK,
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
    color: '#fff',
    marginBottom: 6,
  },
  payingSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: MUTED,
  },

  errorTitle: { fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  errorMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24, maxWidth: 280 },
  retryBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24 },
  retryBtnText: { fontWeight: '700', fontSize: 15 },
});
