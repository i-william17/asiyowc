import React, { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "../../utils/tw";

const COLORS = {
  gold: {
    bg: "#ffffff",
    text: "#b45309",
    border: "#fde68a",
    icon: "star",
  },
  silver: {
    bg: "#ffffff",
    text: "#4b5563",
    border: "#e5e7eb",
    icon: "star",
  },
  bronze: {
    bg: "#ffffff",
    text: "#b45309",
    border: "#fed7aa",
    icon: "star",
  },
  purple: {
    bg: "#ffffff",
    text: "#7c3aed",
    border: "#e9d5ff",
    icon: "star",
  },
  green: {
    bg: "#ffffff",
    text: "#059669",
    border: "#a7f3d0",
    icon: "checkmark",
  },
  free: {
    bg: "#ffffff",
    text: "#059669",
    border: "#a7f3d0",
    icon: "gift",
  },
  paid: {
    bg: "#ffffff",
    text: "#7c3aed",
    border: "#e9d5ff",
    icon: "card",
  },
  progress: {
    bg: "#ffffff",
    text: "#b45309",
    border: "#fde68a",
    icon: "time",
  },
  completed: {
    bg: "#ffffff",
    text: "#059669",
    border: "#a7f3d0",
    icon: "checkmark-circle",
  },
};

const SIZE_MAP = {
  sm: {
    paddingY: 4,
    paddingX: 8,
    fontSize: 11,
    iconSize: 12,
    letterSpacing: 0.2,
  },
  md: {
    paddingY: 6,
    paddingX: 12,
    fontSize: 12,
    iconSize: 14,
    letterSpacing: 0.2,
  },
  lg: {
    paddingY: 8,
    paddingX: 16,
    fontSize: 13,
    iconSize: 16,
    letterSpacing: 0.2,
  },
};

const AchievementBadge = ({
  label,
  type = "gold",
  onPress,
  style,
  iconOverride,
  size = "md",
  variant = "text",
  showIcon = true,
}) => {
  const [pressed, setPressed] = useState(false);

  const { bg, text, border, icon } = COLORS[type] ?? COLORS.gold;
  const s = SIZE_MAP[size] ?? SIZE_MAP.md;

  const isIconOnly = variant === "icon";

  const badgeContent = (
    <View
      style={[
        tw`flex-row items-center justify-center rounded-full`,
        {
          backgroundColor: bg,
          paddingVertical: s.paddingY,
          paddingHorizontal: isIconOnly ? s.paddingY : s.paddingX,
          borderWidth: 1,
          borderColor: border,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          ...Platform.select({
            ios: {
              shadowColor: "#000000",
              shadowOpacity: 0.02,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
            },
            android: {
              elevation: 0,
            },
            web: {
              shadowColor: "#000000",
              shadowOpacity: 0.02,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
              transition: "all 0.1s ease",
              cursor: onPress ? "pointer" : "default",
            },
          }),
        },
        style,
      ]}
    >
      {showIcon && (
        <Ionicons
          name={iconOverride ?? icon}
          size={s.iconSize}
          color={text}
          style={isIconOnly ? {} : { marginRight: 4 }}
        />
      )}

      {!isIconOnly && label && (
        <Text
          style={{
            fontFamily: "Poppins-Medium",
            fontSize: s.fontSize,
            letterSpacing: s.letterSpacing,
            color: text,
            includeFontPadding: false,
            lineHeight: s.fontSize * 1.4,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={{ borderRadius: 999 }}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        {badgeContent}
      </Pressable>
    );
  }

  return badgeContent;
};

export default AchievementBadge;