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
 * - unreadCount      number (optional)
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
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress?.(id)}
      style={tw`flex-row items-center bg-white px-4 py-4 mb-3 rounded-2xl border border-gray-200`}
    >
      {/* ================= AVATAR ================= */}
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

      {/* ================= CONTENT ================= */}
      <View style={tw`flex-1 ml-4`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 15,
              color: "#111827",
              flex: 1,
            }}
          >
            {title}
          </Text>

          {/* UNREAD BADGE */}
          {unreadCount > 0 && (
            <View
              style={tw`ml-2 min-w-[20px] h-5 px-2 rounded-full bg-purple-600 items-center justify-center`}
            >
              <Text
                style={{
                  fontFamily: "Poppins-Medium",
                  fontSize: 11,
                  color: "#FFFFFF",
                }}
              >
                {unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* LAST MESSAGE */}
        <Text
          numberOfLines={1}
          style={{
            fontFamily: "Poppins-Regular",
            fontSize: 13,
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
