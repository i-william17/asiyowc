// services/notification.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from './api';

// Check if we're in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

class NotificationService {
  constructor() {
    this.token = null;
    this.isConfigured = false;
    this.isExpoGo = isExpoGo;
  }

  // Configure notifications
  async configure() {
    if (this.isConfigured || this.isExpoGo) return;

    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    this.isConfigured = true;
  }

  // Register for push notifications
  async registerForPushNotificationsAsync() {
    if (this.isExpoGo) {
      console.warn('Push notifications not available in Expo Go. Use development build.');
      return null;
    }

    if (!Device.isDevice) {
      console.warn('Must use physical device for Push Notifications');
      return null;
    }

    await this.configure();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }

    try {
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;

      this.token = token;
      
      // Register token with backend
      await this.registerTokenWithBackend(token);
      
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Register token with backend
  async registerTokenWithBackend(token) {
    try {
      await apiClient.post('/notifications/register-token', {
        expoPushToken: token,
        deviceId: Device.modelId,
        platform: Platform.OS,
      });
    } catch (error) {
      console.error('Failed to register token with backend:', error);
    }
  }

  // Local notification fallback for Expo Go
  async sendLocalFallback(title, body, data = {}) {
    if (this.isExpoGo) {
      console.log('Expo Go: Simulating notification -', title, body);
      // You could show an alert or in-app notification here
      return this.scheduleLocalNotification(title, body, data);
    }
  }

  // Schedule local notification (works in both Expo Go and development builds)
  async scheduleLocalNotification(title, body, data = {}, trigger = null) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: trigger || { seconds: 1 },
      });
    } catch (error) {
      console.error('Failed to schedule local notification:', error);
    }
  }

  // ... rest of the methods remain the same as previous version

  // Enhanced send notification that works in both environments
  async sendNotification(title, body, data = {}, options = {}) {
    if (this.isExpoGo) {
      // Use local notifications in Expo Go
      return this.sendLocalFallback(title, body, data);
    } else {
      // Use push notifications in development builds
      return this.sendPushNotification({
        to: this.token,
        title,
        body,
        data,
        ...options
      });
    }
  }
}

// Create singleton instance
export const notificationService = new NotificationService();
export default notificationService;