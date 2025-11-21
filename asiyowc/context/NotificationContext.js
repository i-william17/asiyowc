// context/NotificationContext.js
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useSelector } from 'react-redux';
import { notificationService } from '../services/notifications';

const NotificationContext = createContext();

// Check if we're in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

const notificationReducer = (state, action) => {
  switch (action.type) {
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter(n => !n.read).length,
      };
    case 'ADD_NOTIFICATION':
      const newNotifications = [action.payload, ...state.notifications];
      return {
        ...state,
        notifications: newNotifications,
        unreadCount: newNotifications.filter(n => !n.read).length,
      };
    case 'MARK_AS_READ':
      const updatedNotifications = state.notifications.map(notification =>
        notification.id === action.payload 
          ? { ...notification, read: true }
          : notification
      );
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.read).length,
      };
    case 'MARK_ALL_READ':
      const allReadNotifications = state.notifications.map(notification => ({
        ...notification,
        read: true
      }));
      return {
        ...state,
        notifications: allReadNotifications,
        unreadCount: 0,
      };
    case 'SET_EXPO_PUSH_TOKEN':
      return {
        ...state,
        expoPushToken: action.payload,
      };
    case 'SET_NOTIFICATION_SUPPORT':
      return {
        ...state,
        isSupported: action.payload,
      };
    default:
      return state;
  }
};

export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, {
    notifications: [],
    unreadCount: 0,
    expoPushToken: null,
    notification: null,
    isSupported: !isExpoGo, // Disable in Expo Go
  });

  const notificationListener = useRef();
  const responseListener = useRef();
  const authState = useSelector(state => state.auth);

  useEffect(() => {
    if (!state.isSupported) {
      console.log('Push notifications not supported in Expo Go. Use development build for full functionality.');
      return;
    }

    const setupNotifications = async () => {
      try {
        await notificationService.configure();
        
        const token = await notificationService.registerForPushNotificationsAsync();
        if (token) {
          dispatch({ type: 'SET_EXPO_PUSH_TOKEN', payload: token });
        }

        // Listen for incoming notifications
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
          dispatch({ type: 'ADD_NOTIFICATION', payload: {
            id: notification.request.identifier,
            title: notification.request.content.title,
            body: notification.request.content.body,
            data: notification.request.content.data,
            read: false,
            timestamp: new Date(),
          }});
        });

        // Listen for notification responses
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
          console.log('Notification tapped:', response);
          // Handle navigation based on notification data
          notificationService.handleNotificationResponse(response);
        });

      } catch (error) {
        console.error('Failed to setup notifications:', error);
        dispatch({ type: 'SET_NOTIFICATION_SUPPORT', payload: false });
      }
    };

    setupNotifications();

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [state.isSupported]);

  // Fetch notifications when user is authenticated
  useEffect(() => {
    if (authState.token) {
      fetchNotifications();
    }
  }, [authState.token]);

  const fetchNotifications = async () => {
    try {
      const notifications = await notificationService.getUserNotifications();
      dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const sendNotification = async (title, body, data = {}) => {
    if (!state.isSupported) {
      console.warn('Notifications not supported in this environment');
      return;
    }

    try {
      await notificationService.sendPushNotification({
        to: state.expoPushToken,
        title,
        body,
        data,
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const sendLocalNotification = async (title, body, data = {}) => {
    try {
      await notificationService.scheduleLocalNotification(title, body, data);
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      dispatch({ type: 'MARK_AS_READ', payload: notificationId });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      dispatch({ type: 'MARK_ALL_READ' });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const scheduleLocalNotification = async (title, body, data = {}, trigger = null) => {
    try {
      await notificationService.scheduleLocalNotification(title, body, data, trigger);
    } catch (error) {
      console.error('Failed to schedule local notification:', error);
    }
  };

  const notificationContextValue = React.useMemo(() => ({
    ...state,
    sendNotification,
    sendLocalNotification,
    markAsRead,
    markAllAsRead,
    scheduleLocalNotification,
    fetchNotifications,
    isExpoGo,
  }), [state]);

  return (
    <NotificationContext.Provider value={notificationContextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};