import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();

  const [stage, setStage] = useState<Stage>('loading');
  const [item, setItem] = useState<ItemDetails | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch item + seller info
  const fetchItem = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, price, image_url, image_urls, user_id, user:users!posts_user_id_fkey(id, name, email)')
        .eq('id', id)
        .single();
      if (error || !data) throw error ?? new Error('Not found');

      const seller = Array.isArray(data.user) ? data.user[0] : data.user;
      setItem({ ...data, seller } as any);
      setStage('summary');
    } catch {
      Alert.alert('Error', 'Item not found.', [{ text: 'OK', onPress: () => router.back() }]);
    }
  }, [id]);

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
      const callbackUrl = Linking.createURL('payment-verify');
      const result = await api.post<{ paymentLink: string; transactionId: string }>(
        '/api/payment/initialize',
        {
          itemId: item.id,
          buyerId: user.id,
          sellerId: item.user_id,
          price: item.price,
          buyerEmail: user.email,
          buyerName: profile.name ?? user.user_metadata?.name ?? 'Yrdly User',
          itemTitle: item.title,
          sellerName: item.seller?.name ?? 'Seller',
          callbackUrl,
        }
      );

      setTransactionId(result.transactionId);

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
        // User closed the browser manually
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
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </SafeAreaView>
    );
  }

  // ── Payment In Progress ──────────────────────────────────
  if (stage === 'paying' || stage === 'verifying') {
    const isVerifying = stage === 'verifying';
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
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
          <Text style={[styles.payingTitle, { color: colors.text }]}>
            {isVerifying ? 'Confirming Payment' : 'Redirecting to Paystack'}
          </Text>
          <Text style={[styles.payingSubtitle, { color: colors.textMuted }]}>
            {isVerifying
              ? 'Verifying your transaction, please wait…'
              : 'A secure browser will open for payment.'}
          </Text>
        </View>
        <View style={[styles.secureTag, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="lock-closed-outline" size={13} color={colors.tint} style={{ marginRight: 5 }} />
          <Text style={[styles.secureTagText, { color: colors.tint }]}>256-bit encrypted</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={48} color="#E53935" />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Payment failed</Text>
        <Text style={[styles.errorMsg, { color: colors.textSecondary }]}>{errorMsg}</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.inputBackground }]} onPress={() => setStage('summary')}>
          <Text style={[styles.retryBtnText, { color: colors.text }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Order Summary ────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Item card */}
        <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.itemThumb} contentFit="cover" />
          ) : (
            <View style={[styles.itemThumb, styles.itemThumbPlaceholder, { backgroundColor: colors.inputBackground }]}>
              <Feather name="image" size={32} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>{item?.title}</Text>
            <Text style={[styles.sellerName, { color: colors.textMuted }]}>by {item?.seller?.name ?? 'Seller'}</Text>
          </View>
        </View>

        {/* Price breakdown */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Summary</Text>
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Item price</Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>{formatPrice(item?.price ?? 0)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Platform fee</Text>
            <Text style={[styles.rowValue, { color: colors.tint }]}>{formatPrice(commission)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.row}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.tint }]}>{formatPrice((item?.price ?? 0) + commission)}</Text>
          </View>
        </View>

        {/* Escrow explanation */}
        <View style={[styles.escrowBanner, { backgroundColor: colors.inputBackground }]}>
          <Feather name="shield" size={22} color={colors.tint} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.escrowTitle, { color: colors.tint }]}>Secure Escrow Protection</Text>
            <Text style={[styles.escrowBody, { color: colors.textSecondary }]}>
              Your money is held securely until you confirm you've received the item. If anything goes wrong, we'll help resolve it.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
        <TouchableOpacity style={[styles.payBtn, { backgroundColor: colors.tint, shadowColor: colors.tint }]} onPress={handleInitializePayment} activeOpacity={0.85}>
          <Feather name="lock" size={18} color={colors.card} style={{ marginRight: 8 }} />
          <Text style={[styles.payBtnText, { color: colors.card }]}>Pay {formatPrice(item?.price ?? 0)} securely</Text>
        </TouchableOpacity>
        <Text style={[styles.poweredBy, { color: colors.textMuted }]}>🔒 Powered by Paystack Secure Payments</Text>
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
