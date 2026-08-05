import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../lib/api';
import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED } from '../../constants/tokens';

export default function WithdrawSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const amountStr = params.amount as string;
  const numericAmount = Number(amountStr) || 0;
  
  const [bankInfo, setBankInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBank = async () => {
      try {
        const { account } = await api.get('/api/seller/setup-account');
        if (account) setBankInfo(account);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchBank();
  }, []);

  const refNum = `PAY-${94820 + (numericAmount % 100)}`;

  if (loading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={G} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.content}>
        <View style={s.iconBox}>
          <Feather name="check" size={24} color={G} />
        </View>
        <Text style={s.title}>Withdrawal Requested</Text>
        <Text style={s.subtitle}>Transfers usually arrive within 1–5 minutes.</Text>

        <View style={s.cardList}>
          {[
            { l: 'Amount', v: `₦${numericAmount.toLocaleString()}` },
            { l: 'Destination', v: bankInfo ? `${bankInfo.bankName} · ****${(bankInfo.accountNumber || '').slice(-4)}` : 'Bank Account' },
            { l: 'Reference', v: refNum },
            { l: 'Status', v: 'Processing' },
          ].map((r, i) => (
            <View key={i} style={s.row}>
              <Text style={s.rowL}>{r.l}</Text>
              <Text style={[s.rowR, r.l === 'Status' && { color: '#64B5F6' }]}>{r.v}</Text>
            </View>
          ))}
        </View>
        
        <TouchableOpacity style={s.doneBtn} onPress={() => router.replace('/settings/payouts' as any)}>
          <Text style={s.doneBtnTxt}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, paddingVertical: 40
  },
  iconBox: { width: 80, height: 80, borderRadius: 28, backgroundColor: 'rgba(130,219,126,0.12)', borderWidth: 1, borderColor: 'rgba(130,219,126,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 28, color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontFamily: 'Inter', fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 22, marginBottom: 28 },

  cardList: { width: '100%', gap: 8, marginBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: GLASS_BORDER },
  rowL: { fontFamily: 'Inter', fontSize: 13, color: LABEL },
  rowR: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fff' },

  doneBtn: { width: '100%', paddingVertical: 16, borderRadius: 16, backgroundColor: G, alignItems: 'center' },
  doneBtnTxt: { fontFamily: 'Outfit-Bold', fontSize: 15, color: DARK },
});
