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
import * as Insights from 'expo-insights';
import { PostHogProvider } from 'posthog-react-native';
// vexo is imported dynamically below
import { setAudioModeAsync } from 'expo-audio';
import { OfflineBanner } from '../components/OfflineBanner';
import { ErrorBoundary } from '../components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {
  // already hidden, ignore
});

import { vexo } from 'vexo-analytics';

// expo-insights: automatic cold-start tracking
void Insights;

if (process.env.EXPO_PUBLIC_VEXO_API_KEY) {
  try {
    vexo(process.env.EXPO_PUBLIC_VEXO_API_KEY);
  } catch (e) {
    console.warn('[Yrdly] Failed to initialize vexo analytics:', e);
  }
}

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

    if (!user) {
      // Not signed in → always go to login (deep links will resume after auth if needed)
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

import { KeyboardProvider } from 'react-native-keyboard-controller';

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PostHogProvider apiKey={process.env.EXPO_PUBLIC_POSTHOG_KEY!} options={{ host: process.env.EXPO_PUBLIC_POSTHOG_HOST }}>
        <KeyboardProvider>
        <ErrorBoundary>
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
        </ErrorBoundary>
      </KeyboardProvider>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}
