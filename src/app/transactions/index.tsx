import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { formatPrice } from '../../lib/utils';
import { useAppTheme } from '../../context/ThemeContext';
import { G, DARK, GLASS_BG, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY, AMBER } from '../../constants/tokens';



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
          id, item_id, item_type, amount, status, created_at, buyer_id, seller_id,
          post_item:posts(id, title, text, image_urls, image_url),
          catalog_item:catalog_items(id, title, images),
          buyer:users!escrow_transactions_buyer_id_fkey(name, avatar_url),
          seller:users!escrow_transactions_seller_id_fkey(name, avatar_url)
        `)
        .eq(field, user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalised = await Promise.all((data ?? []).map(async (tx: any) => {
        const postItem = Array.isArray(tx.post_item) ? tx.post_item[0] : tx.post_item;
        const catalogItem = Array.isArray(tx.catalog_item) ? tx.catalog_item[0] : tx.catalog_item;
        let itemObj = postItem 
          ? { id: postItem.id, title: postItem.title || postItem.text || 'Item', images: postItem.image_urls || [postItem.image_url] }
          : (catalogItem ? { id: catalogItem.id, title: catalogItem.title, images: catalogItem.images } : null);

        if (!itemObj && tx.item_id) {
          const { data: catData } = await supabase
            .from('catalog_items')
            .select('id, title, images')
            .eq('id', tx.item_id)
            .maybeSingle();

          if (catData) {
            const imgs = Array.isArray(catData.images) ? catData.images : typeof catData.images === 'string' ? [catData.images] : null;
            itemObj = { id: catData.id, title: catData.title || 'Item', images: imgs };
          } else {
            const { data: pData } = await supabase
              .from('posts')
              .select('id, title, text, image_urls, image_url')
              .eq('id', tx.item_id)
              .maybeSingle();

            if (pData) {
              const imgs = Array.isArray(pData.image_urls) ? pData.image_urls : pData.image_url ? [pData.image_url] : null;
              itemObj = { id: pData.id, title: pData.title || pData.text || 'Item', images: imgs };
            }
          }
        }

        return {
          ...tx,
          item: itemObj,
          buyer: Array.isArray(tx.buyer) ? tx.buyer[0] ?? null : tx.buyer,
          seller: Array.isArray(tx.seller) ? tx.seller[0] ?? null : tx.seller,
        };
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
    const imagesArr = Array.isArray(tx.item?.images) ? tx.item?.images : typeof tx.item?.images === 'string' ? [tx.item?.images] : [];
    const thumb = imagesArr[0] || (tx.item as any)?.image_url;

    return (
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: GLASS_BORDER, backgroundColor: SURFACE, marginBottom: 10 }}
        onPress={() => router.push(`/transactions/${tx.id}` as any)}
        activeOpacity={0.85}
      >
        {/* Thumbnail */}
        {thumb ? (
          <Image source={{ uri: thumb }} style={{ width: 52, height: 52, borderRadius: 14, marginRight: 14 }} contentFit="cover" />
        ) : (
          <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
            <Feather name="box" size={20} color={MUTED} />
          </View>
        )}

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 15, color: TEXT_PRIMARY, marginBottom: 2 }} numberOfLines={1}>
            {tx.item?.title || tx.item_title || 'Item'}
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: MUTED, marginBottom: 6 }}>
            {tab === 'purchases' ? 'From' : 'To'} {counterparty?.name ?? 'User'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: meta.dot + '15', borderWidth: 1, borderColor: meta.dot + '30' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: meta.dot }} />
            <Text style={{ fontFamily: 'Inter', fontWeight: '700', fontSize: 10, color: meta.dot }}>{meta.label}</Text>
          </View>
        </View>

        {/* Amount + chevron */}
        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
          <Text style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: 16, color: G }}>{formatPrice(tx.amount)}</Text>
          <Feather name="chevron-right" size={16} color={MUTED} style={{ marginTop: 4 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DARK }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: 18, color: TEXT_PRIMARY, flex: 1, textAlign: 'center' }}>Transactions</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER }}>
        {(['purchases', 'sales'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[{ flex: 1, paddingVertical: 12, alignItems: 'center' }, tab === t && { borderBottomWidth: 2, borderBottomColor: G }]}
            onPress={() => setTab(t)}
          >
            <Text style={[{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 14 }, { color: tab === t ? G : MUTED }]}>
              {t === 'purchases' ? 'Purchases' : 'Sales'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={G} />
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
              tintColor={colors.tint}
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
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No {tab} yet</Text>
              <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
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
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    borderWidth: 1, backgroundColor: 'transparent',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  txRight: { alignItems: 'flex-end', marginLeft: 8 },
  txAmount: { fontSize: 16, fontWeight: '800', color: '#82E157' },

  empty: { flex: 1, alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
