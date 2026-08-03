import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SceneBg, GlassCard, PrimaryBtn, BackBtn } from '@/components/onboarding/primitives';
import { ONBOARDING_THEME } from '@/constants/onboarding-theme';

const { colors } = ONBOARDING_THEME;

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(45);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDigit = (i: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) {
      inputRefs.current[i + 1]?.focus();
    }
  };

  const handleKeyPress = (i: number, key: string) => {
    if (key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const filled = digits.every(d => d !== '');

  const handleVerify = () => {
    router.push('/(onboarding)/profile' as any);
  };

  return (
    <View style={styles.container}>
      <SceneBg photoId="1654762550505-7c58277e0fac" pos="center 30%" gradientStart="40%" />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <BackBtn onClick={() => router.back()} light />
        </View>

        <View style={{ flex: 1 }} />

        <GlassCard>
          <View style={styles.titleBox}>
            <Text style={styles.titleText}>Enter 6-digit code</Text>
            <Text style={styles.subtitleText}>
              We sent a code via SMS to{' '}
              <Text style={{ color: colors.MUTED, fontWeight: '500' }}>
                {phone ? `+234 ${phone}` : '+234 801 *** *678'}
              </Text>
            </Text>
          </View>

          {/* OTP Digit Boxes */}
          <View style={styles.otpRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                value={d}
                onChangeText={v => handleDigit(i, v)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                style={[
                  styles.otpBox,
                  {
                    backgroundColor: d ? 'rgba(130,219,126,0.1)' : colors.SURFACE,
                    borderColor: d ? 'rgba(130,219,126,0.5)' : colors.GLASS_BORDER,
                  },
                ]}
              />
            ))}
          </View>

          {/* Countdown & Resend */}
          <View style={styles.resendBox}>
            <Text style={[styles.timerText, { color: countdown > 0 ? colors.LABEL : colors.G }]}>
              {countdown > 0 ? `Resend SMS in 0:${String(countdown).padStart(2, '0')}` : 'Resend Code'}
            </Text>
            <Text style={styles.altText}>
              Didn't receive SMS? Try <Text style={{ color: colors.MUTED }}>WhatsApp</Text> or{' '}
              <Text style={{ color: colors.MUTED }}>Voice Call</Text>
            </Text>
          </View>

          <PrimaryBtn label="Verify & Continue" onClick={handleVerify} disabled={!filled} />
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
  titleBox: {
    gap: 4,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitleText: {
    fontSize: 14,
    color: colors.LABEL,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpBox: {
    width: 46,
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  resendBox: {
    alignItems: 'center',
    gap: 8,
  },
  timerText: {
    fontSize: 13,
  },
  altText: {
    fontSize: 13,
    color: colors.LABEL,
    lineHeight: 20,
    textAlign: 'center',
  },
});
