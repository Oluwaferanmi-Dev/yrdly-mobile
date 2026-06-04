import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { usePushNotifications } from '../hooks/use-push-notifications';
import { AuthProvider, useAuth } from '../hooks/use-supabase-auth';
import { ThemeProvider } from '../context/ThemeContext';

function NotificationsHandler() {
  usePushNotifications();
  return null;
}

function RootNavigationGuard() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inTabs = segments[0] === '(tabs)';

    if (!user) {
      // Not signed in → always go to login
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    // Signed in — check onboarding state
    if (profile) {
      const needsProfile = !profile.profile_completed;
      const needsWelcome = profile.profile_completed && !(profile as any).welcome_message_sent;
      const needsTour = profile.profile_completed && (profile as any).welcome_message_sent && !(profile as any).tour_completed;

      if (needsProfile && !inOnboarding) {
        router.replace('/(onboarding)/profile');
      } else if (needsWelcome && !inOnboarding) {
        router.replace('/(onboarding)/welcome');
      } else if (needsTour && !inOnboarding) {
        router.replace('/(onboarding)/tour');
      } else if (!needsProfile && !needsWelcome && !needsTour && !inTabs) {
        // Onboarding complete — go to tabs
        router.replace('/(tabs)');
      }
    } else if (inAuth) {
      // profile not yet loaded but user exists and is on auth — wait
      return;
    }
  }, [user, profile, loading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(onboarding)" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationsHandler />
        <RootNavigationGuard />
      </AuthProvider>
    </ThemeProvider>
  );
}
