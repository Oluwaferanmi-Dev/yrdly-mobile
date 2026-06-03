import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertTriangle, CheckCircle, Mail } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme';

const { width, height } = Dimensions.get('window');

export default function ForgotPassword() {
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
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your email to receive a reset link</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <AlertTriangle size={16} color="#E53935" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {message ? (
          <View style={styles.successBox}>
            <CheckCircle size={16} color={theme.colors.primary} />
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
            placeholderTextColor={theme.colors.textSecondary} />
          <Mail size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
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
    backgroundColor: theme.colors.background,
  },
  blob: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
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
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontFamily: theme.typography.fonts.brand,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.textSecondary,
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
    color: theme.colors.error,
    marginLeft: 8,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body,
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceDim,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  successText: {
    color: theme.colors.primary,
    marginLeft: 8,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body,
    flex: 1,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 27,
    paddingHorizontal: 20,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body,
    backgroundColor: theme.colors.surfaceDim,
    color: theme.colors.textPrimary,
  },
  inputIcon: {
    position: 'absolute',
    right: 20,
    top: 17,
  },
  button: {
    height: 54,
    backgroundColor: theme.colors.primary,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fonts.heading,
  },
});
