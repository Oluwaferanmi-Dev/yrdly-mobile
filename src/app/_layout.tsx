import { Stack } from 'expo-router';
import { usePushNotifications } from '../hooks/use-push-notifications';

export default function Layout() {
  usePushNotifications();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Yrdly' }} />
    </Stack>
  );
}
