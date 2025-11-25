// services/notification.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from './api';

// Are we in Expo Go?
const isExpoGo = Constants.appOwnership === 'expo';

class NotificationService {
  constructor() {
    this.token = null;
    this.isConfigured = false;
    this.isExpoGo = isExpoGo;
  }

  /* ---------------------------------------------------------
     CONFIGURE NOTIFICATION HANDLER
  ---------------------------------------------------------- */
  async configure() {
    if (this.isConfigured) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    this.isConfigured = true;
  }

  /* ---------------------------------------------------------
     REGISTER FOR PUSH NOTIFICATIONS
     (Returns token for dev/build; local fallback for Expo Go)
  ---------------------------------------------------------- */
  async registerForPushNotificationsAsync() {
    await this.configure();

    if (this.isExpoGo) {
      console.warn("Expo Go does not support push tokens. Using local notifications only.");
      return null;
    }

    if (!Device.isDevice) {
      console.warn("Must use physical device for push notifications.");
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Push notification permissions not granted.");
      return null;
    }

    try {
      const token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })
      ).data;

      this.token = token;

      // OPTIONAL: send token to backend
      await this.registerTokenWithBackend(token);

      return token;
    } catch (error) {
      console.error("Error getting push token:", error);
      return null;
    }
  }

  /* ---------------------------------------------------------
     BACKEND TOKEN REGISTRATION (safe optional)
  ---------------------------------------------------------- */
  async registerTokenWithBackend(token) {
    try {
      await apiClient.post("/notifications/register-token", {
        expoPushToken: token,
        deviceId: Device.modelId,
        platform: Platform.OS,
      });
    } catch (error) {
      console.log("No backend token registration available.");
    }
  }

  /* ---------------------------------------------------------
     SEND LOCAL NOTIFICATION (Expo Go fallback)
  ---------------------------------------------------------- */
  async sendLocalFallback(title, body, data = {}) {
    console.log("Expo Go fallback notification:", title, body);

    return this.scheduleLocalNotification(title, body, data);
  }

  /* ---------------------------------------------------------
     SCHEDULE LOCAL NOTIFICATION (works everywhere)
  ---------------------------------------------------------- */
  async scheduleLocalNotification(title, body, data = {}, trigger = { seconds: 1 }) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data, sound: true },
        trigger,
      });
    } catch (error) {
      console.error("Failed to schedule notification:", error);
    }
  }

  /* ---------------------------------------------------------
     SEND PUSH NOTIFICATION (only works with backend)
  ---------------------------------------------------------- */
  async sendPushNotification(payload) {
    try {
      const res = await apiClient.post("/notifications/send", payload);
      return res.data;
    } catch (error) {
      console.log("Push not available → using local fallback.");
      return this.sendLocalFallback(payload.title, payload.body, payload.data);
    }
  }

  /* ---------------------------------------------------------
     UNIFIED SEND (auto chooses push or local)
  ---------------------------------------------------------- */
  async sendNotification(title, body, data = {}) {
    if (this.isExpoGo || !this.token) {
      return this.sendLocalFallback(title, body, data);
    }

    return this.sendPushNotification({
      to: this.token,
      title,
      body,
      data,
    });
  }

  /* ---------------------------------------------------------
     MOCKED BACKEND-LIKE METHODS TO PREVENT ERRORS
     → These prevent crashes when NotificationContext calls them
  ---------------------------------------------------------- */

  async getUserNotifications() {
    // No backend → return empty set
    return [];
  }

  async markAsRead() {
    return true;
  }

  async markAllAsRead() {
    return true;
  }

  async handleNotificationResponse(response) {
    console.log("Notification tapped:", response);
    return true;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
