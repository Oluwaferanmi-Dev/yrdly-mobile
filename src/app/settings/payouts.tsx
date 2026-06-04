import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/use-supabase-auth';
import { formatPrice } from '../../lib/utils';

const GREEN = '#388E3C';

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
  pending:    { label: 'Pending',    color: '#E65100', bg: '#FFF3E0', icon: 'time-outline' },
  processing: { label: 'Processing', color: '#1565C0', bg: '#E3F2FD', icon: 'refresh-outline' },
  completed:  { label: 'Paid Out',   color: '#2E7D32', bg: '#E8F5E9', icon: 'checkmark-circle-outline' },
  failed:     { label: 'Failed',     color: '#B71C1C', bg: '#FFEBEE', icon: 'close-circle-outline' },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PayoutsScreen() {
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
      <View style={styles.payoutCard}>
        <View style={styles.payoutLeft}>
          <View style={[styles.payoutIconWrap, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon as any} size={20} color={meta.color} />
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payouts</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={GREEN} /></View>
      ) : (
        <FlatList
          data={payouts}
          keyExtractor={p => p.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={GREEN} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* Balance card */}
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceAmount}>{formatPrice(balance)}</Text>
                <TouchableOpacity
                  style={[styles.withdrawBtn, (balance <= 0 || requesting) && styles.withdrawBtnDisabled]}
                  onPress={handleRequestPayout}
                  disabled={balance <= 0 || requesting}
                >
                  {requesting
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={styles.withdrawBtnText}>Withdraw Funds</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/settings/payout-settings' as any)} style={styles.bankLink}>
                  <Ionicons name="business-outline" size={14} color={GREEN} />
                  <Text style={styles.bankLinkText}>Manage bank account</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.historyTitle}>Payout History</Text>
            </View>
          }
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={48} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>No payouts yet</Text>
              <Text style={styles.emptyBody}>Funds from completed sales will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F2F2', backgroundColor: '#FFF' },
  backBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1C', flex: 1, textAlign: 'center' },
  listHeader: { padding: 16 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },

  balanceCard: {
    backgroundColor: GREEN, borderRadius: 20, padding: 24, marginBottom: 24, alignItems: 'center',
    shadowColor: GREEN, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  balanceLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginBottom: 8 },
  balanceAmount: { fontSize: 40, fontWeight: '900', color: '#FFF', marginBottom: 20 },
  withdrawBtn: {
    backgroundColor: '#FFF', borderRadius: 24, paddingHorizontal: 32, paddingVertical: 13, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  withdrawBtnDisabled: { opacity: 0.5 },
  withdrawBtnText: { fontSize: 15, fontWeight: '800', color: GREEN },
  bankLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bankLinkText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600', textDecorationLine: 'underline' },

  historyTitle: { fontSize: 16, fontWeight: '800', color: '#424242', marginBottom: 12 },

  payoutCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  payoutLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  payoutIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  payoutAmount: { fontSize: 16, fontWeight: '800', color: '#1C1C1C' },
  payoutDate: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#424242', marginTop: 16, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#9E9E9E', textAlign: 'center' },
});
