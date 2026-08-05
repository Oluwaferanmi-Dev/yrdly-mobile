import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../../constants/tokens';
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { formatPrice } from '../../lib/utils';

export default function CheckoutSuccessScreen() {
  const router = useRouter();
  const { transactionId, itemTitle, amount } = useLocalSearchParams<{
    transactionId: string; itemTitle: string; amount: string;
  }>();

  const amountNum = Number(amount ?? 0);
  const ref = `REF-${transactionId?.substring(0, 8).toUpperCase() ?? '84920'}`;

  const summary = [
    { l: 'Item', v: itemTitle || 'Item' },
    { l: 'Amount', v: formatPrice(amountNum) },
    { l: 'Reference', v: ref },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Feather name="check" size={34} color={G} />
        </View>
        <Text style={styles.title}>Order Confirmed!</Text>
        <Text style={styles.subtitle}>Your payment is being held securely until the transaction is completed.</Text>

        <View style={styles.summaryContainer}>
          {summary.map((r) => (
            <View key={r.l} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{r.l}</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{r.v}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.primaryBtn} 
            onPress={() => router.replace(`/transactions/${transactionId}` as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>View Order</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryBtn} 
            onPress={() => router.replace('/(tabs)/explore' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(130,219,126,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(130,219,126,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 26,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 260,
  },
  summaryContainer: {
    width: '100%',
    gap: 8,
    marginBottom: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  summaryLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: LABEL,
  },
  summaryValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#fff',
    flex: 1,
    textAlign: 'right',
    paddingLeft: 16,
  },
  footer: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: G,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: DARK,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: LABEL,
  },
});
