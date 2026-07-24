import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Dimensions, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useAuth } from '../hooks/use-supabase-auth';
import { useAppTheme } from '../context/ThemeContext';
import { ErrorMessage } from '../components/ErrorMessage';

const { width, height } = Dimensions.get('window');

const OTP_LENGTH = 6;

export default function VerifyPhoneOtpScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { phone, initialPinId } = useLocalSearchParams<{ phone: string, initialPinId: string }>();
  const { verifyPhoneOtp, sendPhoneOtp } = useAuth();

  const [pinId, setPinId] = useState(initialPinId || '');
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');

  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (digits.every((d) => d !== '')) {
      handleVerify(digits.join(''));
    }
  }, [digits]);

  const handleDigitChange = (value: string, index: number) => {
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
      const newDigits = [...digits];
      for (let i = 0; i < OTP_LENGTH; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setDigits(newDigits);
      inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const otp = code ?? digits.join('');
    if (otp.length < OTP_LENGTH) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    if (!pinId) {
      setError('Invalid session. Please go back and send code again.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await verifyPhoneOtp(pinId, otp);
      Alert.alert('Verified!', 'Your phone number has been verified.');
      router.back();
      // Wait a moment then go back again if we need to pop two screens
      setTimeout(() => router.back(), 500); 
    } catch (e: any) {
      setError(e.message || 'Invalid or expired code. Please try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !phone) return;
    setResending(true);
    setError('');
    try {
      const newPinId = await sendPhoneOtp(phone);
      setPinId(newPinId);
      setResendCooldown(60);
      Alert.alert('Code resent', `A new SMS has been sent to ${phone}`);
    } catch (e: any) {
      setError(e.message || 'Could not resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[styles.blob, { top: height * 0.05, left: width * 0.1, backgroundColor: colors.tint }]} />
        <View style={[styles.blob, { top: height * 0.75, left: width * 0.75, backgroundColor: colors.tint }]} />
      </View>

      {isLiquidGlassSupported ? (
        <LiquidGlassView 
          {...({ intensity: 20, tint: colors.background === '#121212' ? 'dark' : 'light', fallbackColor: colors.background === '#121212' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.4)' } as any)}
          style={StyleSheet.absoluteFillObject} 
        />
      ) : Platform.OS === 'ios' ? (
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} tint={colors.background === '#121212' ? 'dark' : 'light'} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background === '#121212' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)' }]} />
      )}

      <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={[styles.iconRing, { backgroundColor: colors.inputBackground }]}>
          <Feather name="message-square" size={36} color={colors.tint} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Check your phone</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We sent a 6-digit SMS code to{'\n'}
          <Text style={[styles.phoneText, { color: colors.text }]}>{phone}</Text>
        </Text>

        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputRefs.current[i] = r; }}
              style={[styles.otpBox, { backgroundColor: colors.card, borderColor: colors.borderLight, color: colors.text }, d && [styles.otpBoxFilled, { borderColor: colors.tint, backgroundColor: colors.inputBackground }]]}
              value={d}
              onChangeText={(v) => handleDigitChange(v, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={6}
              selectTextOnFocus
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
            />
          ))}
        </View>

        <ErrorMessage error={error} />

        <TouchableOpacity
          style={[styles.verifyBtn, { backgroundColor: colors.tint, shadowColor: colors.tint }, loading && styles.verifyBtnDisabled]}
          onPress={() => handleVerify()}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.card} />
          ) : (
            <Text style={[styles.verifyBtnText, { color: colors.card }]}>Verify</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={[styles.resendLabel, { color: colors.textMuted }]}>Didn't get the SMS? </Text>
          <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0 || resending}>
            {resending ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Text style={[styles.resendLink, { color: colors.tint }, resendCooldown > 0 && [styles.resendLinkDisabled, { color: colors.textMuted }]]}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  blob: { position: 'absolute', width: 80, height: 80, borderRadius: 40, opacity: 0.45 },
  card: {
    borderRadius: 28, padding: 28, alignItems: 'center',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 6,
  },
  back: { alignSelf: 'flex-start', marginBottom: 20, padding: 4 },
  iconRing: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 23, marginBottom: 32 },
  phoneText: { fontWeight: '700' },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  otpBox: {
    width: 46, height: 56, borderRadius: 12, borderWidth: 1.5,
    textAlign: 'center', fontSize: 22, fontWeight: '700',
  },
  otpBoxFilled: {},
  verifyBtn: {
    width: '100%', height: 54, borderRadius: 27,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4,
  },
  verifyBtnDisabled: { opacity: 0.6 },
  verifyBtnText: { fontSize: 16, fontWeight: '700' },
  resendRow: { flexDirection: 'row', alignItems: 'center' },
  resendLabel: { fontSize: 13 },
  resendLink: { fontSize: 13, fontWeight: '700' },
  resendLinkDisabled: {},
});
