import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "../../utils/tw";

/**
 * ChatCard
 *
 * Pure UI component — NO business logic here.
 *
 * Props:
 * - id               string
 * - title            string (already resolved name)
 * - avatar           string | null
 * - lastMessage      string
 * - unreadCount      number
 * - onPress(id)
 */

export default function ChatCard({
  id,
  title = "Chat",
  avatar = null,
  lastMessage = "",
  unreadCount = 0,
  onPress,
}) {
  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress?.(id)}
      style={tw`flex-row items-center bg-white px-4 py-4 mb-3 rounded-2xl border border-gray-200`}
    >
      {/* ================= AVATAR + UNREAD BADGE ================= */}
      <View style={{ position: "relative" }}>
        <View
          style={tw`w-12 h-12 rounded-full bg-gray-200 overflow-hidden items-center justify-center`}
        >
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={tw`w-full h-full`}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person" size={22} color="#9CA3AF" />
          )}
        </View>

        {unreadCount > 0 && (
          <View
            style={{
              position: "absolute",
              right: -2,
              top: -2,
              minWidth: 20,
              height: 20,
              paddingHorizontal: unreadCount > 9 ? 5 : 0,
              borderRadius: 999,
              backgroundColor: "#6A1B9A", // same purple
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: "#FFFFFF",
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                fontSize: 10,
                color: "#FFFFFF",
              }}
            >
              {displayCount}
            </Text>
          </View>
        )}
      </View>

      {/* ================= CONTENT ================= */}
      <View style={tw`flex-1 ml-4`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 14,
              color: "#111827",
              flex: 1,
            }}
          >
            {title}
          </Text>

        </View>

        {/* ================= LAST MESSAGE ================= */}
        <Text
          numberOfLines={1}
          style={{
            fontFamily: "Poppins-Regular",
            fontSize: 11.5,
            color: "#6B7280",
            marginTop: 4,
          }}
        >
          {lastMessage || "Start a conversation"}
        </Text>
      </View>

      {/* ================= CHEVRON ================= */}
      <Ionicons
        name="chevron-forward"
        size={18}
        color="#9CA3AF"
        style={tw`ml-3`}
      />
    </TouchableOpacity>
  );
}
