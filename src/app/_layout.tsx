import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Audio } from 'expo-av';
import { usePushNotifications } from '../hooks/use-push-notifications';
import { AuthProvider, useAuth } from '../hooks/use-supabase-auth';
import { ThemeProvider } from '../context/ThemeContext';
import { LocationProvider } from '../context/LocationContext';
import { NotificationBadgeProvider } from '../context/NotificationBadgeContext';

function NotificationsHandler() {
  usePushNotifications();
  return null;
}

// Configure audio to play even when the physical silent switch is enabled on iOS
Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,
});

function RootNavigationGuard() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!user) {
      // Not signed in → always go to login
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    // Signed in — wait for profile to load
    if (!profile) return;

    // Signed in and profile loaded — check onboarding state
    const needsProfile = !profile.profile_completed;
    const needsWelcome = profile.profile_completed && !(profile as any).welcome_message_sent;
    const needsTour = profile.profile_completed && (profile as any).welcome_message_sent && !(profile as any).tour_completed;

    if (needsProfile) {
      if (!inOnboarding) router.replace('/(onboarding)/profile');
    } else if (needsWelcome) {
      if (!inOnboarding) router.replace('/(onboarding)/welcome');
    } else if (needsTour) {
      if (!inOnboarding) router.replace('/(onboarding)/tour');
    } else {
      // Onboarding complete — redirect out of auth/onboarding/root to tabs
      const isRoot = (segments as any).length === 0 || (segments[0] as string) === 'index' || (segments[0] as string) === '';
      if (inAuth || inOnboarding || isRoot) {
        router.replace('/(tabs)');
      }
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <BottomSheetModalProvider>
          <AuthProvider>
            <LocationProvider>
              <NotificationBadgeProvider>
                <NotificationsHandler />
                <RootNavigationGuard />
              </NotificationBadgeProvider>
            </LocationProvider>
          </AuthProvider>
        </BottomSheetModalProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
