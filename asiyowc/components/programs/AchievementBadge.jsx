import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "../../utils/tw";

// 🎖 Corporate Color Palette (more premium)
const COLORS = {
  gold: {
    bg: ["#FFF7D1", "#FDE68A"],
    text: "#92400E",
    icon: "trophy",
  },
  silver: {
    bg: ["#F3F4F6", "#E5E7EB"],
    text: "#374151",
    icon: "medal-outline",
  },
  bronze: {
    bg: ["#FFE4D6", "#FDBA74"],
    text: "#7C2D12",
    icon: "flame",
  },
  purple: {
    bg: ["#F3E8FF", "#E9D5FF"],
    text: "#6D28D9",
    icon: "star",
  },
  green: {
    bg: ["#D1FADF", "#A7F3D0"],
    text: "#065F46",
    icon: "checkmark-circle",
  },

  free: {
    bg: ["#DCFCE7", "#BBF7D0"],
    text: "#15803D",
    icon: "leaf",
  },
  paid: {
    bg: ["#E0E7FF", "#C7D2FE"],
    text: "#4338CA",
    icon: "card",
  },
  progress: {
    bg: ["#FEF3C7", "#FDE68A"],
    text: "#B45309",
    icon: "time-outline",
  },
  completed: {
    bg: ["#D1FAE5", "#A7F3D0"],
    text: "#047857",
    icon: "ribbon",
  },
};

const AchievementBadge = ({
  label,
  type = "gold",
  onPress,
  style,
  iconOverride,
  size = "md",
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  // 🟣 Premium smooth fade + scale animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 12,
        stiffness: 140,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const { bg, text, icon } = COLORS[type] ?? COLORS["gold"];

  // 🟦 Dynamic Sizing (more spacing)
  const sizeMap = {
    sm: { paddingV: 3, paddingH: 10, font: 11, icon: 14 },
    md: { paddingV: 5, paddingH: 14, font: 13, icon: 18 },
    lg: { paddingV: 7, paddingH: 18, font: 15, icon: 20 },
  };

  const s = sizeMap[size] ?? sizeMap.md;

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={{ borderRadius: 999 }}
      android_ripple={{ color: "#E5E7EB" }}
    >
      <Animated.View
        style={[
          tw`flex-row items-center rounded-full`,
          {
            paddingVertical: s.paddingV,
            paddingHorizontal: s.paddingH,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],

            // Horizontal badge spacing
            marginRight: 10,

            // Premium Look
            backgroundColor: bg[1],
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 5,
            borderWidth: 0.6,
            borderColor: bg[0],
          },
          style,
        ]}
      >

        <Ionicons
          name={iconOverride ?? icon}
          size={s.icon}
          color={text}
          style={{ marginRight: 6 }}
        />

        <Text
          style={{
            fontFamily: "Poppins-SemiBold",
            fontSize: s.font,
            color: text,
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Wrapper>
  );
};

export default AchievementBadge;
