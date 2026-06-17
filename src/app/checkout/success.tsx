import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { formatPrice } from '../../lib/utils';
import { useAppTheme } from '../../context/ThemeContext';



export default function CheckoutSuccessScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { transactionId, itemTitle, amount } = useLocalSearchParams<{
    transactionId: string; itemTitle: string; amount: string;
  }>();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Animated checkmark */}
        <Animated.View style={[styles.iconRing, { backgroundColor: colors.tint, shadowColor: colors.tint, transform: [{ scale: scaleAnim }] }]}>
          <Feather name="check" size={56} color={colors.card} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={[styles.title, { color: colors.text }]}>Payment Successful! 🎉</Text>
          <Text style={[styles.subtitle, { color: colors.tint }]}>
            Your payment of {formatPrice(Number(amount ?? 0))} is held in escrow.
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            The seller has been notified. You'll receive your item and then confirm receipt to release the funds.
          </Text>

          {/* Escrow steps */}
          <View style={styles.steps}>
            {[
              { icon: 'cash', label: 'Payment held in escrow' },
              { icon: 'box', label: 'Seller prepares & hands over item' },
              { icon: 'check-circle', label: 'You confirm receipt → funds released' },
            ].map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={[styles.stepIcon, { backgroundColor: colors.inputBackground }]}>
                  <Feather name={step.icon as any} size={18} color={colors.tint} />
                </View>
                <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>{step.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.tint, shadowColor: colors.tint }]}
          onPress={() => router.push(`/transactions/${transactionId}` as any)}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryBtnText, { color: colors.card }]}>View Transaction</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace('/(tabs)/' as any)}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconRing: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center', marginBottom: 28,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32, maxWidth: 300 },
  steps: { width: '100%', gap: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  stepLabel: { fontSize: 14, flex: 1, fontWeight: '500' },
  footer: { padding: 24, gap: 12 },
  primaryBtn: {
    height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800' },
  secondaryBtn: { height: 48, justifyContent: 'center', alignItems: 'center' },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },
});
