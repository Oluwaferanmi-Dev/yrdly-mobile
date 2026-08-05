import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import LottieView from 'lottie-react-native';
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
import { G, DARK, GLASS_BG, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY, AMBER } from '../../constants/tokens';

const COMMISSION_RATE = MARKETPLACE_CONSTANTS.COMMISSION_RATE; // Kept in sync with backend
interface ItemDetails {
  id: string;
  title: string;
  price: number;
  image_urls?: string[];
  image_url?: string;
  user_id: string;
  seller?: { id: string; name: string; email: string };
}

type Stage = 'loading' | 'summary' | 'paying' | 'verifying' | 'error';

export default function CheckoutScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id, type = 'marketplace_post' } = useLocalSearchParams<{ id: string, type?: string }>();
  const { user, profile } = useAuth();

  const [stage, setStage] = useState<Stage>('loading');
  const [item, setItem] = useState<ItemDetails | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch item + seller info
  const fetchItem = useCallback(async () => {
    if (!id) return;
    try {
      if (type === 'catalog_item') {
        // Fetch from catalog_items
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
          seller: { id: userData.id, name: business.name || userData.name, email: userData.email }
        });
        setStage('summary');
      } else {
        // Fetch from posts (marketplace)
        const { data, error } = await supabase
          .from('posts')
          .select('id, title, price, image_url, image_urls, user_id, user:users!posts_user_id_fkey(id, name, email)')
          .eq('id', id)
          .single();
        if (error || !data) throw error ?? new Error('Not found');

        const seller = Array.isArray(data.user) ? data.user[0] : data.user;
        setItem({ ...data, seller } as any);
        setStage('summary');
      }
    } catch {
      Alert.alert('Error', 'Item not found.', [{ text: 'OK', onPress: () => router.back() }]);
    }
  }, [id, type]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  // 2. Initialize escrow payment via web API
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

      setTransactionId(result.transactionId);

      // If free item, paymentLink will be empty and transaction is already marked PAID
      if (!result.paymentLink) {
        router.replace({
          pathname: '/checkout/success',
          params: {
            transactionId: result.transactionId,
            itemTitle: item?.title ?? 'Item',
            amount: String(item?.price ?? 0),
          },
        } as any);
        return;
      }

      // Open in-app browser for payment
      const browserResult = await WebBrowser.openAuthSessionAsync(result.paymentLink, callbackUrl);

      if (browserResult.type === 'success' && browserResult.url) {
        setStage('verifying');

        // Extract tx_ref from the Paystack redirect URL
        const urlObj = new URL(browserResult.url);
        const txRef = urlObj.searchParams.get('tx_ref') ?? urlObj.searchParams.get('reference') ?? result.transactionId;
        const status = urlObj.searchParams.get('status');

        if (status === 'cancelled') {
          setStage('summary');
          Alert.alert('Cancelled', 'Payment was not completed.');
          return;
        }

        const verifyResult = await api.post('/api/payment/verify', { txRef });

        if (verifyResult.success) {
          router.replace({
            pathname: '/checkout/success',
            params: {
              transactionId: verifyResult.transactionId ?? txRef,
              itemTitle: item?.title ?? 'Item',
              amount: String(item?.price ?? 0),
            },
          } as any);
        } else {
          throw new Error('Payment verification failed');
        }
      } else {
        // User closed the browser manually, proactively check if payment succeeded
        setStage('verifying');
        try {
          const verifyResult = await api.post('/api/payment/verify', { txRef: result.transactionId });
          if (verifyResult.success) {
            router.replace({
              pathname: '/checkout/success',
              params: {
                transactionId: result.transactionId,
                itemTitle: item?.title ?? 'Item',
                amount: String(item?.price ?? 0),
              },
            } as any);
          } else {
            setStage('summary');
          }
        } catch (e) {
          setStage('summary');
        }
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
  if (stage === 'paying' || stage === 'verifying') {
    const isVerifying = stage === 'verifying';
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: DARK }]}>
        <LottieView
          autoPlay
          loop
          style={{ width: 200, height: 200 }}
          source={{
            uri: isVerifying
              ? 'https://lottie.host/5c0e7b6c-f5a2-4c8c-9b0c-5a1234567890/placeh older.json'
              : 'https://lottie.host/bd082041-1e56-4996-8107-a5b72bbf6a1a/1v73RJlEKA.json'
          }}
        />
        <View style={styles.payingTextBlock}>
          <Text style={[styles.payingTitle, { color: TEXT_PRIMARY }]}>
            {isVerifying ? 'Confirming Payment' : 'Redirecting to Paystack'}
          </Text>
          <Text style={[styles.payingSubtitle, { color: MUTED }]}>
            {isVerifying
              ? 'Verifying your transaction, please wait…'
              : 'A secure browser will open for payment.'}
          </Text>
        </View>
        <View style={[styles.secureTag, { backgroundColor: SURFACE }]}>
          <Ionicons name="lock-closed-outline" size={13} color={G} style={{ marginRight: 5 }} />
          <Text style={[styles.secureTagText, { color: G }]}>256-bit encrypted</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: DARK }]}>
      <View style={[styles.header, { backgroundColor: SURFACE, borderBottomColor: GLASS_BORDER }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TEXT_PRIMARY }]}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Item card */}
        <View style={[styles.itemCard, { backgroundColor: SURFACE, borderColor: GLASS_BORDER }]}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.itemThumb} contentFit="cover" />
          ) : (
            <View style={[styles.itemThumb, styles.itemThumbPlaceholder, { backgroundColor: SURFACE }]}>
              <Feather name="image" size={32} color={MUTED} />
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitle, { color: TEXT_PRIMARY }]} numberOfLines={2}>{item?.title}</Text>
            <Text style={[styles.sellerName, { color: MUTED }]}>by {item?.seller?.name ?? 'Seller'}</Text>
          </View>
        </View>

        {/* Price breakdown */}
        <View style={{ borderRadius: 20, padding: 18, marginBottom: 16, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER }}>
          <Text style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: 16, color: TEXT_PRIMARY, marginBottom: 12 }}>Order Summary</Text>
          <View style={{ height: 1, backgroundColor: GLASS_BORDER, marginBottom: 12 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: MUTED }}>Item price</Text>
            <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 14, color: TEXT_PRIMARY }}>{formatPrice(item?.price ?? 0)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: MUTED }}>Platform fee (3%)</Text>
            <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 14, color: G }}>{formatPrice(commission)}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: GLASS_BORDER, marginVertical: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: 16, color: TEXT_PRIMARY }}>Total</Text>
            <Text style={{ fontFamily: 'Outfit', fontWeight: '900', fontSize: 18, color: G }}>{formatPrice((item?.price ?? 0) + commission)}</Text>
          </View>
        </View>

        {/* Escrow explanation */}
        <View style={{ flexDirection: 'row', padding: 16, borderRadius: 20, backgroundColor: G + '10', borderWidth: 1, borderColor: G + '25', marginBottom: 20 }}>
          <Feather name="shield" size={20} color={G} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: 14, color: G, marginBottom: 2 }}>Secure Escrow Protection</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 12, color: MUTED, lineHeight: 18 }}>
              Your money is held securely until you confirm you've received the item. If anything goes wrong, we'll help resolve it.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={{ padding: 16, backgroundColor: DARK, borderTopWidth: 1, borderTopColor: GLASS_BORDER }}>
        <TouchableOpacity style={{ height: 50, borderRadius: 25, backgroundColor: G, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }} onPress={handleInitializePayment} activeOpacity={0.85}>
          <Feather name="lock" size={16} color="#000" style={{ marginRight: 8 }} />
          <Text style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: 15, color: '#000' }}>Pay {formatPrice(item?.price ?? 0)} securely</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Inter', fontSize: 11, color: MUTED, textAlign: 'center', marginTop: 10 }}>🔒 Powered by Paystack Secure Payments</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { padding: 20, paddingBottom: 120 },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },

  itemCard: {
    flexDirection: 'row', borderRadius: 16,
    padding: 16, marginBottom: 16, alignItems: 'center',
    borderWidth: 1, elevation: 0, shadowOpacity: 0,
  },
  itemThumb: { width: 72, height: 72, borderRadius: 12, marginRight: 14 },
  itemThumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sellerName: { fontSize: 13 },

  summaryCard: {
    borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 1, elevation: 0, shadowOpacity: 0,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  divider: { height: 1, marginVertical: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rowLabel: { fontSize: 15 },
  rowValue: { fontSize: 15, fontWeight: '600' },
  totalLabel: { fontSize: 17, fontWeight: '800' },
  totalValue: { fontSize: 22, fontWeight: '800' },

  escrowBanner: {
    flexDirection: 'row', borderRadius: 16,
    padding: 16, alignItems: 'flex-start',
  },
  escrowTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  escrowBody: { fontSize: 12, lineHeight: 18 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20,
    borderTopWidth: 1,
  },
  payBtn: {
    flexDirection: 'row', height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4,
  },
  payBtnText: { fontSize: 17, fontWeight: '800' },
  poweredBy: { textAlign: 'center', marginTop: 10, fontSize: 12 },

  payingTextBlock: { alignItems: 'center', paddingHorizontal: 32, marginTop: 8, marginBottom: 24 },
  payingTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center', letterSpacing: -0.3 },
  payingSubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  secureTag: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  secureTagText: { fontSize: 12, fontWeight: '700' },

  errorTitle: { fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  errorMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24, maxWidth: 280 },
  retryBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24 },
  retryBtnText: { fontWeight: '700', fontSize: 15 },
});
