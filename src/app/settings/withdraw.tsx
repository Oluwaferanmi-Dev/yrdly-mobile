import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../../constants/tokens';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming, Easing,
} from 'react-native-reanimated';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/use-supabase-auth';
import { formatPrice } from '../../lib/utils';

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000];

export default function WithdrawScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [bankInfo, setBankInfo] = useState<{ account_name: string; account_number: string; bank_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Confirm modal animation
  const confirmY = useSharedValue(400);
  const overlayOp = useSharedValue(0);
  const confirmStyle = useAnimatedStyle(() => ({ transform: [{ translateY: confirmY.value }] }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOp.value }));

  const openConfirm = () => {
    setShowConfirm(true);
    overlayOp.value = withTiming(1, { duration: 220 });
    confirmY.value = withSpring(0, { damping: 22, stiffness: 200 });
  };

  const closeConfirm = () => {
    overlayOp.value = withTiming(0, { duration: 200 });
    confirmY.value = withSpring(400, { damping: 22, stiffness: 200 });
    setTimeout(() => setShowConfirm(false), 220);
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [{ data: txData }, { data: payoutData }, bankResult] = await Promise.all([
        supabase
          .from('escrow_transactions')
          .select('seller_amount')
          .eq('seller_id', user.id)
          .eq('status', 'completed'),
        supabase
          .from('payout_requests')
          .select('amount, status')
          .eq('seller_id', user.id),
        api.get('/api/seller/setup-account').catch(() => null),
      ]);

      const earned = (txData ?? []).reduce((sum: number, t: any) => sum + (t.seller_amount ?? 0), 0);
      const paid = (payoutData ?? [])
        .filter((p: any) => ['pending', 'processing', 'completed'].includes(p.status))
        .reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);
      setBalance(Math.max(0, earned - paid));

      if (bankResult?.account) {
        const acc = bankResult.account;
        setBankInfo({
          account_name: acc.accountName ?? '',
          account_number: acc.accountNumber ?? '',
          bank_name: acc.bankName ?? 'Bank',
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const numericAmount = parseFloat(amount.replace(/,/g, '')) || 0;
  const isValid = numericAmount >= 500 && numericAmount <= balance && !!bankInfo;

  const handleWithdraw = async () => {
    if (!isValid || !user) return;
    setSubmitting(true);
    try {
      await api.post('/api/seller/payouts/request', {
        amount: numericAmount,
        userId: user.id,
      });
      closeConfirm();
      // Small delay for sheet animation to complete
      setTimeout(() => {
        router.replace('/settings/withdraw-success' as any);
      }, 250);
    } catch (e: any) {
      closeConfirm();
      Alert.alert('Error', e?.message ?? 'Could not process withdrawal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatAmountInput = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('en-NG');
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: DARK }]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={G} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: DARK }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={[s.header, { borderBottomColor: GLASS_BORDER }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: TEXT_PRIMARY }]}>Withdraw Funds</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Balance card */}
          <View style={[s.balanceCard, { backgroundColor: SURFACE, borderColor: GLASS_BORDER }]}>
            <View style={[s.balanceIcon, { backgroundColor: 'rgba(130, 219, 126, 0.15)' }]}>
              <Text style={[s.balanceIconText, { color: G }]}>₦</Text>
            </View>
            <Text style={[s.balanceLabel, { color: MUTED }]}>Available Balance</Text>
            <Text style={[s.balanceAmount, { color: TEXT_PRIMARY }]}>{formatPrice(balance)}</Text>
          </View>

          {/* Bank account */}
          {bankInfo ? (
            <View style={[s.bankCard, { backgroundColor: SURFACE, borderColor: GLASS_BORDER }]}>
              <Feather name="credit-card" size={18} color={G} />
              <View style={{ flex: 1 }}>
                <Text style={[s.bankName, { color: TEXT_PRIMARY }]}>{bankInfo.bank_name}</Text>
                <Text style={[s.bankAccount, { color: MUTED }]}>
                  {bankInfo.account_number} · {bankInfo.account_name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/settings/payout-settings' as any)}>
                <Text style={[s.changeLink, { color: G }]}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.bankCard, { backgroundColor: SURFACE, borderColor: 'rgba(130, 219, 126, 0.35)', borderStyle: 'dashed' }]}
              onPress={() => router.push('/settings/payout-settings' as any)}
            >
              <Feather name="plus-circle" size={18} color={G} />
              <Text style={[s.bankName, { color: G }]}>Add Bank Account</Text>
            </TouchableOpacity>
          )}

          {/* Amount input */}
          <View style={s.inputSection}>
            <Text style={[s.inputLabel, { color: MUTED }]}>Amount to withdraw</Text>
            <View style={[s.inputWrapper, { backgroundColor: SURFACE, borderColor: numericAmount > 0 ? G : GLASS_BORDER }]}>
              <Text style={[s.nairaSign, { color: MUTED }]}>₦</Text>
              <TextInput
                value={amount}
                onChangeText={v => setAmount(formatAmountInput(v))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={LABEL}
                style={[s.input, { color: TEXT_PRIMARY }]}
                maxLength={12}
              />
            </View>
            {numericAmount > 0 && numericAmount < 500 && (
              <Text style={[s.hint, { color: '#EF4444' }]}>Minimum withdrawal is ₦500</Text>
            )}
            {numericAmount > balance && (
              <Text style={[s.hint, { color: '#EF4444' }]}>Amount exceeds available balance</Text>
            )}
          </View>

          {/* Quick amounts */}
          <View style={s.quickRow}>
            {QUICK_AMOUNTS.filter(q => q <= balance).map(q => (
              <TouchableOpacity
                key={q}
                onPress={() => setAmount(q.toLocaleString('en-NG'))}
                style={[
                  s.quickChip,
                  {
                    backgroundColor: numericAmount === q ? 'rgba(130, 219, 126, 0.15)' : SURFACE,
                    borderColor: numericAmount === q ? G : GLASS_BORDER,
                  },
                ]}
              >
                <Text style={[s.quickChipText, { color: numericAmount === q ? G : MUTED }]}>
                  ₦{(q / 1000).toFixed(0)}k
                </Text>
              </TouchableOpacity>
            ))}
            {balance > 0 && (
              <TouchableOpacity
                onPress={() => setAmount(Math.floor(balance).toLocaleString('en-NG'))}
                style={[s.quickChip, { backgroundColor: SURFACE, borderColor: GLASS_BORDER }]}
              >
                <Text style={[s.quickChipText, { color: MUTED }]}>All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Fee note */}
          <Text style={[s.feeNote, { color: MUTED }]}>
            Processing fee: ₦50 · Arrives within 1–2 business days
          </Text>

          {/* CTA */}
          <TouchableOpacity
            onPress={openConfirm}
            disabled={!isValid}
            style={[s.ctaBtn, { backgroundColor: isValid ? G : GLASS_BORDER }]}
          >
            <Text style={[s.ctaBtnText, { color: isValid ? '#000000' : LABEL }]}>
              Continue
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Confirm modal */}
      {showConfirm && (
        <Modal transparent animationType="none" visible={showConfirm} onRequestClose={closeConfirm}>
          <Animated.View style={[s.overlay, overlayStyle]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeConfirm} activeOpacity={1} />
            <Animated.View style={[s.confirmSheet, { backgroundColor: DARK, borderColor: GLASS_BORDER, borderWidth: 1 }, confirmStyle]}>
              <View style={[s.handle, { backgroundColor: GLASS_BORDER }]} />

              <Text style={[s.confirmTitle, { color: TEXT_PRIMARY }]}>Confirm Withdrawal</Text>

              <View style={[s.confirmRow, { borderColor: GLASS_BORDER }]}>
                <Text style={[s.confirmLabel, { color: MUTED }]}>Amount</Text>
                <Text style={[s.confirmValue, { color: TEXT_PRIMARY }]}>₦{numericAmount.toLocaleString('en-NG')}</Text>
              </View>
              <View style={[s.confirmRow, { borderColor: GLASS_BORDER }]}>
                <Text style={[s.confirmLabel, { color: MUTED }]}>Fee</Text>
                <Text style={[s.confirmValue, { color: TEXT_PRIMARY }]}>₦50</Text>
              </View>
              <View style={[s.confirmRow, { borderColor: GLASS_BORDER }]}>
                <Text style={[s.confirmLabel, { color: MUTED }]}>You receive</Text>
                <Text style={[s.confirmValue, { color: G }]}>
                  ₦{Math.max(0, numericAmount - 50).toLocaleString('en-NG')}
                </Text>
              </View>
              {bankInfo && (
                <View style={[s.confirmRow, { borderColor: GLASS_BORDER }]}>
                  <Text style={[s.confirmLabel, { color: MUTED }]}>To</Text>
                  <Text style={[s.confirmValue, { color: TEXT_PRIMARY }]} numberOfLines={1}>
                    {bankInfo.bank_name} · {bankInfo.account_number}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleWithdraw}
                disabled={submitting}
                style={[s.confirmBtn, { backgroundColor: G }]}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={[s.confirmBtnText]}>Withdraw Now</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={closeConfirm} style={s.cancelBtn}>
                <Text style={[s.cancelText, { color: MUTED }]}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18 },
  scroll: { padding: 20, gap: 16 },

  balanceCard: {
    borderRadius: 20, padding: 24, borderWidth: 1,
    alignItems: 'center', gap: 8,
  },
  balanceIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  balanceIconText: { fontSize: 24, fontFamily: 'Outfit-Black' },
  balanceLabel: { fontSize: 13, fontFamily: 'Inter-Regular' },
  balanceAmount: { fontSize: 36, fontFamily: 'Outfit-Black' },

  bankCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  bankName: { fontSize: 14, fontFamily: 'Outfit-Bold' },
  bankAccount: { fontSize: 12, marginTop: 2, fontFamily: 'Inter-Regular' },
  changeLink: { fontSize: 13, fontFamily: 'Outfit-Bold' },

  inputSection: { gap: 8 },
  inputLabel: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14,
  },
  nairaSign: { fontSize: 20, fontFamily: 'Outfit-Bold', marginRight: 4 },
  input: { flex: 1, fontSize: 28, fontFamily: 'Outfit-ExtraBold', paddingVertical: 14 },
  hint: { fontSize: 12, marginTop: 4, fontFamily: 'Inter-Regular' },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  quickChipText: { fontSize: 13, fontFamily: 'Outfit-SemiBold' },

  feeNote: { fontSize: 12, textAlign: 'center', fontFamily: 'Inter-Regular' },

  ctaBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  ctaBtnText: { fontSize: 16, fontFamily: 'Outfit-Bold' },

  // Confirm sheet
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  confirmSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 4,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontFamily: 'Outfit-ExtraBold', marginBottom: 12 },
  confirmRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 0.5,
  },
  confirmLabel: { fontSize: 14, fontFamily: 'Inter-Regular' },
  confirmValue: { fontSize: 14, fontFamily: 'Outfit-SemiBold', flex: 1, textAlign: 'right', marginLeft: 16 },
  confirmBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  confirmBtnText: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#000' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { fontSize: 15, fontFamily: 'Inter-Regular' },
});
