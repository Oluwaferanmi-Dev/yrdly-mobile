import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { LogLevel, OneSignal } from 'react-native-onesignal';

const APP_ID = '5a4addf4-b42e-478e-8225-d4ad06128381';

class OneSignalService {
  private isInitialized = false;

  initialize() {
    if (this.isInitialized) return;

    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    OneSignal.initialize(APP_ID);

    this.isInitialized = true;
  }

  login(userId: string) {
    OneSignal.login(userId);
  }

  logout() {
    OneSignal.logout();
  }

  async requestPermission() {
    OneSignal.Notifications.requestPermission(true);
  }
}

export const oneSignalService = new OneSignalService();

/**
 * A headless component that listens to OneSignal push subscription state
 * and shows an alert exactly once when a real subscription ID is assigned.
 */
export function OneSignalVerificationDialog() {
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    const checkSubscription = (id: string | null | undefined) => {
      if (hasShown) return;

      if (id && !id.startsWith('local-')) {
        setHasShown(true);
        Alert.alert(
          'Your OneSignal SDK integration is complete!',
          'You can now send Push Notifications & In-App Messages through OneSignal. Tap below to enable push notifications.',
          [
            {
              text: 'Got it',
              onPress: () => {
                oneSignalService.requestPermission();
              },
            },
          ]
        );
      }
    };

    // Check immediate state
    const currentId = OneSignal.User.pushSubscription.id;
    checkSubscription(currentId);

    // Check on change
    const listener = (event: any) => {
      checkSubscription(event.current.id);
    };

    OneSignal.User.pushSubscription.addEventListener('change', listener);

    return () => {
      OneSignal.User.pushSubscription.removeEventListener('change', listener);
    };
  }, [hasShown]);

  return null;
}
