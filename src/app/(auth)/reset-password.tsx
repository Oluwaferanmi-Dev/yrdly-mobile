import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(auth)/login')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>New Password</Text>
          <Text style={styles.subtitle}>Enter and confirm your new secure password</Text>
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

        {/* New Password Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="New Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
            placeholderTextColor="#9ca3af"
          />
          <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
            placeholderTextColor="#9ca3af"
          />
          <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleUpdatePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
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
    marginBottom: 20,
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
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
