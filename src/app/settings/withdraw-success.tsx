import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useAppTheme } from '../../context/ThemeContext';

export default function WithdrawSuccessScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.content}>
        <LottieView
          source={require('../../../assets/animations/success-check.json')}
          autoPlay
          loop={false}
          style={s.lottie}
        />

        <Text style={[s.title, { color: colors.text }]}>Withdrawal Processing</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          Your withdrawal request has been submitted successfully. Funds will arrive in your bank account within 1–2 business days.
        </Text>

        <View style={[s.infoCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Feather name="info" size={18} color={colors.tint} />
          <Text style={[s.infoText, { color: colors.textMuted }]}>
            You will receive a push notification once the transfer is completed by our payment partner.
          </Text>
        </View>
      </View>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.button, { backgroundColor: colors.tint }]}
          onPress={() => router.replace('/settings/payouts' as any)}
        >
          <Text style={s.buttonText}>Back to Payouts</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, gap: 16,
  },
  lottie: { width: 140, height: 140 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 16, borderWidth: 1, marginTop: 12,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  footer: { padding: 20 },
  button: {
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#000' },
});
