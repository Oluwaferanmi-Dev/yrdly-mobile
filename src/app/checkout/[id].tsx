import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ActivityIndicator,
  TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { api, WEB_APP_URL } from '../../lib/api';
import { useAuth } from '../../hooks/use-supabase-auth';
import { formatPrice } from '../../lib/utils';
import { useAppTheme } from '../../context/ThemeContext';

const GREEN = '#388E3C';
const COMMISSION_RATE = 0.05; // 5% — kept in sync with backend

interface ItemDetails {
  id: string;
  title: string;
  price: number;
  images?: string[];
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
  const [paymentLink, setPaymentLink] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const webViewRef = useRef<any>(null);

  // 1. Fetch item + seller info
  const fetchItem = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, price, images, user_id, users:user_id(id, name, email)')
        .eq('id', id)
        .single();
      if (error || !data) throw error ?? new Error('Not found');

      const seller = Array.isArray(data.users) ? data.users[0] : data.users;
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
        }
      );
      setPaymentLink(result.paymentLink);
      setTransactionId(result.transactionId);
    } catch (e: any) {
      setStage('error');
      setErrorMsg(e?.message ?? 'Could not initialize payment.');
    }
  };

  // 3. Intercept Flutterwave's redirect back to /payment/verify
  const handleNavigationChange = useCallback(async (navState: any) => {
    const url: string = navState.url ?? '';
    if (!url.includes('/payment/verify') && !url.includes('payment/verify')) return;

    // Stop WebView from loading that page
    webViewRef.current?.stopLoading();
    setStage('verifying');

    try {
      // Extract Flutterwave numeric transaction_id from redirect URL
      const urlObj = new URL(url.startsWith('http') ? url : `https://placeholder.com${url}`);
      const flwTxId = urlObj.searchParams.get('transaction_id');
      const txRef = urlObj.searchParams.get('tx_ref') ?? transactionId;
      const status = urlObj.searchParams.get('status');

      if (status === 'cancelled') {
        setStage('summary');
        Alert.alert('Cancelled', 'Payment was not completed.');
        return;
      }

      const result = await api.post('/api/payment/verify', {
        transactionReference: flwTxId ? parseInt(flwTxId) : null,
        txRef,
      });

      if (result.success) {
        router.replace({
          pathname: '/checkout/success',
          params: {
            transactionId: result.transactionId ?? txRef,
            itemTitle: item?.title ?? 'Item',
            amount: String(item?.price ?? 0),
          },
        } as any);
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (e: any) {
      setStage('error');
      setErrorMsg(e?.message ?? 'Payment verification failed. Please contact support.');
    }
  }, [transactionId, item]);

  const commission = item ? Math.round(item.price * COMMISSION_RATE) : 0;
  const thumbnail = item?.images?.[0];

  // ── Loading ──────────────────────────────────────────────────
  if (stage === 'loading') {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
      </SafeAreaView>
    );
  }

  // ── Payment WebView ──────────────────────────────────────────
  if (stage === 'paying' || stage === 'verifying') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
        <View style={styles.webHeader}>
          <TouchableOpacity onPress={() => setStage('summary')} style={styles.backBtn}>
            <Ionicons name="close" size={24} color="#1C1C1C" />
          </TouchableOpacity>
          <Text style={styles.webHeaderTitle}>Secure Payment</Text>
          <View style={{ width: 40 }} />
        </View>
        {stage === 'verifying' ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={styles.verifyingText}>Verifying your payment…</Text>
          </View>
        ) : paymentLink ? (
          <WebView
            ref={webViewRef}
            source={{ uri: paymentLink }}
            onNavigationStateChange={handleNavigationChange}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={GREEN} />
              </View>
            )}
          />
        ) : (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={{ marginTop: 12, color: '#9E9E9E' }}>Preparing payment…</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="warning-outline" size={48} color="#E53935" />
        <Text style={styles.errorTitle}>Payment failed</Text>
        <Text style={styles.errorMsg}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => setStage('summary')}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Order Summary ────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Item card */}
        <View style={styles.itemCard}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.itemThumb} contentFit="cover" />
          ) : (
            <View style={[styles.itemThumb, styles.itemThumbPlaceholder]}>
              <Ionicons name="image-outline" size={32} color="#9E9E9E" />
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={2}>{item?.title}</Text>
            <Text style={styles.sellerName}>by {item?.seller?.name ?? 'Seller'}</Text>
          </View>
        </View>

        {/* Price breakdown */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Item price</Text>
            <Text style={styles.rowValue}>{formatPrice(item?.price ?? 0)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Platform fee</Text>
            <Text style={[styles.rowValue, { color: GREEN }]}>FREE</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(item?.price ?? 0)}</Text>
          </View>
        </View>

        {/* Escrow explanation */}
        <View style={styles.escrowBanner}>
          <Ionicons name="shield-checkmark" size={22} color={GREEN} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.escrowTitle}>Protected by Yrdly Escrow</Text>
            <Text style={styles.escrowBody}>
              Your money is held securely until you confirm you've received the item. If anything goes wrong, we'll help resolve it.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.payBtn} onPress={handleInitializePayment} activeOpacity={0.85}>
          <Ionicons name="lock-closed" size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.payBtnText}>Pay {formatPrice(item?.price ?? 0)} securely</Text>
        </TouchableOpacity>
        <Text style={styles.poweredBy}>🔒 Powered by Flutterwave Escrow</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', padding: 24 },
  scroll: { padding: 20, paddingBottom: 120 },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F2F2', backgroundColor: '#FFF',
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1C', flex: 1, textAlign: 'center' },

  webHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: '#FFF',
  },
  webHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1C', flex: 1, textAlign: 'center' },

  itemCard: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16,
    padding: 16, marginBottom: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  itemThumb: { width: 72, height: 72, borderRadius: 12, marginRight: 14 },
  itemThumbPlaceholder: { backgroundColor: '#F2F2F2', justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1C', marginBottom: 4 },
  sellerName: { fontSize: 13, color: '#9E9E9E' },

  summaryCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1C', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#F2F2F2', marginVertical: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rowLabel: { fontSize: 15, color: '#616161' },
  rowValue: { fontSize: 15, fontWeight: '600', color: '#1C1C1C' },
  totalLabel: { fontSize: 17, fontWeight: '800', color: '#1C1C1C' },
  totalValue: { fontSize: 22, fontWeight: '800', color: GREEN },

  escrowBanner: {
    flexDirection: 'row', backgroundColor: '#E8F5E9', borderRadius: 16,
    padding: 16, alignItems: 'flex-start',
  },
  escrowTitle: { fontSize: 14, fontWeight: '700', color: '#2E7D32', marginBottom: 4 },
  escrowBody: { fontSize: 12, color: '#388E3C', lineHeight: 18 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, backgroundColor: '#FAFAFA',
    borderTopWidth: 1, borderTopColor: '#F2F2F2',
  },
  payBtn: {
    flexDirection: 'row', height: 56, borderRadius: 28, backgroundColor: GREEN,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4,
  },
  payBtnText: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  poweredBy: { textAlign: 'center', marginTop: 10, color: '#9E9E9E', fontSize: 12 },

  verifyingText: { marginTop: 16, color: '#616161', fontSize: 15 },
  errorTitle: { fontSize: 22, fontWeight: '800', color: '#1C1C1C', marginTop: 16, marginBottom: 8 },
  errorMsg: { fontSize: 14, color: '#616161', textAlign: 'center', lineHeight: 20, marginBottom: 24, maxWidth: 280 },
  retryBtn: { paddingHorizontal: 32, paddingVertical: 14, backgroundColor: GREEN, borderRadius: 24 },
  retryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
