import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { usePushNotifications } from '../hooks/use-push-notifications';
import { AuthProvider, useAuth } from '../hooks/use-supabase-auth';

function NotificationsHandler() {
  usePushNotifications();
  return null;
}

function RootNavigationGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (!user && !inAuthGroup) {
      // User is logged out but trying to access the app -> redirect to login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // User is logged in but stuck on auth screen -> redirect to tabs
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <AuthProvider>
      <NotificationsHandler />
      <RootNavigationGuard />
    </AuthProvider>
  );
}
