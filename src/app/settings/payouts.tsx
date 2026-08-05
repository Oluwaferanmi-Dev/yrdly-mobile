import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/use-supabase-auth';
import { formatPrice } from '../../lib/utils';
import { useAppTheme } from '../../context/ThemeContext';
import { G, DARK, GLASS_BG, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../../constants/tokens';

type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface PayoutRequest {
  id: string;
  amount: number;
  status: PayoutStatus;
  created_at: string;
  processed_at: string | null;
  bank_name: string;
  account_number: string;
}

const STATUS_META: Record<PayoutStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending:    { label: 'Pending',    color: '#E65100', bg: '#FFF3E0', icon: 'clock' },
  processing: { label: 'Processing', color: '#1565C0', bg: '#E3F2FD', icon: 'refresh-cw' },
  completed:  { label: 'Paid Out',   color: '#2E7D32', bg: '#E8F5E9', icon: 'check-circle' },
  failed:     { label: 'Failed',     color: '#B71C1C', bg: '#FFEBEE', icon: 'x-circle' },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PayoutsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [balance, setBalance] = useState(0);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      // Available balance: sum of completed transactions as seller, minus paid-out amounts
      const [{ data: txData }, { data: payoutData }] = await Promise.all([
        supabase
          .from('escrow_transactions')
          .select('seller_amount')
          .eq('seller_id', user.id)
          .eq('status', 'completed'),
        supabase
          .from('payout_requests')
          .select('id, amount, status, created_at, processed_at, bank_name, account_number')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      const earned = (txData ?? []).reduce((sum: number, t: any) => sum + (t.seller_amount ?? 0), 0);
      const paid = (payoutData ?? [])
        .filter((p: any) => ['pending', 'processing', 'completed'].includes(p.status))
        .reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);

      setBalance(Math.max(0, earned - paid));
      setPayouts((payoutData ?? []) as PayoutRequest[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRequestPayout = async () => {
    if (balance <= 0) {
      Alert.alert('No balance', 'You have no available balance to withdraw.');
      return;
    }
    Alert.alert(
      'Request Payout?',
      `Withdraw ${formatPrice(balance)} to your registered bank account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          onPress: async () => {
            setRequesting(true);
            try {
              await api.post('/api/seller/payouts/request', { amount: balance, userId: user!.id });
              Alert.alert('Requested!', 'Your payout request has been submitted. It will be processed within 1–2 business days.');
              fetchData();
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not request payout.');
            } finally {
              setRequesting(false);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: PayoutRequest }) => {
    const meta = STATUS_META[item.status] ?? STATUS_META.pending;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: GLASS_BORDER, backgroundColor: SURFACE }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: meta.bg, justifyContent: 'center', alignItems: 'center' }}>
            <Feather name={meta.icon as any} size={18} color={meta.color} />
          </View>
          <View>
            <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 16, color: TEXT_PRIMARY }}>{formatPrice(item.amount)}</Text>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: MUTED }}>{fmt(item.created_at)}</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: meta.bg }}>
          <Text style={{ fontFamily: 'Inter-Bold', fontSize: 11, color: meta.color }}>{meta.label}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DARK }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Outfit-ExtraBold', fontSize: 18, color: TEXT_PRIMARY, flex: 1, textAlign: 'center' }}>Payouts</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={G} /></View>
      ) : (
        <FlatList
          data={payouts}
          keyExtractor={p => p.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={G} />}
          ListHeaderComponent={
            <View style={{ padding: 16 }}>
              {/* Balance card */}
              <View style={{ borderRadius: 24, padding: 20, marginBottom: 20, alignItems: 'center', backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: G + '15', borderWidth: 1, borderColor: G + '25', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ fontFamily: 'Outfit-Black', fontSize: 24, color: G }}>₦</Text>
                </View>
                <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 12, color: LABEL, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Available Balance</Text>
                <Text style={{ fontFamily: 'Outfit-Black', fontSize: 36, color: TEXT_PRIMARY, marginBottom: 16 }}>{formatPrice(balance)}</Text>
                <TouchableOpacity
                  style={[{ backgroundColor: G, borderRadius: 18, paddingVertical: 14, marginBottom: 12, width: '100%', alignItems: 'center' }, (balance <= 0 || requesting) && { opacity: 0.5 }]}
                  onPress={handleRequestPayout}
                  disabled={balance <= 0 || requesting}
                >
                  {requesting
                    ? <ActivityIndicator color="#000" size="small" />
                    : <Text style={{ fontFamily: 'Outfit-ExtraBold', fontSize: 15, color: '#000' }}>Withdraw Funds</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/settings/payout-settings' as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="briefcase" size={14} color={G} />
                  <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 13, color: G }}>Manage bank account</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ fontFamily: 'Outfit-ExtraBold', fontSize: 16, color: TEXT_PRIMARY, marginBottom: 12, marginLeft: 4 }}>Payout History</Text>
            </View>
          }
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Feather name="credit-card" size={44} color={LABEL} style={{ marginBottom: 10 }} />
              <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 16, color: TEXT_PRIMARY, marginBottom: 4 }}>No payouts yet</Text>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 13, color: MUTED, textAlign: 'center' }}>Funds from completed sales will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  headerTitle: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  listHeader: { padding: 16 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },

  balanceCard: {
    borderRadius: 24, padding: 24, marginBottom: 24, alignItems: 'center',
  },
  balanceIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(130, 225, 87, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  balanceIconText: { fontSize: 26, fontWeight: '900' },
  balanceLabel: { fontSize: 14, fontWeight: '600', color: '#A6A6A6', marginBottom: 8 },
  balanceAmount: { fontSize: 40, fontWeight: '900', color: '#FFFFFF', marginBottom: 20 },
  withdrawBtn: {
    backgroundColor: '#82E157', borderRadius: 24, paddingHorizontal: 32, paddingVertical: 14, marginBottom: 16, width: '100%', alignItems: 'center'
  },
  withdrawBtnDisabled: { opacity: 0.5 },
  withdrawBtnText: { fontSize: 16, fontWeight: '800' },
  bankLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bankLinkText: { fontSize: 13, color: '#82E157', fontWeight: '600' },

  historyTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12, marginLeft: 4 },

  payoutCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#1C1C1C'
  },
  payoutLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  payoutIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  payoutAmount: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  payoutDate: { fontSize: 13, marginTop: 4, color: '#A6A6A6' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptyBody: { fontSize: 14, textAlign: 'center' },
});
