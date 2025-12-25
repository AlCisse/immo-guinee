import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { api } from '@/lib/api/client';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Notification types
export interface PushNotificationData {
  type: 'new_message' | 'message_read' | 'visit_reminder' | 'listing_update' | 'general';
  conversation_id?: string;
  message_id?: string;
  listing_id?: string;
  sender_name?: string;
  sender_avatar?: string;
  preview?: string;
}

// Push notification service
class PushNotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private isInitialized = false;

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<string | null> {
    if (this.isInitialized) {
      return this.expoPushToken;
    }

    // Check if we're on a physical device
    if (!Device.isDevice) {
      if (__DEV__) console.log('[Push] Must use physical device for push notifications');
      return null;
    }

    try {
      // Request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        if (__DEV__) console.log('[Push] Permission not granted');
        return null;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      this.expoPushToken = tokenData.data;

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      // Setup listeners
      this.setupListeners();

      this.isInitialized = true;

      if (__DEV__) console.log('[Push] Initialized with token:', this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      if (__DEV__) console.error('[Push] Error initializing:', error);
      return null;
    }
  }

  /**
   * Setup Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    // Messages channel
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      description: 'Notifications pour les nouveaux messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    // Visits channel
    await Notifications.setNotificationChannelAsync('visits', {
      name: 'Visites',
      description: 'Rappels pour les visites programmées',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500],
      lightColor: '#3B82F6',
      sound: 'default',
    });

    // General channel
    await Notifications.setNotificationChannelAsync('general', {
      name: 'Général',
      description: 'Notifications générales',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  /**
   * Setup notification listeners
   */
  private setupListeners(): void {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) console.log('[Push] Notification received:', notification);
        this.handleForegroundNotification(notification);
      }
    );

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (__DEV__) console.log('[Push] Notification tapped:', response);
        this.handleNotificationResponse(response);
      }
    );
  }

  /**
   * Handle notification received while app is in foreground
   */
  private handleForegroundNotification(notification: Notifications.Notification): void {
    const data = notification.request.content.data as PushNotificationData;

    // You can add custom logic here, e.g., update badge count,
    // show in-app notification banner, etc.

    if (data.type === 'new_message') {
      // Update unread count in messaging store
      // This would be handled by the real-time WebSocket connection
    }
  }

  /**
   * Handle notification tap - navigate to appropriate screen
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data as PushNotificationData;

    switch (data.type) {
      case 'new_message':
        if (data.conversation_id) {
          router.push(`/chat/${data.conversation_id}`);
        } else {
          router.push('/(tabs)/messages');
        }
        break;

      case 'visit_reminder':
        router.push('/(tabs)/visits');
        break;

      case 'listing_update':
        if (data.listing_id) {
          router.push(`/listing/${data.listing_id}`);
        }
        break;

      default:
        // Navigate to home or notifications screen
        router.push('/(tabs)');
        break;
    }
  }

  /**
   * Register push token with backend
   */
  async registerToken(): Promise<boolean> {
    if (!this.expoPushToken) {
      await this.initialize();
    }

    if (!this.expoPushToken) {
      return false;
    }

    try {
      await api.auth.registerPushToken({
        token: this.expoPushToken,
        platform: Platform.OS as 'ios' | 'android',
      });

      if (__DEV__) console.log('[Push] Token registered with backend');
      return true;
    } catch (error) {
      if (__DEV__) console.error('[Push] Error registering token:', error);
      return false;
    }
  }

  /**
   * Unregister push token from backend (on logout)
   */
  async unregisterToken(): Promise<void> {
    if (!this.expoPushToken) return;

    try {
      await api.auth.removePushToken(this.expoPushToken);
      if (__DEV__) console.log('[Push] Token unregistered');
    } catch (error) {
      if (__DEV__) console.error('[Push] Error unregistering token:', error);
    }
  }

  /**
   * Get current push token
   */
  getToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      if (__DEV__) console.error('[Push] Error setting badge:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAll(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
    await this.setBadgeCount(0);
  }

  /**
   * Schedule a local notification (for reminders)
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data: PushNotificationData,
    triggerSeconds: number
  ): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: {
        seconds: triggerSeconds,
      },
    });

    return id;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }

    this.isInitialized = false;
  }

  /**
   * Check if push notifications are enabled
   */
  async isEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Get last notification response (for app launch from notification)
   */
  async getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
    return await Notifications.getLastNotificationResponseAsync();
  }
}

// Export singleton instance
export const pushNotifications = new PushNotificationService();

// Hook for using push notifications in components
export function usePushNotifications() {
  return {
    initialize: () => pushNotifications.initialize(),
    registerToken: () => pushNotifications.registerToken(),
    unregisterToken: () => pushNotifications.unregisterToken(),
    getToken: () => pushNotifications.getToken(),
    setBadgeCount: (count: number) => pushNotifications.setBadgeCount(count),
    clearAll: () => pushNotifications.clearAll(),
    isEnabled: () => pushNotifications.isEnabled(),
    cleanup: () => pushNotifications.cleanup(),
  };
}
