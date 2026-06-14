import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { api } from '../../lib/api';
import banksData from '../../data/nigerian-banks.json';
import { useAppTheme } from '../../context/ThemeContext';

interface Bank { code: string; name: string }
const BANKS: Bank[] = banksData as Bank[];

export default function PayoutSettingsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [existing, setExisting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [bankModal, setBankModal] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  const filteredBanks = BANKS.filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase()));

  const fetchExisting = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('seller_accounts')
        .select('account_name, account_number, bank_name, bank_code, verification_status')
        .eq('user_id', user.id).eq('is_active', true).single();
      if (data) setExisting(data);
    } catch { } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchExisting(); }, [fetchExisting]);

  useEffect(() => {
    if (accountNumber.length !== 10 || !selectedBank) { setResolvedName(''); return; }
    const t = setTimeout(async () => {
      setResolving(true);
      try {
        const r = await api.get(`/api/seller/resolve-account?bank_code=${selectedBank.code}&account_number=${accountNumber}`);
        setResolvedName(r.accountName ?? '');
      } catch { setResolvedName(''); } finally { setResolving(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [accountNumber, selectedBank]);

  const handleSave = async () => {
    if (!user || !selectedBank || !resolvedName) return;
    setSaving(true);
    try {
      await api.post('/api/seller/setup-account', {
        userId: user.id, bankCode: selectedBank.code, bankName: selectedBank.name,
        accountNumber, accountName: resolvedName,
      });
      Alert.alert('Saved!', 'Bank account saved. Verification takes a few minutes.', [
        { text: 'OK', onPress: () => { fetchExisting(); setAccountNumber(''); setSelectedBank(null); setResolvedName(''); } }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save account.');
    } finally { setSaving(false); }
  };

  const canSave = selectedBank && accountNumber.length === 10 && !!resolvedName && !resolving;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>Bank Account</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {loading ? <ActivityIndicator color={colors.tint} style={{ marginTop: 32 }} /> : existing ? (
          <View style={[s.existingCard, { backgroundColor: colors.card }]}>
            <View style={s.existingRow}>
              <View style={[s.iconWrap, { backgroundColor: colors.tint + '22' }]}><Ionicons name="business" size={22} color={colors.tint} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[s.existingName, { color: colors.text }]}>{existing.account_name}</Text>
                <Text style={[s.existingDetail, { color: colors.textMuted }]}>{existing.bank_name} · ****{existing.account_number.slice(-4)}</Text>
                <View style={[s.badge, existing.verification_status === 'verified' ? s.badgeOk : s.badgePending]}>
                  <Text style={[s.badgeText, { color: existing.verification_status === 'verified' ? colors.tint : '#E65100' }]}>
                    {existing.verification_status === 'verified' ? '✓ Verified' : '⏳ Pending verification'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        <Text style={[s.sectionTitle, { color: colors.text }]}>{existing ? 'Replace Bank Account' : 'Add Bank Account'}</Text>
        {existing && (
          <View style={s.warnBox}>
            <Ionicons name="warning-outline" size={15} color="#E65100" />
            <Text style={s.warnText}>Changing your bank account triggers a 24-hour hold on new payouts.</Text>
          </View>
        )}

        <Text style={[s.label, { color: colors.text }]}>Bank *</Text>
        <TouchableOpacity style={[s.selector, { backgroundColor: colors.card, borderColor: colors.border }, selectedBank && { borderColor: colors.tint }]} onPress={() => { setBankSearch(''); setBankModal(true); }}>
          <Text style={[s.selectorText, { color: colors.text }, !selectedBank && { color: colors.textMuted }]}>{selectedBank?.name ?? 'Select your bank'}</Text>
          <Ionicons name="chevron-down" size={18} color={selectedBank ? colors.tint : colors.textMuted} />
        </TouchableOpacity>

        <Text style={[s.label, { color: colors.text, marginTop: 16 }]}>Account Number *</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }, accountNumber.length === 10 && { borderColor: colors.tint }]}
          value={accountNumber}
          onChangeText={v => { setAccountNumber(v.replace(/\D/g, '').slice(0, 10)); setResolvedName(''); }}
          placeholder="10-digit account number"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={10}
        />

        {resolving && <View style={s.resolveRow}><ActivityIndicator size="small" color={colors.tint} /><Text style={[s.resolveText, { color: colors.textMuted }]}>Verifying…</Text></View>}
        {!resolving && resolvedName ? (
          <View style={s.resolveRow}><Ionicons name="checkmark-circle" size={18} color={colors.tint} /><Text style={[s.resolvedName, { color: colors.tint }]}>{resolvedName}</Text></View>
        ) : null}
        {!resolving && accountNumber.length === 10 && !resolvedName && (
          <View style={s.resolveRow}><Ionicons name="close-circle" size={18} color="#E53935" /><Text style={{ color: '#E53935', fontSize: 13 }}>Account not found.</Text></View>
        )}

        <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.tint, shadowColor: colors.tint }, !canSave && s.saveBtnOff]} onPress={handleSave} disabled={!canSave || saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveBtnText}>Save Bank Account</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={bankModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Select Bank</Text>
            <TouchableOpacity onPress={() => setBankModal(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
          </View>
          <View style={[s.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput style={[s.searchInput, { color: colors.text }]} value={bankSearch} onChangeText={setBankSearch} placeholder="Search banks…" placeholderTextColor={colors.textMuted} autoFocus />
          </View>
          <FlatList
            data={filteredBanks}
            keyExtractor={b => b.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.bankItem, selectedBank?.code === item.code && s.bankItemSel]}
                onPress={() => { setSelectedBank(item); setResolvedName(''); setBankModal(false); }}
              >
                <Text style={[s.bankName, { color: colors.text }, selectedBank?.code === item.code && { color: colors.tint, fontWeight: '700' }]}>{item.name}</Text>
                {selectedBank?.code === item.code && <Ionicons name="checkmark" size={18} color={colors.tint} />}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.borderLight, marginLeft: 20 }} />}
            keyboardShouldPersistTaps="handled"
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1 },
  back: { width: 40 },
  title: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  existingCard: { borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  existingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  existingName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  existingDetail: { fontSize: 13, marginBottom: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeOk: { backgroundColor: '#E8F5E9' }, badgePending: { backgroundColor: '#FFF3E0' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  warnBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF3E0', borderRadius: 10, padding: 12, marginBottom: 20 },
  warnText: { flex: 1, fontSize: 13, color: '#E65100', lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14 },
  selectorText: { fontSize: 16 }, placeholder: { },
  input: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, letterSpacing: 2 },
  resolveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  resolveText: { fontSize: 13 },
  resolvedName: { fontSize: 14, fontWeight: '700' },
  saveBtn: { height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginTop: 28, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnOff: { opacity: 0.4, shadowOpacity: 0 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  bankItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  bankItemSel: { backgroundColor: '#E8F5E9' },
  bankName: { fontSize: 15 },
});
