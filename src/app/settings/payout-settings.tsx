import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
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

    <SafeAreaView style={[s.container, { backgroundColor: '#131313' }]}>
      <View style={[s.header, { backgroundColor: '#131313', borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Feather name="arrow-left" size={24} color="#FFFFFF" /></TouchableOpacity>
        <Text style={[s.title, { color: '#FFFFFF' }]}>Bank Account</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {loading ? <ActivityIndicator color="#82E157" style={{ marginTop: 32 }} /> : existing ? (
          <View style={[s.existingCard, { backgroundColor: '#1C1C1C', borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1 }]}>
            <View style={s.existingRow}>
              <View style={[s.iconWrap, { backgroundColor: 'rgba(130, 225, 87, 0.1)' }]}><Feather name="briefcase" size={22} color="#82E157" /></View>
              <View style={{ flex: 1 }}>
                <Text style={[s.existingName, { color: '#FFFFFF' }]}>{existing.account_name}</Text>
                <Text style={[s.existingDetail, { color: '#A6A6A6' }]}>{existing.bank_name} · ****{existing.account_number.slice(-4)}</Text>
                <View style={[s.badge, existing.verification_status === 'verified' ? s.badgeOk : s.badgePending]}>
                  <Text style={[s.badgeText, { color: existing.verification_status === 'verified' ? '#82E157' : '#E65100' }]}>
                    {existing.verification_status === 'verified' ? '✓ Verified' : '⏳ Pending verification'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        <Text style={[s.sectionTitle, { color: '#FFFFFF' }]}>{existing ? 'Replace Bank Account' : 'Add Bank Account'}</Text>
        {existing && (
          <View style={s.warnBox}>
            <Feather name="alert-circle" size={15} color="#E65100" />
            <Text style={s.warnText}>Changing your bank account triggers a 24-hour hold on new payouts.</Text>
          </View>
        )}

        <Text style={[s.label, { color: '#A6A6A6' }]}>Bank *</Text>
        <TouchableOpacity style={[s.selector, { backgroundColor: '#1C1C1C', borderColor: 'rgba(255,255,255,0.06)' }, selectedBank && { borderColor: '#82E157' }]} onPress={() => { setBankSearch(''); setBankModal(true); }}>
          <Text style={[s.selectorText, { color: '#FFFFFF' }, !selectedBank && { color: '#A6A6A6' }]}>{selectedBank?.name ?? 'Select your bank'}</Text>
          <Feather name="chevron-down" size={18} color={selectedBank ? '#82E157' : '#A6A6A6'} />
        </TouchableOpacity>

        <Text style={[s.label, { color: '#A6A6A6', marginTop: 16 }]}>Account Number *</Text>
        <TextInput
          style={[s.input, { backgroundColor: '#1C1C1C', borderColor: 'rgba(255,255,255,0.06)', color: '#FFFFFF' }, accountNumber.length === 10 && { borderColor: '#82E157' }]}
          value={accountNumber}
          onChangeText={v => { setAccountNumber(v.replace(/\D/g, '').slice(0, 10)); setResolvedName(''); }}
          placeholder="10-digit account number"
          placeholderTextColor="#A6A6A6"
          keyboardType="number-pad"
          maxLength={10}
        />

        {resolving && <View style={s.resolveRow}><ActivityIndicator size="small" color="#82E157" /><Text style={[s.resolveText, { color: '#A6A6A6' }]}>Verifying…</Text></View>}
        {!resolving && resolvedName ? (
          <View style={s.resolveRow}><Feather name="check-circle" size={18} color="#82E157" /><Text style={[s.resolvedName, { color: '#82E157' }]}>{resolvedName}</Text></View>
        ) : null}
        {!resolving && accountNumber.length === 10 && !resolvedName && (
          <View style={s.resolveRow}><Feather name="x-circle" size={18} color="#E53935" /><Text style={{ color: '#E53935', fontSize: 13 }}>Account not found.</Text></View>
        )}

        <TouchableOpacity style={[s.saveBtn, { backgroundColor: '#82E157' }, !canSave && s.saveBtnOff]} onPress={handleSave} disabled={!canSave || saving}>
          {saving ? <ActivityIndicator color="#111" /> : <Text style={s.saveBtnText}>Save Bank Account</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={bankModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[s.modal, { backgroundColor: '#131313' }]}>
          <View style={[s.modalHeader, { borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
            <Text style={[s.modalTitle, { color: '#FFFFFF' }]}>Select Bank</Text>
            <TouchableOpacity onPress={() => setBankModal(false)}><Feather name="x" size={24} color="#FFFFFF" /></TouchableOpacity>
          </View>
          <View style={[s.searchBox, { backgroundColor: '#1C1C1C', borderColor: 'rgba(255,255,255,0.06)' }]}>
            <Feather name="search" size={18} color="#A6A6A6" style={{ marginRight: 8 }} />
            <TextInput style={[s.searchInput, { color: '#FFFFFF' }]} value={bankSearch} onChangeText={setBankSearch} placeholder="Search banks…" placeholderTextColor="#A6A6A6" autoFocus />
          </View>
          <FlatList
            data={filteredBanks}
            keyExtractor={b => b.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.bankItem, selectedBank?.code === item.code && s.bankItemSel]}
                onPress={() => { setSelectedBank(item); setResolvedName(''); setBankModal(false); }}
              >
                <Text style={[s.bankName, { color: '#FFFFFF' }, selectedBank?.code === item.code && { color: '#82E157', fontWeight: '700' }]}>{item.name}</Text>
                {selectedBank?.code === item.code && <Feather name="check" size={18} color="#82E157" />}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 20 }} />}
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
  back: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  title: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  existingCard: { borderRadius: 20, padding: 16, marginBottom: 24 },
  existingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  existingName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  existingDetail: { fontSize: 13, marginBottom: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeOk: { backgroundColor: 'rgba(130, 225, 87, 0.1)' }, badgePending: { backgroundColor: 'rgba(230, 81, 0, 0.1)' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  warnBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(230, 81, 0, 0.1)', borderRadius: 10, padding: 12, marginBottom: 20 },
  warnText: { flex: 1, fontSize: 13, color: '#E65100', lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 16 },
  selectorText: { fontSize: 16 }, placeholder: { },
  input: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, letterSpacing: 1 },
  resolveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  resolveText: { fontSize: 13 },
  resolvedName: { fontSize: 14, fontWeight: '700' },
  saveBtn: { height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  saveBtnOff: { opacity: 0.4 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#111' },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 16, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 16 },
  bankItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18 },
  bankItemSel: { backgroundColor: 'rgba(130, 225, 87, 0.1)' },
  bankName: { fontSize: 15 },
});
