import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { formatPrice } from '../../lib/utils';
import { useAppTheme } from '../../context/ThemeContext';

const GREEN = '#388E3C';

type EscrowStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'disputed' | 'cancelled';

interface Transaction {
  id: string;
  amount: number;
  status: EscrowStatus;
  created_at: string;
  buyer_id: string;
  seller_id: string;
  item: { id: string; title: string; images: string[] | null } | null;
  buyer: { name: string; avatar_url: string | null } | null;
  seller: { name: string; avatar_url: string | null } | null;
}

const STATUS_META: Record<EscrowStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: 'Awaiting Payment', color: '#E65100', bg: '#FFF3E0', icon: 'time-outline' },
  paid:      { label: 'Paid — Awaiting Delivery', color: '#1565C0', bg: '#E3F2FD', icon: 'cube-outline' },
  shipped:   { label: 'Shipped', color: '#6A1B9A', bg: '#F3E5F5', icon: 'car-outline' },
  delivered: { label: 'Delivered', color: '#2E7D32', bg: '#E8F5E9', icon: 'checkmark-circle-outline' },
  completed: { label: 'Completed', color: '#2E7D32', bg: '#E8F5E9', icon: 'checkmark-done-circle-outline' },
  disputed:  { label: 'Disputed', color: '#B71C1C', bg: '#FFEBEE', icon: 'warning-outline' },
  cancelled: { label: 'Cancelled', color: '#757575', bg: '#F5F5F5', icon: 'close-circle-outline' },
};

type Tab = 'purchases' | 'sales';

export default function TransactionsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('purchases');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);

    try {
      const field = tab === 'purchases' ? 'buyer_id' : 'seller_id';
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select(`
          id, amount, status, created_at, buyer_id, seller_id,
          item:posts(id, title, images:image_urls),
          buyer:users!escrow_transactions_buyer_id_fkey(name, avatar_url),
          seller:users!escrow_transactions_seller_id_fkey(name, avatar_url)
        `)
        .eq(field, user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalised = (data ?? []).map((tx: any) => ({
        ...tx,
        item: Array.isArray(tx.item) ? tx.item[0] ?? null : tx.item,
        buyer: Array.isArray(tx.buyer) ? tx.buyer[0] ?? null : tx.buyer,
        seller: Array.isArray(tx.seller) ? tx.seller[0] ?? null : tx.seller,
      })) as Transaction[];

      setTransactions(normalised);
    } catch (e) {
      console.error('fetchTransactions error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, tab]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const renderItem = ({ item: tx }: { item: Transaction }) => {
    const meta = STATUS_META[tx.status] ?? STATUS_META.pending;
    const counterparty = tab === 'purchases' ? tx.seller : tx.buyer;
    const thumb = tx.item?.images?.[0];

    return (
      <TouchableOpacity
        style={styles.txCard}
        onPress={() => router.push(`/transactions/${tx.id}` as any)}
        activeOpacity={0.85}
      >
        {/* Thumbnail */}
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="cube-outline" size={22} color="#9E9E9E" />
          </View>
        )}

        {/* Info */}
        <View style={styles.txInfo}>
          <Text style={styles.txTitle} numberOfLines={1}>
            {tx.item?.title ?? 'Marketplace Item'}
          </Text>
          <Text style={styles.txCounterparty}>
            {tab === 'purchases' ? 'From' : 'To'} {counterparty?.name ?? 'User'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon as any} size={11} color={meta.color} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Amount + chevron */}
        <View style={styles.txRight}>
          <Text style={styles.txAmount}>{formatPrice(tx.amount)}</Text>
          <Ionicons name="chevron-forward" size={16} color="#BDBDBD" style={{ marginTop: 4 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['purchases', 'sales'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'purchases' ? 'Purchases' : 'Sales'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(tx) => tx.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchTransactions(true)}
              tintColor={GREEN}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>No {tab} yet</Text>
              <Text style={styles.emptyBody}>
                {tab === 'purchases'
                  ? 'Items you buy on the marketplace will appear here.'
                  : 'Items you sell will appear here.'}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F2F2', backgroundColor: '#FFF',
  },
  backBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1C', flex: 1, textAlign: 'center' },

  tabs: {
    flexDirection: 'row', backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F2F2F2',
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: GREEN },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9E9E9E' },
  tabTextActive: { color: GREEN },

  listContent: { padding: 16, paddingBottom: 40 },

  txCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  thumb: { width: 56, height: 56, borderRadius: 10, marginRight: 12 },
  thumbPlaceholder: { backgroundColor: '#F2F2F2', justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1C', marginBottom: 2 },
  txCounterparty: { fontSize: 12, color: '#9E9E9E', marginBottom: 6 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  txRight: { alignItems: 'flex-end', marginLeft: 8 },
  txAmount: { fontSize: 15, fontWeight: '800', color: '#1C1C1C' },

  empty: { flex: 1, alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#424242', marginTop: 16, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#9E9E9E', textAlign: 'center', lineHeight: 20 },
});
