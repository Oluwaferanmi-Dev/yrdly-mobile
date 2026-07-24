import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '../../hooks/use-supabase-auth';
import { Feather, AntDesign } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../context/ThemeContext';
import { ErrorMessage } from '../../components/ErrorMessage';

const { width, height } = Dimensions.get('window');


export default function Login() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [legalName, setLegalName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, signUp, signInWithGoogle, loading } = useAuth();

  const handleAuth = async () => {
    if (!email || !password || (isSignUp && (!name || !legalName || !username))) {
      setError('Please fill in all fields');
      return;
    }
    
    setError('');
    
    if (!isSignUp) {
      const { error: signInError } = await signIn(email, password);
      if (signInError) setError(signInError.message);
    } else {
      const { error: signUpError, session } = await signUp(email, password, name, legalName, username);
      if (signUpError) {
        setError(signUpError.message);
      } else if (!session) {
        // Supabase sent OTP (email confirmation is enabled) — navigate to verification screen
        router.push({ pathname: '/(auth)/verify-otp', params: { email } } as any);
      }
      // If session exists, email confirmation is disabled/verified, and the RootNavigationGuard will automatically route us away.
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const { error: err } = await signInWithGoogle();
    if (err) setError(err.message);
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
          {...({ intensity: 20, tint: colors.background === '#121212' ? 'dark' : 'light', fallbackColor: colors.background === '#121212' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.4)' } as any)}
          style={StyleSheet.absoluteFillObject} 
        />
      ) : Platform.OS === 'ios' ? (
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} tint={colors.background === '#121212' ? 'dark' : 'light'} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background === '#121212' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.4)' }]} />
      )}

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.formContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>See what's happening</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to your Yrdly account</Text>
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={require('../../../assets/images/logo.png')} style={styles.logo} contentFit="contain" />
        </View>

        {/* Removed Segmented Control */}

        <ErrorMessage error={error} />

        {/* Inputs */}
        {isSignUp && (
          <>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
                placeholder="Username (e.g. johndoe123)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!loading}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
                placeholder="Display Name (e.g. John Doe)"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!loading}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
                placeholder="Full Legal Name"
                value={legalName}
                onChangeText={setLegalName}
                autoCapitalize="words"
                editable={!loading}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={{fontSize: 11, color: colors.textMuted, marginTop: 4, marginLeft: 12}}>
                Kept private. Required to verify your bank account for payouts.
              </Text>
            </View>
          </>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            placeholderTextColor={colors.textMuted}
          />
          <Feather name="mail" size={20} color={colors.textMuted} style={styles.inputIcon} />
        </View>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity 
            style={styles.inputIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Feather name={showPassword ? "eye-off" : "eye"} size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {!isSignUp && (
          <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={() => router.push('/(auth)/forgot-password' as any)}
          >
            <Text style={[styles.forgotPasswordText, { color: colors.tint }]}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.tint }]} 
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.card} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.card }]}>{isSignUp ? 'Create Account' : 'Sign in'}</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR CONTINUE WITH</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Google Auth Button */}
        <TouchableOpacity 
          style={[styles.googleButton, { borderColor: colors.tint }]} 
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <AntDesign name="google" size={18} color="#EA4335" style={{ marginRight: 8 }} />
          <Text style={[styles.googleButtonText, { color: colors.text }]}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Toggle Footer Text */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
          </Text>
          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={[styles.footerLink, { color: colors.tint }]}>{isSignUp ? "Sign in" : "Sign up"}</Text>
          </TouchableOpacity>
        </View>

      </View>
      </ScrollView>
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
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
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
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontSize: 12,
    fontWeight: '500',
  },
  button: {
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    letterSpacing: 1,
  },
  googleButton: {
    height: 54,
    borderWidth: 1,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 13,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '600',
  },
});
