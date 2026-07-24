import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/use-supabase-auth';
import { ErrorMessage } from '../../components/ErrorMessage';

const { width, height } = Dimensions.get('window');

export default function VerifyPhoneScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { sendPhoneOtp } = useAuth();

  const [phone, setPhone] = useState('+234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    // Basic length check for +234 followed by 10 digits
    if (phone.length < 13 || !phone.startsWith('+234')) {
      setError('Please enter a valid Nigerian phone number (e.g. +23470...).');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const pinId = await sendPhoneOtp(phone);
      router.push({
        pathname: '/(auth)/verify-phone-otp',
        params: { phone, initialPinId: pinId },
      } as any);
    } catch (e: any) {
      setError(e.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
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
          <Feather name="smartphone" size={36} color={colors.tint} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Verify Phone Number</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Enter your Nigerian phone number to receive a verification code.
        </Text>

        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight }]}>
          <Feather name="phone" size={20} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="+234 800 000 0000"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <ErrorMessage error={error} />

        <TouchableOpacity
          style={[styles.verifyBtn, { backgroundColor: colors.tint, shadowColor: colors.tint }, loading && styles.verifyBtnDisabled]}
          onPress={handleSend}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.card} />
          ) : (
            <Text style={[styles.verifyBtnText, { color: colors.card }]}>Send Code</Text>
          )}
        </TouchableOpacity>
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
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', height: 56, borderRadius: 16,
    borderWidth: 1, paddingHorizontal: 16, marginBottom: 20,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '500' },
  verifyBtn: {
    width: '100%', height: 54, borderRadius: 27,
    justifyContent: 'center', alignItems: 'center', marginTop: 10,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4,
  },
  verifyBtnDisabled: { opacity: 0.6 },
  verifyBtnText: { fontSize: 16, fontWeight: '700' },
});
