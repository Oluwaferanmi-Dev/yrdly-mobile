import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Dimensions, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { supabase } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const GREEN = '#388E3C';
const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');

  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Auto-submit when all digits filled
  useEffect(() => {
    if (digits.every((d) => d !== '')) {
      handleVerify(digits.join(''));
    }
  }, [digits]);

  const handleDigitChange = (value: string, index: number) => {
    // Handle paste of full OTP
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

    setLoading(true);
    setError('');
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email ?? '',
        token: otp,
        type: 'signup',
      });

      if (verifyError) {
        setError(verifyError.message || 'Invalid or expired code. Please try again.');
        setDigits(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
      // On success, auth state change in use-supabase-auth fires automatically
      // → RootNavigationGuard routes to onboarding
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setResending(true);
    setError('');
    try {
      const { error: resendError } = await supabase.auth.resend({
        email,
        type: 'signup',
      });
      if (resendError) {
        setError(resendError.message);
      } else {
        setResendCooldown(60);
        Alert.alert('Code resent', `A new code has been sent to ${email}`);
      }
    } catch {
      setError('Could not resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background blobs */}
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[styles.blob, { top: height * 0.05, left: width * 0.1 }]} />
        <View style={[styles.blob, { top: height * 0.75, left: width * 0.75 }]} />
      </View>

      {Platform.OS === 'ios' ? (
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} tint="light" />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
      )}

      <View style={styles.card}>
        {/* Back */}
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1C1C1C" />
        </TouchableOpacity>

        {/* Icon */}
        <View style={styles.iconRing}>
          <Ionicons name="mail-open-outline" size={36} color={GREEN} />
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        {/* OTP inputs */}
        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputRefs.current[i] = r; }}
              style={[styles.otpBox, d ? styles.otpBoxFilled : null]}
              value={d}
              onChangeText={(v) => handleDigitChange(v, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={6} // allow 6 for paste
              selectTextOnFocus
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
            />
          ))}
        </View>

        {/* Error */}
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={15} color="#E53935" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Verify button */}
        <TouchableOpacity
          style={[styles.verifyBtn, loading && styles.verifyBtnDisabled]}
          onPress={() => handleVerify()}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.verifyBtnText}>Verify & Continue</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't get the email? </Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={resendCooldown > 0 || resending}
          >
            {resending ? (
              <ActivityIndicator size="small" color={GREEN} />
            ) : (
              <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendLinkDisabled]}>
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
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    padding: 24,
  },
  blob: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#A154F2',
    opacity: 0.45,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  back: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    padding: 4,
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1C1C',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#616161',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 32,
  },
  emailText: {
    color: '#1C1C1C',
    fontWeight: '700',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  otpBoxFilled: {
    borderColor: GREEN,
    backgroundColor: '#E8F5E9',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    width: '100%',
  },
  errorText: {
    color: '#E53935',
    fontSize: 13,
    flex: 1,
  },
  verifyBtn: {
    width: '100%',
    height: 54,
    backgroundColor: GREEN,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  verifyBtnDisabled: { opacity: 0.6 },
  verifyBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  resendRow: { flexDirection: 'row', alignItems: 'center' },
  resendLabel: { fontSize: 13, color: '#9E9E9E' },
  resendLink: { fontSize: 13, fontWeight: '700', color: GREEN },
  resendLinkDisabled: { color: '#BDBDBD' },
});
