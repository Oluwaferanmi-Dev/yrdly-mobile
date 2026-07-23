import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { usePushNotifications } from '../hooks/use-push-notifications';
import { AuthProvider, useAuth } from '../hooks/use-supabase-auth';
import { ThemeProvider } from '../context/ThemeContext';
import { LocationProvider } from '../context/LocationContext';
import { NotificationBadgeProvider } from '../context/NotificationBadgeContext';
import { FriendshipProvider } from '../context/FriendshipContext';
import * as SplashScreen from 'expo-splash-screen';
import { PostHogProvider } from 'posthog-react-native';
import { setAudioModeAsync } from 'expo-audio';
import { OfflineBanner } from '../components/OfflineBanner';
import { ErrorBoundary } from '../components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {
  // already hidden, ignore
});


function NotificationsHandler() {
  usePushNotifications();
  return null;
}

function AudioSettingsHandler() {
  useEffect(() => {
    // Configure audio to play even when the physical silent switch is enabled on iOS
    // Wrapping in try-catch to prevent native bridge initialization crashes on Android
    const configureAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
        });
      } catch (e) {
        console.warn('[Yrdly] Failed to configure audio mode:', e);
      }
    };
    configureAudio();
  }, []);
  return null;
}

function RootNavigationGuard() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Auth state resolved — dismiss the splash screen
    SplashScreen.hideAsync().catch(() => {});

    const inAuth = segments[0] === '(auth)' || (segments[0] as string) === 'auth';
    const inOnboarding = segments[0] === '(onboarding)';

    // These segments are valid deep-link destinations — never redirect away from them
    const DEEP_LINK_SEGMENTS = ['posts', 'events', 'marketplace', 'profile', 'chat'];
    const inDeepLink = DEEP_LINK_SEGMENTS.includes(segments[0] as string);

    try {
      if (!user) {
        // Not signed in → always go to login
        if (!inAuth) router.replace('/(auth)/login');
        return;
      }

      // Signed in — wait for profile to load
      if (!profile) return;

      // If we're on a deep-linked content route, leave it alone
      if (inDeepLink) return;

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
    } catch (navError) {
      // Navigation can throw transiently while the navigator is mounting.
      // Swallow the error here — the effect will re-run when dependencies change.
      console.warn('[RootNavigationGuard] Navigation error (transient):', navError);
    }
  }, [user, profile, loading, segments, router]);

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(onboarding)" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="new-post" options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }} />
      </Stack>
    </ErrorBoundary>
  );
}

import { KeyboardProvider } from 'react-native-keyboard-controller';

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PostHogProvider apiKey={process.env.EXPO_PUBLIC_POSTHOG_KEY!} options={{ host: process.env.EXPO_PUBLIC_POSTHOG_HOST }}>
        <KeyboardProvider>
          <ThemeProvider>
            <BottomSheetModalProvider>
              <AuthProvider>
                <LocationProvider>
                  <NotificationBadgeProvider>
                    <FriendshipProvider>
                      <AudioSettingsHandler />
                      <NotificationsHandler />
                      <RootNavigationGuard />
                      <OfflineBanner />
                    </FriendshipProvider>
                  </NotificationBadgeProvider>
                </LocationProvider>
              </AuthProvider>
            </BottomSheetModalProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}
