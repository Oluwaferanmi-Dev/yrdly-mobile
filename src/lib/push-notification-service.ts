import { supabase } from './supabase';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  url?: string;
}

export class PushNotificationService {
  /**
   * Send push notification to a specific user
   */
  static async sendToUser(userId: string, payload: PushNotificationPayload): Promise<boolean> {
    try {
      // 1. Get user's push token from Supabase
      const { data: user, error } = await supabase
        .from('users')
        .select('push_token')
        .eq('id', userId)
        .single();

      if (error || !user?.push_token) {
        console.log(`[PushNotification] No push token found for user ${userId}`);
        return false;
      }

      // 2. Send request to Expo Push API
      const message = {
        to: user.push_token,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        badge: payload.badge ? parseInt(payload.badge, 10) : undefined,
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Expo API returned ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   */
  static async sendToUsers(userIds: string[], payload: PushNotificationPayload): Promise<number> {
    let successCount = 0;
    for (const userId of userIds) {
      const success = await this.sendToUser(userId, payload);
      if (success) successCount++;
    }
    return successCount;
  }

  /**
   * Send push notification to all users
   */
  static async sendToAllUsers(payload: PushNotificationPayload): Promise<number> {
    console.log('[PushNotification] sendToAllUsers pending backend implementation for broadcast');
    return 0;
  }

  /**
   * Test push notification (for development)
   */
  static async testNotification(userId: string): Promise<boolean> {
    return this.sendToUser(userId, {
      title: 'Test Notification',
      body: 'This is a test push notification from Yrdly!',
      url: '/home'
    });
  }
}
