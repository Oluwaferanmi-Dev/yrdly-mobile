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

const GREEN = '#388E3C';
interface Bank { code: string; name: string }
const BANKS: Bank[] = banksData as Bank[];

export default function PayoutSettingsScreen() {
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
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={24} color="#1C1C1C" /></TouchableOpacity>
        <Text style={s.title}>Bank Account</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {loading ? <ActivityIndicator color={GREEN} style={{ marginTop: 32 }} /> : existing ? (
          <View style={s.existingCard}>
            <View style={s.existingRow}>
              <View style={s.iconWrap}><Ionicons name="business" size={22} color={GREEN} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.existingName}>{existing.account_name}</Text>
                <Text style={s.existingDetail}>{existing.bank_name} · ****{existing.account_number.slice(-4)}</Text>
                <View style={[s.badge, existing.verification_status === 'verified' ? s.badgeOk : s.badgePending]}>
                  <Text style={[s.badgeText, { color: existing.verification_status === 'verified' ? GREEN : '#E65100' }]}>
                    {existing.verification_status === 'verified' ? '✓ Verified' : '⏳ Pending verification'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        <Text style={s.sectionTitle}>{existing ? 'Replace Bank Account' : 'Add Bank Account'}</Text>
        {existing && (
          <View style={s.warnBox}>
            <Ionicons name="warning-outline" size={15} color="#E65100" />
            <Text style={s.warnText}>Changing your bank account triggers a 24-hour hold on new payouts.</Text>
          </View>
        )}

        <Text style={s.label}>Bank *</Text>
        <TouchableOpacity style={[s.selector, selectedBank && s.selectorFilled]} onPress={() => { setBankSearch(''); setBankModal(true); }}>
          <Text style={[s.selectorText, !selectedBank && s.placeholder]}>{selectedBank?.name ?? 'Select your bank'}</Text>
          <Ionicons name="chevron-down" size={18} color={selectedBank ? GREEN : '#9E9E9E'} />
        </TouchableOpacity>

        <Text style={[s.label, { marginTop: 16 }]}>Account Number *</Text>
        <TextInput
          style={[s.input, accountNumber.length === 10 && s.inputFilled]}
          value={accountNumber}
          onChangeText={v => { setAccountNumber(v.replace(/\D/g, '').slice(0, 10)); setResolvedName(''); }}
          placeholder="10-digit account number"
          placeholderTextColor="#BDBDBD"
          keyboardType="number-pad"
          maxLength={10}
        />

        {resolving && <View style={s.resolveRow}><ActivityIndicator size="small" color={GREEN} /><Text style={s.resolveText}>Verifying…</Text></View>}
        {!resolving && resolvedName ? (
          <View style={s.resolveRow}><Ionicons name="checkmark-circle" size={18} color={GREEN} /><Text style={s.resolvedName}>{resolvedName}</Text></View>
        ) : null}
        {!resolving && accountNumber.length === 10 && !resolvedName && (
          <View style={s.resolveRow}><Ionicons name="close-circle" size={18} color="#E53935" /><Text style={{ color: '#E53935', fontSize: 13 }}>Account not found.</Text></View>
        )}

        <TouchableOpacity style={[s.saveBtn, !canSave && s.saveBtnOff]} onPress={handleSave} disabled={!canSave || saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveBtnText}>Save Bank Account</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={bankModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Select Bank</Text>
            <TouchableOpacity onPress={() => setBankModal(false)}><Ionicons name="close" size={24} color="#1C1C1C" /></TouchableOpacity>
          </View>
          <View style={s.searchBox}>
            <Ionicons name="search" size={18} color="#9E9E9E" style={{ marginRight: 8 }} />
            <TextInput style={s.searchInput} value={bankSearch} onChangeText={setBankSearch} placeholder="Search banks…" placeholderTextColor="#BDBDBD" autoFocus />
          </View>
          <FlatList
            data={filteredBanks}
            keyExtractor={b => b.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.bankItem, selectedBank?.code === item.code && s.bankItemSel]}
                onPress={() => { setSelectedBank(item); setResolvedName(''); setBankModal(false); }}
              >
                <Text style={[s.bankName, selectedBank?.code === item.code && { color: GREEN, fontWeight: '700' }]}>{item.name}</Text>
                {selectedBank?.code === item.code && <Ionicons name="checkmark" size={18} color={GREEN} />}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#F5F5F5', marginLeft: 20 }} />}
            keyboardShouldPersistTaps="handled"
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F2F2', backgroundColor: '#FFF' },
  back: { width: 40 },
  title: { fontSize: 18, fontWeight: '800', color: '#1C1C1C', flex: 1, textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  existingCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  existingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  existingName: { fontSize: 16, fontWeight: '700', color: '#1C1C1C', marginBottom: 2 },
  existingDetail: { fontSize: 13, color: '#9E9E9E', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeOk: { backgroundColor: '#E8F5E9' }, badgePending: { backgroundColor: '#FFF3E0' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1C', marginBottom: 16 },
  warnBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF3E0', borderRadius: 10, padding: 12, marginBottom: 20 },
  warnText: { flex: 1, fontSize: 13, color: '#E65100', lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700', color: '#424242', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', paddingHorizontal: 16, paddingVertical: 14 },
  selectorFilled: { borderColor: GREEN },
  selectorText: { fontSize: 16, color: '#1C1C1C' }, placeholder: { color: '#BDBDBD' },
  input: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, color: '#1C1C1C', letterSpacing: 2 },
  inputFilled: { borderColor: GREEN },
  resolveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  resolveText: { fontSize: 13, color: '#9E9E9E' },
  resolvedName: { fontSize: 14, fontWeight: '700', color: GREEN },
  saveBtn: { height: 56, borderRadius: 28, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', marginTop: 28, shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnOff: { opacity: 0.4, shadowOpacity: 0 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  modal: { flex: 1, backgroundColor: '#FAFAFA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1C' },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  searchInput: { flex: 1, fontSize: 15, color: '#1C1C1C' },
  bankItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  bankItemSel: { backgroundColor: '#E8F5E9' },
  bankName: { fontSize: 15, color: '#1C1C1C' },
});
