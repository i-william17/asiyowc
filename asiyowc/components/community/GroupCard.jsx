import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Users, CheckCircle, ArrowRight, LogIn } from "lucide-react-native";
import tw from "../../utils/tw";

/**
 * GroupCard (Pure UI)
 *
 * Props:
 * - id
 * - name
 * - description
 * - membersCount
 * - avatar (string | { url } | { uri } | null)
 * - isJoined (boolean)
 * - onPress(id)                      // card press (parent decides routing)
 * - onJoinPress?(id)                 // optional: join action button
 * - onEnterChatPress?(id)            // optional: enter chat action button
 */
export default function GroupCard({
  id,
  name,
  description,
  membersCount = 0,
  unreadCount = 0,
  avatar,
  isJoined = false,
  onPress,
  onJoinPress,
  onEnterChatPress,
}) {
  const safeMembers = Number.isFinite(Number(membersCount))
    ? Number(membersCount)
    : 0;

  // ✅ support avatar being string OR object
  const avatarUri =
    typeof avatar === "string"
      ? avatar
      : avatar?.url || avatar?.uri || null;

  const rightActionLabel = isJoined ? "Enter chat" : "View group";
  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress?.(id)}
      style={tw`bg-white p-3 mb-3 rounded-2xl shadow-sm flex-row border ${isJoined ? "border-purple-200" : "border-gray-100"
        }`}
    >

      {/* IMAGE + UNREAD BADGE */}
      <View style={{ position: "relative" }}>
        <Image
          source={
            avatarUri
              ? { uri: avatarUri }
              : require("../../assets/images/image-placeholder.png")
          }
          style={[
            tw`w-16 h-16 rounded-full bg-gray-100 overflow-hidden border-2`,
            { borderColor: "#FFD700" },
          ]}
        />

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
              backgroundColor: "#7C3AED", // ✅ purple badge
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: "#FFFFFF", // clean edge
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

      {/* CONTENT */}
      <View style={tw`ml-3 flex-1`}>
        {/* TITLE + JOINED BADGE */}
        <View style={tw`flex-row items-start`}>
          <Text
            style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 14,
              color: "#111827",
              flex: 1,
              lineHeight: 18,
            }}
            numberOfLines={2}
          >
            {name || "Untitled group"}
          </Text>

          {isJoined ? (
            <View style={tw`ml-2 mt-1 flex-row items-center`}>
              <CheckCircle size={14} color="#7C3AED" />
            </View>
          ) : null}
        </View>

        {/* DESCRIPTION */}
        {!!description && (
          <Text
            style={{
              fontFamily: "Poppins-Regular",
              fontSize: 11.5,
              color: "#6B7280",
              marginTop: 4,
              lineHeight: 14,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {description}
          </Text>
        )}

        {/* FOOTER */}
        <View style={tw`flex-row items-center justify-between mt-2`}>
          <View style={tw`flex-row items-center`}>
            <Users size={15} color="#7C3AED" />
            <Text
              style={{
                fontFamily: "Poppins-Medium",
                fontSize: 13,
                marginLeft: 6,
                color: "#7C3AED",
              }}
            >
              {safeMembers} members
            </Text>
          </View>

          {/* CTA CHIP */}
          <View
            style={tw`flex-row items-center px-2.5 py-1 rounded-full ${isJoined ? "bg-purple-50" : "bg-gray-50"
              }`}
          >
            {isJoined ? (
              <ArrowRight size={14} color="#7C3AED" />
            ) : (
              <LogIn size={14} color="#6B7280" />
            )}
            <Text
              style={{
                fontFamily: "Poppins-Medium",
                fontSize: 11,
                marginLeft: 6,
                color: isJoined ? "#7C3AED" : "#6B7280",
              }}
            >
              {rightActionLabel}
            </Text>
          </View>
        </View>

        {/* OPTIONAL ACTION BUTTONS (still UI-only) */}
        {(onJoinPress || onEnterChatPress) && (
          <View style={tw`flex-row mt-3`}>
            {!isJoined && onJoinPress && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onJoinPress(id)}
                style={tw`px-4 py-2 rounded-xl border border-purple-200 bg-purple-50`}
              >
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    fontSize: 13,
                    color: "#7C3AED",
                  }}
                >
                  Join
                </Text>
              </TouchableOpacity>
            )}

            {isJoined && onEnterChatPress && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onEnterChatPress(id)}
                style={tw`px-4 py-2 rounded-xl bg-purple-600`}
              >
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    fontSize: 13,
                    color: "white",
                  }}
                >
                  Enter chat
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
