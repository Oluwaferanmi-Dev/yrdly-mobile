import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { supabase } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const colors = {
  background: '#F2F2F2',
  blob: '#A154F2',
  primary: '#388E3C',
  text: '#1C1C1C',
  textFaded: '#616161',
  border: '#E0E0E0',
  inputBorder: '#388E3C',
};

export default function ForgotPassword() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://app.yrdly.ng/reset-password'
      });
      
      if (resetError) {
        setError(resetError.message);
      } else {
        setMessage('Check your email for a password reset link.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background Blobs */}
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[styles.blob, { top: height * 0.1, left: width * 0.05, transform: [{ rotate: '36deg' }] }]} />
        <View style={[styles.blob, { top: height * 0.2, left: width * 0.8 }]} />
        <View style={[styles.blob, { top: height * 0.7, left: width * 0.2 }]} />
        <View style={[styles.blob, { top: height * 0.85, left: width * 0.85 }]} />
      </View>

      {/* Glass Overlay */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} tint="light" />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255, 255, 255, 0.4)' }]} />
      )}

      <View style={styles.formContainer}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your email to receive a reset link</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="warning" size={16} color="#E53935" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {message ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={16} color="#388E3C" />
            <Text style={styles.successText}>{message}</Text>
          </View>
        ) : null}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            placeholderTextColor="#9ca3af"
          />
          <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  blob: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.blob,
    opacity: 0.55,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textFaded,
    textAlign: 'center',
    marginTop: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#E53935',
    marginLeft: 8,
    fontSize: 13,
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  successText: {
    color: '#2E7D32',
    marginLeft: 8,
    fontSize: 13,
    flex: 1,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 27,
    paddingHorizontal: 20,
    fontSize: 14,
    backgroundColor: 'transparent',
    color: colors.text,
  },
  inputIcon: {
    position: 'absolute',
    right: 20,
    top: 17,
  },
  button: {
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
