import React, { useEffect } from 'react';
import { View, TouchableOpacity, Image, Platform, Text } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUserProfile } from '../../store/slices/userSlice';
import tw from '../../utils/tw';

export default function TabLayout() {
  const router = useRouter();
  const dispatch = useDispatch();

  // ⭐ Fetch user from userSlice
  const user = useSelector((state) => state.user.user);

  // ⭐ Extract first name
  const fullName = user?.profile?.fullName;
  const firstName = fullName?.split(" ")[0] || "User";

  // ⭐ Extract avatar (may be null)
  const avatar = user?.profile?.avatar?.url;

  // ⭐ Fetch user profile when Tabs loads
  useEffect(() => {
    dispatch(fetchUserProfile());
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          height: 140,
        },

        // ⭐ Purple Header BG
        headerBackground: () => (
          <View
            style={{
              flex: 1,
              backgroundColor: '#6A1B9A',
              borderBottomLeftRadius: 35,
              borderBottomRightRadius: 35,
              overflow: 'hidden',
            }}
          />
        ),

        // ==========================
        // ⭐ CUSTOM HEADER TITLE AREA
        // ==========================
        headerTitle: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {/* ⭐ Avatar on the LEFT */}
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  borderWidth: 2,
                  borderColor: "white",
                }}
              />
            ) : (
              // ⭐ Fallback Initial Bubble
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: "#FFD700",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#6A1B9A",
                    fontFamily: "Poppins-Bold",
                    fontSize: 16,
                  }}
                >
                  {firstName?.charAt(0) || "U"}
                </Text>
              </View>
            )}

            {/* ⭐ Welcome + First Name */}
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: "Poppins-Bold",
                fontSize: 20,
              }}
            >
              Welcome, {firstName}
            </Text>
          </View>
        ),

        headerTintColor: "#FFFFFF",

        // ⭐ Tab Bar Styling
        tabBarStyle: [
          tw`bg-white border-t border-gray-200`,
          { height: Platform.OS === "android" ? 65 : 70 },
        ],

        tabBarActiveTintColor: '#6A1B9A',
        tabBarInactiveTintColor: '#9CA3AF',

        tabBarLabelStyle: {
          fontFamily: 'Poppins-Medium',
          fontSize: 12,
          marginBottom: Platform.OS === 'android' ? 4 : -2,
        },
      }}
    >

      {/* 🏠 HOME */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),

          // ⭐ Notification icon on RIGHT
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 18 }}
              onPress={() => router.push('/modals/notifications')}
            >
              <Ionicons name="notifications" size={28} color="#FFD700" />
            </TouchableOpacity>
          ),
        }}
      />

      {/* 👥 COMMUNITY */}
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />

      {/* 🎓 PROGRAMS */}
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Programs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school" size={size} color={color} />
          ),
        }}
      />

      {/* 💰 SAVINGS */}
      <Tabs.Screen
        name="savings"
        options={{
          title: 'Savings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />

      {/* 👤 PROFILE */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}
