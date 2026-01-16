import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Mic, Headphones } from "lucide-react-native";
import tw from "../../utils/tw";

export default function VoiceCard({
  id,
  title,
  hostName,
  listenersCount = 0,
  isLive = false,
  onPress,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(id)}
      style={[
        tw`rounded-2xl p-4 mb-4 shadow-sm`,
        isLive ? tw`bg-purple-50` : tw`bg-white`,
      ]}
    >
      {/* ================= HEADER ================= */}
      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center flex-1`}>
          <View
            style={[
              tw`w-10 h-10 rounded-xl items-center justify-center mr-4`,
              isLive ? tw`bg-purple-600` : tw`bg-gray-200`,
            ]}
          >
            <Mic size={18} color={isLive ? "#fff" : "#6B7280"} />
          </View>

          <View style={tw`flex-1`}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: "Poppins-SemiBold",
                fontSize: 16,
                color: "#111827",
              }}
            >
              {title}
            </Text>

            {!!hostName && (
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: "Poppins-Regular",
                  fontSize: 13,
                  color: "#6B7280",
                  marginTop: 2,
                }}
              >
                Hosted by {hostName}
              </Text>
            )}
          </View>
        </View>

        {isLive && (
          <View style={tw`bg-red-500 px-3 py-1 rounded-full ml-3`}>
            <Text
              style={{
                fontFamily: "Poppins-Bold",
                fontSize: 11,
                color: "white",
                letterSpacing: 0.6,
              }}
            >
              LIVE
            </Text>
          </View>
        )}
      </View>

      {/* ================= FOOTER ================= */}
      <View style={tw`flex-row items-center mt-3`}>
        <Headphones size={14} color="#7C3AED" />
        <Text
          style={{
            fontFamily: "Poppins-Medium",
            fontSize: 13,
            color: "#7C3AED",
            marginLeft: 6,
          }}
        >
          {listenersCount} listening
        </Text>
      </View>
    </TouchableOpacity>
  );
}
