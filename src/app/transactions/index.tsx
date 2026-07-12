import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { formatPrice } from '../../lib/utils';
import { useAppTheme } from '../../context/ThemeContext';



type EscrowStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'disputed' | 'cancelled';

interface Transaction {
  id: string;
  amount: number;
  status: EscrowStatus;
  created_at: string;
  buyer_id: string;
  seller_id: string;
  item_title?: string | null;
  item: { id: string; title: string; images: string[] | null } | null;
  buyer: { name: string; avatar_url: string | null } | null;
  seller: { name: string; avatar_url: string | null } | null;
}

const STATUS_META: Record<EscrowStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending:   { label: 'Awaiting Payment',      color: '#D84315', bg: '#FFF3E0', dot: '#FF6D00' },
  paid:      { label: 'Paid — Awaiting Delivery', color: '#1565C0', bg: '#E8F0FE', dot: '#1A73E8' },
  shipped:   { label: 'Shipped',               color: '#6A1B9A', bg: '#F3E5F5', dot: '#8E24AA' },
  delivered: { label: 'Delivered',             color: '#2E7D32', bg: '#E8F5E9', dot: '#43A047' },
  completed: { label: 'Completed',             color: '#2E7D32', bg: '#E8F5E9', dot: '#43A047' },
  disputed:  { label: 'Disputed',              color: '#B71C1C', bg: '#FFEBEE', dot: '#E53935' },
  cancelled: { label: 'Cancelled',             color: '#616161', bg: '#F5F5F5', dot: '#9E9E9E' },
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
          buyer:users!buyer_id(name, avatar_url),
          seller:users!seller_id(name, avatar_url)
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
        style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
        onPress={() => router.push(`/transactions/${tx.id}` as any)}
        activeOpacity={0.85}
      >
        {/* Thumbnail */}
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.inputBackground }]}>
            <Feather name="box" size={22} color={colors.textMuted} />
          </View>
        )}

        {/* Info */}
        <View style={styles.txInfo}>
          <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>
            {tx.item?.title || tx.item_title || 'Item'}
          </Text>
          <Text style={[styles.txCounterparty, { color: colors.textMuted }]}>
            {tab === 'purchases' ? 'From' : 'To'} {counterparty?.name ?? 'User'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Amount + chevron */}
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: colors.text }]}>{formatPrice(tx.amount)}</Text>
          <Feather name="chevron-right" size={16} color={colors.textMuted} style={{ marginTop: 4 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#131313' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#131313', borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Transactions</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: '#131313', borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
        {(['purchases', 'sales'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && [styles.tabActive, { borderBottomColor: '#82E157' }]]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive, { color: tab === t ? '#82E157' : '#A6A6A6' }]}>
              {t === 'purchases' ? 'Purchases' : 'Sales'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#82E157" />
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
              tintColor="#82E157"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <LottieView
                autoPlay
                loop
                style={{ width: 160, height: 160 }}
                source={{ uri: 'https://lottie.host/1c248ba5-2d9a-4898-9b94-b0f7d3e9c90a/hhyaO2TJBJ.json' }}
              />
              <Text style={[styles.emptyTitle, { color: '#FFFFFF' }]}>No {tab} yet</Text>
              <Text style={[styles.emptyBody, { color: '#A6A6A6' }]}>
                {tab === 'purchases'
                  ? 'Items you buy on the marketplace will appear here.'
                  : 'Items you sell will appear here.'}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  headerTitle: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2 },
  tabText: { fontSize: 14, fontWeight: '600' },
  tabTextActive: {},

  listContent: { padding: 16, paddingBottom: 40 },

  txCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#1C1C1C',
  },
  thumb: { width: 60, height: 60, borderRadius: 14, marginRight: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  thumbPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(130, 225, 87, 0.1)', borderColor: 'rgba(130, 225, 87, 0.2)' },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4, color: '#FFFFFF' },
  txCounterparty: { fontSize: 13, marginBottom: 8, color: '#A6A6A6' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  txRight: { alignItems: 'flex-end', marginLeft: 8 },
  txAmount: { fontSize: 16, fontWeight: '800', color: '#82E157' },

  empty: { flex: 1, alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
