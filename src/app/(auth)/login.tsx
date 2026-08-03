import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Logo,
  SceneBg,
  GlassCard,
  GlassInput,
  PasswordStrength,
  PrimaryBtn,
  Divider,
  SocialRow,
} from '@/components/onboarding/primitives';
import { ONBOARDING_THEME } from '@/constants/onboarding-theme';
import { AuthService } from '@/lib/auth-service';
import { useAuth } from '@/hooks/use-supabase-auth';
import { Ionicons } from '@expo/vector-icons';

const { colors } = ONBOARDING_THEME;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle, signInWithApple, loading } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const isPasswordStrong = (pw: string) => {
    return (
      pw.length >= 8 &&
      /[A-Z]/.test(pw) &&
      /[0-9]/.test(pw) &&
      /[^A-Za-z0-9]/.test(pw)
    );
  };

  const handleGoogle = async () => {
    setError('');
    const { error: err } = await signInWithGoogle();
    if (err) setError(err.message);
  };

  const handleApple = async () => {
    setError('');
    const { error: err } = await signInWithApple();
    if (err) setError(err.message);
  };

  const handleAuth = async () => {
    if (!email || !password || (isSignUp && (!name || !username))) {
      setError('Please fill in all required fields');
      return;
    }

    if (isSignUp && !isPasswordStrong(password)) {
      setError('Please create a strong password meeting all 4 requirements below');
      return;
    }

    setError('');
    if (!isSignUp) {
      const { error: err } = await signIn(email, password);
      if (err) setError(err.message);
      else router.push('/(tabs)');
    } else {
      const cleanUsername = username.replace(/^@/, '').trim();
      const isAvailable = await AuthService.checkUsernameAvailability(cleanUsername);
      if (!isAvailable) {
        setError(`The username @${cleanUsername} is already taken. Please choose another.`);
        return;
      }

      const { error: err, session } = await signUp(email, password, name, username);
      if (err) {
        setError(err.message);
      } else if (!session) {
        router.push({ pathname: '/(auth)/verify-email', params: { email } } as any);
      } else {
        router.push('/(auth)/phone' as any);
      }
    }
  };

  return (
    <View style={styles.container}>
      <SceneBg
        photoId={isSignUp ? '1571346746462-d4e51c41072f' : '1707011017057-e80acf66ddeb'}
        gradientStart="40%"
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <Logo size={36} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.flexSpacer} />

            <GlassCard>
              <View style={styles.titleBox}>
                <Text style={styles.titleText}>
                  {isSignUp ? 'Join your neighbourhood' : 'Welcome back'}
                </Text>
                <Text style={styles.subtitleText}>
                  {isSignUp
                    ? 'Create your account — it only takes a moment'
                    : 'Sign in to your neighbourhood'}
                </Text>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.inputStack}>
                {isSignUp && (
                  <>
                    <GlassInput
                      placeholder="Full name"
                      value={name}
                      onChange={setName}
                      icon={<Ionicons name="person-outline" size={18} color={colors.LABEL} />}
                    />
                    <GlassInput
                      placeholder="Username (e.g. johndoe)"
                      value={username}
                      onChange={setUsername}
                      icon={<Ionicons name="at-outline" size={18} color={colors.LABEL} />}
                    />
                  </>
                )}

                <GlassInput
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={setEmail}
                  keyboardType="email-address"
                  icon={<Ionicons name="mail-outline" size={18} color={colors.LABEL} />}
                />

                <GlassInput
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isSignUp ? 'Create a password' : 'Password'}
                  value={password}
                  onChange={setPassword}
                  icon={<Ionicons name="lock-closed-outline" size={18} color={colors.LABEL} />}
                  right={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={colors.LABEL}
                      />
                    </TouchableOpacity>
                  }
                />

                {isSignUp && password.length > 0 && <PasswordStrength value={password} />}

                {!isSignUp && (
                  <TouchableOpacity
                    onPress={() => router.push('/(auth)/forgot-password')}
                    style={styles.forgotBtn}
                  >
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
                )}
              </View>

              <PrimaryBtn
                label={isSignUp ? 'Create Account' : 'Sign In'}
                onClick={handleAuth}
                disabled={loading}
              />

              <Divider label="or continue with" />

              <SocialRow onGooglePress={handleGoogle} onApplePress={handleApple} />

              <View style={styles.crossLinkRow}>
                <Text style={styles.crossLinkText}>
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                </Text>
                <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setError(''); }}>
                  <Text style={styles.crossLinkAction}>
                    {isSignUp ? 'Sign in' : 'Sign up'}
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  flexSpacer: {
    flex: 1,
    minHeight: 40,
  },
  titleBox: {
    gap: 4,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitleText: {
    fontSize: 14,
    color: colors.LABEL,
  },
  errorText: {
    color: colors.DANGER,
    fontSize: 13,
    fontWeight: '500',
  },
  inputStack: {
    gap: 12,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    color: colors.G,
    fontSize: 13,
    fontWeight: '500',
  },
  crossLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crossLinkText: {
    fontSize: 14,
    color: colors.LABEL,
  },
  crossLinkAction: {
    color: colors.G,
    fontSize: 14,
    fontWeight: '600',
  },
});
