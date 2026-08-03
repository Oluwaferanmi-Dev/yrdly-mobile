import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SceneBg, GlassCard, PrimaryBtn, BackBtn } from '@/components/onboarding/primitives';
import { ONBOARDING_THEME } from '@/constants/onboarding-theme';
import { Ionicons } from '@expo/vector-icons';

const { colors } = ONBOARDING_THEME;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(0);
  const [resent, setResent] = useState(false);

  const handleResend = () => {
    setResent(true);
    setCountdown(45);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <SceneBg photoId="1768244016593-8ca75b15bc92" pos="center 25%" gradientStart="42%" />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <BackBtn onClick={() => router.back()} light />
        </View>

        <View style={{ flex: 1 }} />

        <GlassCard>
          <View style={styles.centerBox}>
            <View style={styles.envelopeBadge}>
              <Ionicons name="mail-outline" size={28} color={colors.G} />
            </View>
            <Text style={styles.titleText}>Check your inbox</Text>
            <Text style={styles.descText}>
              We sent a verification link to <Text style={{ color: colors.MUTED, fontWeight: '500' }}>your@email.com</Text>. Tap it to confirm your account.
            </Text>
          </View>

          <PrimaryBtn
            label="Open Email App"
            onClick={() => router.push('/(auth)/phone' as any)}
            icon={<Ionicons name="mail-unread-outline" size={18} color={colors.DARK} />}
          />

          <View style={styles.actionsBox}>
            <TouchableOpacity onPress={countdown === 0 ? handleResend : undefined}>
              <Text
                style={[
                  styles.resendText,
                  { color: countdown > 0 ? colors.LABEL : colors.G, opacity: countdown > 0 ? 0.6 : 1 },
                ]}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : resent ? 'Resend again' : 'Resend email'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text style={styles.changeEmailText}>Change email address</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.DARK,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  centerBox: {
    alignItems: 'center',
    textAlign: 'center',
    gap: 12,
  },
  envelopeBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(130,219,126,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(130,219,126,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  descText: {
    fontSize: 14,
    color: colors.LABEL,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 260,
  },
  actionsBox: {
    alignItems: 'center',
    gap: 12,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeEmailText: {
    fontSize: 13,
    color: colors.LABEL,
  },
});
