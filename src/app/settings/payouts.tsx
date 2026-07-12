import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/use-supabase-auth';
import { formatPrice } from '../../lib/utils';
import { useAppTheme } from '../../context/ThemeContext';

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
          .eq('user_id', user.id)
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
      <View style={[styles.payoutCard, { backgroundColor: colors.card }]}>
        <View style={styles.payoutLeft}>
          <View style={[styles.payoutIconWrap, { backgroundColor: meta.bg }]}>
            <Feather name={meta.icon as any} size={20} color={meta.color} />
          </View>
          <View>
            <Text style={styles.payoutAmount}>{formatPrice(item.amount)}</Text>
            <Text style={styles.payoutDate}>{fmt(item.created_at)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#131313' }]}>
      <View style={[styles.header, { backgroundColor: '#131313', borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Payouts</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#82E157" /></View>
      ) : (
        <FlatList
          data={payouts}
          keyExtractor={p => p.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor="#82E157" />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* Balance card */}
              <View style={[styles.balanceCard, { backgroundColor: '#1C1C1C', borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1 }]}>
                <View style={styles.balanceIconWrap}>
                  <Feather name="dollar-sign" size={24} color="#82E157" />
                </View>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceAmount}>{formatPrice(balance)}</Text>
                <TouchableOpacity
                  style={[styles.withdrawBtn, (balance <= 0 || requesting) && styles.withdrawBtnDisabled]}
                  onPress={handleRequestPayout}
                  disabled={balance <= 0 || requesting}
                >
                  {requesting
                    ? <ActivityIndicator color="#111" size="small" />
                    : <Text style={[styles.withdrawBtnText, { color: '#111' }]}>Withdraw Funds</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/settings/payout-settings' as any)} style={styles.bankLink}>
                  <Feather name="briefcase" size={14} color="#82E157" />
                  <Text style={styles.bankLinkText}>Manage bank account</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.historyTitle, { color: '#FFFFFF' }]}>Payout History</Text>
            </View>
          }
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="credit-card" size={48} color="rgba(255,255,255,0.1)" />
              <Text style={[styles.emptyTitle, { color: '#FFFFFF' }]}>No payouts yet</Text>
              <Text style={[styles.emptyBody, { color: '#A6A6A6' }]}>Funds from completed sales will appear here.</Text>
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
