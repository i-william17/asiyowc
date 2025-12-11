import React, { useEffect } from "react";
import { View, TouchableOpacity, Image, Platform, Text } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { fetchUserProfile } from "../../store/slices/userSlice";
import ShimmerLoader from "../../components/ui/ShimmerLoader";
import tw from "../../utils/tw";

export default function TabLayout() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.user);

  const fullName = user?.profile?.fullName;
  const firstName = fullName?.split(" ")[0] || "User";
  const avatar = user?.profile?.avatar?.url;

  useEffect(() => {
    dispatch(fetchUserProfile());
  }, []);

  // ⭐ Loading State
  if (loading || !user) {
    return (
      <View style={tw`flex-1 bg-white`}>
        <ShimmerLoader />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* MAIN TAB NAVIGATION */}
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: { height: 140 },
          headerTintColor: "#FFFFFF",

          tabBarStyle: [
            tw`bg-white border-t border-gray-200`,
            { height: Platform.OS === "android" ? 65 : 70 },
          ],

          tabBarActiveTintColor: "#6A1B9A",
          tabBarInactiveTintColor: "#9CA3AF",

          tabBarLabelStyle: {
            fontFamily: "Poppins-Medium",
            fontSize: 12,
            marginBottom: Platform.OS === "android" ? 4 : -2,
          },
        }}
      >

        {/* 🏠 HOME */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",

            headerBackground: () => (
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#6A1B9A",
                  borderBottomLeftRadius: 35,
                  borderBottomRightRadius: 35,
                  overflow: "hidden",
                }}
              />
            ),

            headerTitle: () => (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
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
                      {firstName?.charAt(0)?.toUpperCase()}
                    </Text>
                  </View>
                )}

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

            headerRight: () => (
              <TouchableOpacity
                style={{ marginRight: 18 }}
                onPress={() => router.push("/modals/notifications")}
              >
                <Ionicons name="notifications" size={28} color="#FFD700" />
              </TouchableOpacity>
            ),

            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />

        {/* 👥 COMMUNITY */}
        <Tabs.Screen
          name="community"
          options={{
            headerShown: false,
            title: "Community",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />

        {/* 🎓 PROGRAMS */}
        <Tabs.Screen
          name="programs"
          options={{
            headerShown: false,
            title: "Programs",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="school" size={size} color={color} />
            ),
          }}
        />

        {/* 💰 SAVINGS */}
        <Tabs.Screen
          name="savings"
          options={{
            headerShown: false,
            title: "Savings",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="wallet" size={size} color={color} />
            ),
          }}
        />

        {/* 👤 PROFILE */}
        <Tabs.Screen
          name="profile"
          options={{
            headerShown: false,
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* =====================================================
          🌟 FLOATING ACTION BUTTON — RIGHT (MORE MENU)
      ====================================================== */}
      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 95,
          right: 20,
          backgroundColor: "#6A1B9A",
          width: 60,
          height: 60,
          borderRadius: 30,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 9,
        }}
        onPress={() => router.push("/modals/moreMenu")}
      >
        <Ionicons name="grid" size={28} color="#fff" />
      </TouchableOpacity>

      {/* =====================================================
          🤖 FLOATING ACTION BUTTON — LEFT (AI CHAT)
      ====================================================== */}
      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 95,
          left: 20,
          backgroundColor: "#EFBF04",
          width: 60,
          height: 60,
          borderRadius: 30,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 9,
        }}
        onPress={() => router.push("/modals/aiChat")}
      >
        <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
