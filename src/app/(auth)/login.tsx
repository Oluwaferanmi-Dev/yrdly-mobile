import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Dimensions } from 'react-native';
import { useAuth } from '../../hooks/use-supabase-auth';
import { Ionicons } from '@expo/vector-icons';
import { AlertTriangle, Mail, Eye, EyeOff } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { theme } from '../../theme';

const { width, height } = Dimensions.get('window');

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, signUp, signInWithGoogle, loading } = useAuth();

  const handleAuth = async () => {
    if (!email || !password || (isSignUp && !name)) {
      setError('Please fill in all fields');
      return;
    }
    
    setError('');
    
    if (!isSignUp) {
      const { error: signInError } = await signIn(email, password);
      if (signInError) setError(signInError.message);
    } else {
      const { error: signUpError } = await signUp(email, password, name);
      if (signUpError) setError(signUpError.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const { error: err } = await signInWithGoogle();
    if (err) setError(err.message);
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>See what's happening</Text>
          <Text style={styles.subtitle}>Sign in to your Yrdly account</Text>
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={require('../../../assets/images/yrdly-logo.png')} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Segmented Control */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            style={[styles.segmentButton, !isSignUp && styles.segmentButtonActive]} 
            onPress={() => setIsSignUp(false)}
          >
            <Text style={[styles.segmentText, !isSignUp && styles.segmentTextActive]}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segmentButton, isSignUp && styles.segmentButtonActive]} 
            onPress={() => setIsSignUp(true)}
          >
            <Text style={[styles.segmentText, isSignUp && styles.segmentTextActive]}>Sign up</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <AlertTriangle size={16} color="#E53935" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Inputs */}
        {isSignUp && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading}
              placeholderTextColor={theme.colors.textSecondary} />
          </View>
        )}

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
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
            placeholderTextColor={theme.colors.textSecondary} />
          <TouchableOpacity 
            style={styles.inputIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={20} color={theme.colors.textSecondary} /> : <Eye size={20} color={theme.colors.textSecondary} />}
          </TouchableOpacity>
        </View>

        {!isSignUp && (
          <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={() => router.push('/(auth)/forgot-password' as any)}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isSignUp ? 'Create Account' : 'Sign in'}</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Auth Button */}
        <TouchableOpacity 
          style={styles.googleButton} 
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <Ionicons name="logo-google" size={18} color="#EA4335" style={{ marginRight: 8 }} />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Toggle Footer Text */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
          </Text>
          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={styles.footerLink}>{isSignUp ? "Sign in" : "Sign up"}</Text>
          </TouchableOpacity>
        </View>

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
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: theme.typography.fonts.brand,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    padding: 4,
    marginBottom: 24,
    backgroundColor: theme.colors.surfaceDim,
  },
  segmentButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    color: theme.colors.background,
    fontFamily: theme.typography.fonts.heading,
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
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fonts.heading,
  },
  button: {
    height: 54,
    backgroundColor: theme.colors.primary,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.heading,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
  },
  googleButton: {
    height: 54,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
  },
  googleButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.heading,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body,
  },
  footerLink: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.heading,
  },
});
