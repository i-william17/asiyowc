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

          {/* ================= UNREAD BADGE ================= */}
          {unreadCount > 0 && (
            <View
              style={{
                minWidth: 22,
                height: 22,
                paddingHorizontal: 6,
                borderRadius: 11,
                backgroundColor: "#2563EB", // blue (matches read ticks)
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins-SemiBold",
                  fontSize: 11,
                  color: "#FFFFFF",
                }}
              >
                {displayCount}
              </Text>
            </View>
          )}
        </View>

        {/* ================= LAST MESSAGE ================= */}
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
