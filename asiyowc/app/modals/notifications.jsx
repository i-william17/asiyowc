import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';

const NotificationsModal = () => {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    animateIn();
    loadNotifications();
  }, []);

  const animateIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  const loadNotifications = async () => {
    // Mock notifications data
    const mockNotifications = [
      {
        id: '1',
        type: 'like',
        title: 'New like on your post',
        message: 'Sarah Johnson liked your post about leadership',
        time: '2 min ago',
        read: false,
        icon: 'heart',
        color: '#EF4444',
      },
      {
        id: '2',
        type: 'comment',
        title: 'New comment',
        message: 'Grace Mwangi commented on your post',
        time: '1 hour ago',
        read: false,
        icon: 'chatbubble',
        color: '#3B82F6',
      },
      {
        id: '3',
        type: 'program',
        title: 'Program enrollment',
        message: 'You have been enrolled in Women in Leadership Accelerator',
        time: '3 hours ago',
        read: true,
        icon: 'school',
        color: '#10B981',
      },
      {
        id: '4',
        type: 'savings',
        title: 'Savings update',
        message: 'Your savings pod reached 75% of its goal',
        time: '1 day ago',
        read: true,
        icon: 'wallet',
        color: '#F59E0B',
      },
      {
        id: '5',
        type: 'community',
        title: 'New group member',
        message: 'A new member joined your Leadership group',
        time: '2 days ago',
        read: true,
        icon: 'people',
        color: '#8B5CF6',
      },
    ];
    setNotifications(mockNotifications);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Header */}
      <LinearGradient
        colors={['#6A1B9A', '#8E24AA']}
        style={tw`px-6 pt-16 pb-6 rounded-b-3xl`}
      >
        <View style={tw`flex-row justify-between items-center mb-4`}>
          <View>
            <Text style={tw`text-2xl font-bold text-white`}>
              Notifications
            </Text>
            <Text style={tw`text-white opacity-90 mt-1`}>
              {unreadCount} unread notifications
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {unreadCount > 0 && (
          <AnimatedButton
            title="Mark All as Read"
            onPress={markAllAsRead}
            variant="gold"
            size="sm"
          />
        )}
      </LinearGradient>

      <Animated.ScrollView
        style={[{ opacity: fadeAnim }, tw`flex-1`]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#6A1B9A']}
            tintColor="#6A1B9A"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <View style={tw`flex-1 items-center justify-center p-8`}>
            <LottieLoader type="celebration" size={150} loop={false} />
            <Text style={tw`text-xl font-semibold text-gray-900 mt-6 mb-2`}>
              No Notifications
            </Text>
            <Text style={tw`text-gray-500 text-center`}>
              You're all caught up! New notifications will appear here.
            </Text>
          </View>
        ) : (
          <View style={tw`p-4 space-y-3`}>
            {notifications.map((notification, index) => (
              <Animated.View
                key={notification.id}
                style={[
                  tw`bg-white rounded-2xl p-4 shadow-sm border-2`,
                  notification.read ? tw`border-gray-100` : tw`border-purple-100 bg-purple-50`,
                  {
                    opacity: fadeAnim,
                    transform: [{
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30 * (index + 1), 0],
                      }),
                    }],
                  }
                ]}
              >
                <TouchableOpacity
                  style={tw`flex-row items-start`}
                  onPress={() => markAsRead(notification.id)}
                >
                  <View style={[
                    tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
                    { backgroundColor: `${notification.color}20` }
                  ]}>
                    <Ionicons 
                      name={notification.icon} 
                      size={20} 
                      color={notification.color} 
                    />
                  </View>
                  
                  <View style={tw`flex-1`}>
                    <Text style={tw`font-semibold text-gray-900 mb-1`}>
                      {notification.title}
                    </Text>
                    <Text style={tw`text-gray-600 text-sm mb-2`}>
                      {notification.message}
                    </Text>
                    <Text style={tw`text-gray-400 text-xs`}>
                      {notification.time}
                    </Text>
                  </View>

                  {!notification.read && (
                    <View style={tw`w-3 h-3 rounded-full bg-purple-500`} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsModal;