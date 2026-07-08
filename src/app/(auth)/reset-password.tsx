import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { supabase } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';
import { ErrorMessage } from '../../components/ErrorMessage';

const { width, height } = Dimensions.get('window');


export default function ResetPassword() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Expo Router parses query params. For recovery links, supabase sends access_token in hash/query
    const handleRecoverySession = async () => {
      const accessToken = params.access_token || params.code;
      if (accessToken) {
        setLoading(true);
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken as string,
            refresh_token: (params.refresh_token as string) || '',
          });
          if (sessionError) {
            setError('Recovery session could not be established. Please try resetting again.');
          }
        } catch (err: any) {
          setError(err.message || 'Failed to establish recovery session.');
        } finally {
          setLoading(false);
        }
      }
    };
    handleRecoverySession();
  }, [params]);

  const handleUpdatePassword = async () => {
    if (!password) {
      setError('Please enter a new password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setMessage('Your password has been successfully reset.');
        Alert.alert(
          'Success',
          'Password reset successfully! You can now access your account.',
          [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
        );
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background Blobs */}
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[styles.blob, { top: height * 0.1, left: width * 0.05, transform: [{ rotate: '36deg' }], backgroundColor: colors.tint }]} />
        <View style={[styles.blob, { top: height * 0.2, left: width * 0.8, backgroundColor: colors.tint }]} />
        <View style={[styles.blob, { top: height * 0.7, left: width * 0.2, backgroundColor: colors.tint }]} />
        <View style={[styles.blob, { top: height * 0.85, left: width * 0.85, backgroundColor: colors.tint }]} />
      </View>

      {/* Glass Overlay */}
      {isLiquidGlassSupported ? (
        <LiquidGlassView 
          intensity={20} 
          style={StyleSheet.absoluteFillObject} 
          tint={colors.background === '#121212' ? 'dark' : 'light'} 
          fallbackColor={colors.background === '#121212' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.4)'}
        />
      ) : Platform.OS === 'ios' ? (
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} tint={colors.background === '#121212' ? 'dark' : 'light'} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background === '#121212' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.4)' }]} />
      )}

      <View style={styles.formContainer}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(auth)/login')}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>New Password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Enter and confirm your new secure password</Text>
        </View>

        <ErrorMessage error={error} />

        {message ? (
          <View style={styles.successBox}>
            <Feather name="check-circle" size={16} color="#388E3C" />
            <Text style={styles.successText}>{message}</Text>
          </View>
        ) : null}

        {/* New Password Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
            placeholder="New Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
            placeholderTextColor={colors.textMuted}
          />
          <Feather name="lock" size={20} color={colors.textMuted} style={styles.inputIcon} />
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
            placeholderTextColor={colors.textMuted}
          />
          <Feather name="lock" size={20} color={colors.textMuted} style={styles.inputIcon} />
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.tint }]} 
          onPress={handleUpdatePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.card} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.card }]}>Reset Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blob: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
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
    textAlign: 'center',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
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
    marginBottom: 20,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderRadius: 27,
    paddingHorizontal: 20,
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  inputIcon: {
    position: 'absolute',
    right: 20,
    top: 17,
  },
  button: {
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
