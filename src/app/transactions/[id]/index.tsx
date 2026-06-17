import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/use-supabase-auth';
import { formatPrice } from '../../../lib/utils';
import { useAppTheme } from '../../../context/ThemeContext';



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
  pending:   { label: 'Awaiting Payment', color: '#E65100', bg: '#FFF3E0', icon: 'clock' },
  paid:      { label: 'Paid — Awaiting Handover', color: '#1565C0', bg: '#E3F2FD', icon: 'box' },
  shipped:   { label: 'Item Sent / Handed Over', color: '#6A1B9A', bg: '#F3E5F5', icon: 'truck' },
  delivered: { label: 'Delivered', color: '#2E7D32', bg: '#E8F5E9', icon: 'check-circle' },
  completed: { label: 'Completed', color: '#2E7D32', bg: '#E8F5E9', icon: 'check-circle' },
  disputed:  { label: 'Disputed', color: '#B71C1C', bg: '#FFEBEE', icon: 'alert-circle' },
  cancelled: { label: 'Cancelled', color: '#757575', bg: '#F5F5F5', icon: 'x-circle' },
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
  const { colors } = useAppTheme();
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
        <ActivityIndicator size="large" color={colors.tint} />
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Transaction</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status badge */}
        <View style={[styles.statusBanner, { backgroundColor: meta.bg }]}>
          <Feather name={meta.icon as any} size={22} color={meta.color} />
          <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>

        {/* Item card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={styles.itemRow}>
            {thumb ? (
              <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.inputBackground }]}>
                <Feather name="box" size={24} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>{tx.item?.title ?? 'Item'}</Text>
              <Text style={[styles.txId, { color: colors.textMuted }]} numberOfLines={1}>ID: {tx.id.slice(0, 8)}…</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Item price</Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>{formatPrice(tx.amount)}</Text>
          </View>
          {isSeller && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>You'll receive</Text>
              <Text style={[styles.priceValue, { color: colors.tint }]}>{formatPrice(tx.seller_amount)}</Text>
            </View>
          )}
        </View>

        {/* Counterparty */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{isBuyer ? 'Seller' : 'Buyer'}</Text>
          <View style={styles.personRow}>
            {counterparty?.avatar_url ? (
              <Image source={{ uri: counterparty.avatar_url }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.inputBackground }]}>
                <Text style={[styles.avatarInitial, { color: colors.tint }]}>{counterparty?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
            <Text style={[styles.personName, { color: colors.text }]}>{counterparty?.name ?? 'User'}</Text>
            <TouchableOpacity
              style={[styles.messageBtn, { borderColor: colors.tint }]}
              onPress={() => {
                /* Find or create a conversation then navigate */
                router.push(`/profile/${counterparty?.id}` as any);
              }}
            >
              <Feather name="message-circle" size={16} color={colors.tint} />
              <Text style={[styles.messageBtnText, { color: colors.tint }]}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Timeline */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Timeline</Text>
          {TIMELINE_STEPS.map((step, i) => {
            const done = STATUS_ORDER.indexOf(step.status) <= currentStepIndex
              && tx.status !== 'cancelled';
            const ts = tx[step.tsKey] as string | null;
            return (
              <View key={step.status} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { borderColor: colors.borderLight, backgroundColor: colors.card }, done && [styles.timelineDotDone, { backgroundColor: colors.tint, borderColor: colors.tint }]]}>
                    {done && <Feather name="check" size={12} color="#FFF" />}
                  </View>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: colors.borderLight }, done && [styles.timelineLineDone, { backgroundColor: colors.tint }]]} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, { color: colors.textMuted }, done && [styles.timelineLabelDone, { color: colors.text }]]}>
                    {step.label}
                  </Text>
                  {ts ? (
                    <Text style={[styles.timelineTs, { color: colors.textMuted }]}>{fmt(ts)}</Text>
                  ) : (
                    <Text style={[styles.timelinePending, { color: colors.textMuted }]}>Pending</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Disputed state */}
        {tx.status === 'disputed' && (
          <View style={[styles.card, styles.disputeCard]}>
            <Feather name="alert-triangle" size={20} color="#B71C1C" />
            <Text style={styles.disputeText}>
              A dispute has been raised on this transaction. Our team will review and contact both parties within 24 hours.
            </Text>
          </View>
        )}

        {/* Action buttons */}
        {canMarkSent && (
          <TouchableOpacity
            style={[styles.primaryAction, { backgroundColor: colors.tint, shadowColor: colors.tint }]}
            onPress={handleMarkSent}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            {actionLoading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <>
                <Feather name="box" size={20} color={colors.card} style={{ marginRight: 8 }} />
                <Text style={[styles.primaryActionText, { color: colors.card }]}>Mark Item as Sent</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {canConfirmReceipt && (
          <TouchableOpacity
            style={[styles.primaryAction, { backgroundColor: colors.tint, shadowColor: colors.tint }]}
            onPress={handleConfirmReceipt}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            {actionLoading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <>
                <Feather name="check-circle" size={20} color={colors.card} style={{ marginRight: 8 }} />
                <Text style={[styles.primaryActionText, { color: colors.card }]}>Confirm I Received the Item</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {canDispute && (
          <TouchableOpacity
            style={styles.disputeAction}
            onPress={() => router.push(`/transactions/${tx.id}/dispute` as any)}
          >
            <Feather name="alert-circle" size={18} color="#B71C1C" style={{ marginRight: 8 }} />
            <Text style={styles.disputeActionText}>Open a Dispute</Text>
          </TouchableOpacity>
        )}

        {canReview && (
          <TouchableOpacity
            style={[styles.reviewAction, { borderColor: colors.tint, backgroundColor: colors.inputBackground }]}
            onPress={() => router.push(`/transactions/${tx.id}/review` as any)}
          >
            <Feather name="star" size={18} color={colors.tint} style={{ marginRight: 8 }} />
            <Text style={[styles.reviewActionText, { color: colors.tint }]}>Leave a Review</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  backBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16,
    marginBottom: 16, gap: 10,
  },
  statusLabel: { fontSize: 15, fontWeight: '700', flex: 1 },

  card: {
    borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, elevation: 0, shadowOpacity: 0,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },

  itemRow: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: 12, marginRight: 14 },
  thumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  txId: { fontSize: 11 },
  divider: { height: 1, marginVertical: 14 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  priceLabel: { fontSize: 14 },
  priceValue: { fontSize: 15, fontWeight: '700' },

  personRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 16, fontWeight: '700' },
  personName: { fontSize: 15, fontWeight: '600', flex: 1 },
  messageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5,
  },
  messageBtnText: { fontSize: 13, fontWeight: '700' },

  // Timeline
  timelineRow: { flexDirection: 'row', marginBottom: 0 },
  timelineLeft: { alignItems: 'center', width: 28, marginRight: 12 },
  timelineDot: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  timelineDotDone: {},
  timelineLine: { width: 2, flex: 1, marginVertical: 2, minHeight: 24 },
  timelineLineDone: {},
  timelineContent: { flex: 1, paddingBottom: 20 },
  timelineLabel: { fontSize: 14, fontWeight: '500' },
  timelineLabelDone: { fontWeight: '700' },
  timelineTs: { fontSize: 12, marginTop: 2 },
  timelinePending: { fontSize: 12, marginTop: 2 },

  // Disputed
  disputeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#FFEBEE', borderWidth: 0 },
  disputeText: { flex: 1, fontSize: 13, color: '#B71C1C', lineHeight: 20 },

  // Actions
  primaryAction: {
    flexDirection: 'row', height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  primaryActionText: { fontSize: 16, fontWeight: '800' },
  disputeAction: {
    flexDirection: 'row', height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE', marginBottom: 12,
  },
  disputeActionText: { fontSize: 15, fontWeight: '700', color: '#B71C1C' },
  reviewAction: {
    flexDirection: 'row', height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, marginBottom: 12,
  },
  reviewActionText: { fontSize: 15, fontWeight: '700' },
});
