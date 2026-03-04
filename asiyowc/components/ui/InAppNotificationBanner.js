import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Image,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "../../utils/tw";

/* ============================================================
   ICON + COLOR MAP
============================================================ */

const typeConfig = {
  community: {
    icon: "chatbubble-ellipses",
    color: "#6366F1",
  },
  program: {
    icon: "book",
    color: "#7C3AED",
  },
  post: {
    icon: "newspaper",
    color: "#0EA5E9",
  },
  savings: {
    icon: "wallet",
    color: "#10B981",
  },
  default: {
    icon: "notifications",
    color: "#6B7280",
  },
};

/* ============================================================
   COMPONENT
============================================================ */

export default function InAppNotificationBanner({
  visible,
  title,
  body,
  avatar,
  data,
  onPress,
  onHide,
}) {
  const translateY = useRef(new Animated.Value(-160)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const type = data?.type || "default";
  const config = typeConfig[type] || typeConfig.default;

  /* ================= SHOW ANIMATION ================= */

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 90,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hide();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  /* ================= HIDE ================= */

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -160,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  /* ================= SWIPE TO DISMISS ================= */

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dy) > 6;
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy < 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -50) {
          hide();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        tw`absolute left-0 right-0 z-50`,
        {
          top: 0,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onPress}
        style={tw`mx-4 mt-12 bg-white rounded-2xl shadow-lg border border-gray-200`}
      >
        <View style={tw`flex-row items-center p-4`}>
          {/* ================= AVATAR ================= */}

          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={tw`w-12 h-12 rounded-full mr-3`}
            />
          ) : (
            <View
              style={[
                tw`w-12 h-12 rounded-full items-center justify-center mr-3`,
                { backgroundColor: config.color + "20" },
              ]}
            >
              <Ionicons
                name={config.icon}
                size={22}
                color={config.color}
              />
            </View>
          )}

          {/* ================= TEXT ================= */}

          <View style={tw`flex-1`}>
            <Text
              numberOfLines={1}
              style={tw`text-gray-900 font-semibold text-base`}
            >
              {title}
            </Text>

            {body ? (
              <Text
                numberOfLines={2}
                style={tw`text-gray-600 mt-1 text-sm`}
              >
                {body}
              </Text>
            ) : null}
          </View>

          {/* ================= ICON ================= */}

          <View style={tw`ml-2`}>
            <Ionicons
              name={config.icon}
              size={20}
              color={config.color}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}