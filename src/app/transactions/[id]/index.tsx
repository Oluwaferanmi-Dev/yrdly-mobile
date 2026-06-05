import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/use-supabase-auth';
import { formatPrice } from '../../../lib/utils';

const GREEN = '#388E3C';

type EscrowStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'disputed' | 'cancelled';

interface TxDetail {
  id: string;
  amount: number;
  commission: number;
  seller_amount: number;
  status: EscrowStatus;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  buyer_id: string;
  seller_id: string;
  item: { id: string; title: string; images: string[] | null; price: number } | null;
  buyer: { id: string; name: string; avatar_url: string | null } | null;
  seller: { id: string; name: string; avatar_url: string | null } | null;
}

const STATUS_META: Record<EscrowStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: 'Awaiting Payment', color: '#E65100', bg: '#FFF3E0', icon: 'time-outline' },
  paid:      { label: 'Paid — Awaiting Handover', color: '#1565C0', bg: '#E3F2FD', icon: 'cube-outline' },
  shipped:   { label: 'Item Sent / Handed Over', color: '#6A1B9A', bg: '#F3E5F5', icon: 'car-outline' },
  delivered: { label: 'Delivered', color: '#2E7D32', bg: '#E8F5E9', icon: 'checkmark-circle-outline' },
  completed: { label: 'Completed', color: '#2E7D32', bg: '#E8F5E9', icon: 'checkmark-done-circle-outline' },
  disputed:  { label: 'Disputed', color: '#B71C1C', bg: '#FFEBEE', icon: 'warning-outline' },
  cancelled: { label: 'Cancelled', color: '#757575', bg: '#F5F5F5', icon: 'close-circle-outline' },
};

const TIMELINE_STEPS: { status: EscrowStatus; label: string; tsKey: keyof TxDetail }[] = [
  { status: 'pending',   label: 'Order created',       tsKey: 'created_at' },
  { status: 'paid',      label: 'Payment confirmed',   tsKey: 'paid_at' },
  { status: 'shipped',   label: 'Item sent / handed over', tsKey: 'shipped_at' },
  { status: 'completed', label: 'Receipt confirmed',   tsKey: 'completed_at' },
];

const STATUS_ORDER: EscrowStatus[] = ['pending', 'paid', 'shipped', 'delivered', 'completed'];

function fmt(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [tx, setTx] = useState<TxDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);



  const fetchTx = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select(`
          id, amount, commission, seller_amount, status,
          created_at, paid_at, shipped_at, delivered_at, completed_at,
          buyer_id, seller_id,
          item:posts(id, title, images:image_urls, price),
          buyer:users!escrow_transactions_buyer_id_fkey(id, name, avatar_url),
          seller:users!escrow_transactions_seller_id_fkey(id, name, avatar_url)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;

      const normalised = {
        ...data,
        item: Array.isArray(data.item) ? data.item[0] ?? null : data.item,
        buyer: Array.isArray(data.buyer) ? data.buyer[0] ?? null : data.buyer,
        seller: Array.isArray(data.seller) ? data.seller[0] ?? null : data.seller,
      } as TxDetail;
      setTx(normalised);
    } catch {
      Alert.alert('Error', 'Transaction not found.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTx(); }, [fetchTx]);

  const isBuyer = tx?.buyer_id === user?.id;
  const isSeller = tx?.seller_id === user?.id;
  const counterparty = isBuyer ? tx?.seller : tx?.buyer;

  // ── Seller: mark item as sent ───────────────────────────────
  const handleMarkSent = async () => {
    if (!tx || !user) return;
    Alert.alert(
      'Mark as Sent?',
      "Confirm that you've handed over or dispatched the item to the buyer.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { error } = await supabase
                .from('escrow_transactions')
                .update({ status: 'shipped', shipped_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('id', tx.id)
                .eq('seller_id', user.id);
              if (error) throw error;
              await fetchTx();
              Alert.alert('Done!', 'The buyer has been notified that you\'ve sent the item.');
            } catch {
              Alert.alert('Error', 'Could not update the transaction. Please try again.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── Buyer: confirm receipt → releases funds ─────────────────
  const handleConfirmReceipt = async () => {
    if (!tx || !user) return;
    Alert.alert(
      'Confirm Receipt?',
      `This will release ${formatPrice(tx.seller_amount)} to the seller. Only confirm if you have received the item.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Receipt',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { error } = await supabase
                .from('escrow_transactions')
                .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('id', tx.id)
                .eq('buyer_id', user.id);
              if (error) throw error;
              await fetchTx();
              Alert.alert('🎉 Done!', 'Funds have been released to the seller. Thank you!');
            } catch {
              Alert.alert('Error', 'Could not confirm receipt. Please try again.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };



  if (loading || !tx) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
      </SafeAreaView>
    );
  }

  const meta = STATUS_META[tx.status];
  const currentStepIndex = STATUS_ORDER.indexOf(tx.status);
  const thumb = tx.item?.images?.[0];

  const canMarkSent = isSeller && tx.status === 'paid';
  const canConfirmReceipt = isBuyer && (tx.status === 'shipped' || tx.status === 'delivered');
  const canDispute = (isBuyer || isSeller) && ['paid', 'shipped', 'delivered'].includes(tx.status);
  const canReview = isBuyer && tx.status === 'completed';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status badge */}
        <View style={[styles.statusBanner, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon as any} size={22} color={meta.color} />
          <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>

        {/* Item card */}
        <View style={styles.card}>
          <View style={styles.itemRow}>
            {thumb ? (
              <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Ionicons name="cube-outline" size={24} color="#9E9E9E" />
              </View>
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle} numberOfLines={2}>{tx.item?.title ?? 'Item'}</Text>
              <Text style={styles.txId} numberOfLines={1}>ID: {tx.id.slice(0, 8)}…</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Item price</Text>
            <Text style={styles.priceValue}>{formatPrice(tx.amount)}</Text>
          </View>
          {isSeller && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>You'll receive</Text>
              <Text style={[styles.priceValue, { color: GREEN }]}>{formatPrice(tx.seller_amount)}</Text>
            </View>
          )}
        </View>

        {/* Counterparty */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{isBuyer ? 'Seller' : 'Buyer'}</Text>
          <View style={styles.personRow}>
            {counterparty?.avatar_url ? (
              <Image source={{ uri: counterparty.avatar_url }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{counterparty?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
            <Text style={styles.personName}>{counterparty?.name ?? 'User'}</Text>
            <TouchableOpacity
              style={styles.messageBtn}
              onPress={() => {
                /* Find or create a conversation then navigate */
                router.push(`/profile/${counterparty?.id}` as any);
              }}
            >
              <Ionicons name="chatbubble-outline" size={16} color={GREEN} />
              <Text style={styles.messageBtnText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {TIMELINE_STEPS.map((step, i) => {
            const done = STATUS_ORDER.indexOf(step.status) <= currentStepIndex
              && tx.status !== 'cancelled';
            const ts = tx[step.tsKey] as string | null;
            return (
              <View key={step.status} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, done && styles.timelineDotDone]}>
                    {done && <Ionicons name="checkmark" size={12} color="#FFF" />}
                  </View>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <View style={[styles.timelineLine, done && styles.timelineLineDone]} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, done && styles.timelineLabelDone]}>
                    {step.label}
                  </Text>
                  {ts ? (
                    <Text style={styles.timelineTs}>{fmt(ts)}</Text>
                  ) : (
                    <Text style={styles.timelinePending}>Pending</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Disputed state */}
        {tx.status === 'disputed' && (
          <View style={[styles.card, styles.disputeCard]}>
            <Ionicons name="warning" size={20} color="#B71C1C" />
            <Text style={styles.disputeText}>
              A dispute has been raised on this transaction. Our team will review and contact both parties within 24 hours.
            </Text>
          </View>
        )}

        {/* Action buttons */}
        {canMarkSent && (
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={handleMarkSent}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="cube" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryActionText}>Mark Item as Sent</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {canConfirmReceipt && (
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={handleConfirmReceipt}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryActionText}>Confirm I Received the Item</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {canDispute && (
          <TouchableOpacity
            style={styles.disputeAction}
            onPress={() => router.push(`/transactions/${tx.id}/dispute` as any)}
          >
            <Ionicons name="warning-outline" size={18} color="#B71C1C" style={{ marginRight: 8 }} />
            <Text style={styles.disputeActionText}>Open a Dispute</Text>
          </TouchableOpacity>
        )}

        {canReview && (
          <TouchableOpacity
            style={styles.reviewAction}
            onPress={() => router.push(`/transactions/${tx.id}/review` as any)}
          >
            <Ionicons name="star-outline" size={18} color={GREEN} style={{ marginRight: 8 }} />
            <Text style={styles.reviewActionText}>Leave a Review</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  scroll: { padding: 16, paddingBottom: 40 },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16,
    marginBottom: 16, gap: 10,
  },
  statusLabel: { fontSize: 15, fontWeight: '700', flex: 1 },

  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#424242', marginBottom: 14 },

  itemRow: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: 12, marginRight: 14 },
  thumbPlaceholder: { backgroundColor: '#F2F2F2', justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1C', marginBottom: 4 },
  txId: { fontSize: 11, color: '#BDBDBD' },
  divider: { height: 1, backgroundColor: '#F2F2F2', marginVertical: 14 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  priceLabel: { fontSize: 14, color: '#9E9E9E' },
  priceValue: { fontSize: 15, fontWeight: '700', color: '#1C1C1C' },

  personRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarFallback: { backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 16, fontWeight: '700', color: GREEN },
  personName: { fontSize: 15, fontWeight: '600', color: '#1C1C1C', flex: 1 },
  messageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: GREEN,
  },
  messageBtnText: { fontSize: 13, fontWeight: '700', color: GREEN },

  // Timeline
  timelineRow: { flexDirection: 'row', marginBottom: 0 },
  timelineLeft: { alignItems: 'center', width: 28, marginRight: 12 },
  timelineDot: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FFF',
  },
  timelineDotDone: { backgroundColor: GREEN, borderColor: GREEN },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E0E0E0', marginVertical: 2, minHeight: 24 },
  timelineLineDone: { backgroundColor: GREEN },
  timelineContent: { flex: 1, paddingBottom: 20 },
  timelineLabel: { fontSize: 14, color: '#9E9E9E', fontWeight: '500' },
  timelineLabelDone: { color: '#1C1C1C', fontWeight: '700' },
  timelineTs: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  timelinePending: { fontSize: 12, color: '#BDBDBD', marginTop: 2 },

  // Disputed
  disputeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#FFEBEE' },
  disputeText: { flex: 1, fontSize: 13, color: '#B71C1C', lineHeight: 20 },

  // Actions
  primaryAction: {
    flexDirection: 'row', height: 56, borderRadius: 28, backgroundColor: GREEN,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  primaryActionText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  disputeAction: {
    flexDirection: 'row', height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE', marginBottom: 12,
  },
  disputeActionText: { fontSize: 15, fontWeight: '700', color: '#B71C1C' },
  reviewAction: {
    flexDirection: 'row', height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#C8E6C9', backgroundColor: '#E8F5E9', marginBottom: 12,
  },
  reviewActionText: { fontSize: 15, fontWeight: '700', color: GREEN },
});
