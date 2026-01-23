import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Globe } from "lucide-react-native";
import tw from "../../utils/tw";

export default function HubCard({ hub, onPress }) {
  if (!hub) return null;

  const {
    _id,
    name,
    description,
    region,
    type,
    membersCount = 0,
    isMember,
    avatar,
  } = hub;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(_id)}
      style={tw`bg-white rounded-2xl p-4 mb-4 shadow-sm`}
    >
      <View style={tw`flex-row items-center`}>
        <View
          style={tw`w-12 h-12 rounded-xl items-center justify-center mr-4 overflow-hidden bg-purple-100`}
        >
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={tw`w-full h-full`}
              resizeMode="cover"
            />
          ) : (
            <Globe size={20} color="#6A1B9A" />
          )}
        </View>

        <View style={tw`flex-1`}>
          <Text
            style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 16,
              color: "#111827",
            }}
            numberOfLines={1}
          >
            {name}
          </Text>

          {description ? (
            <Text
              style={{
                fontFamily: "Poppins-Regular",
                fontSize: 13,
                color: "#6B7280",
                marginTop: 2,
              }}
              numberOfLines={2}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={tw`flex-row justify-between items-center mt-3`}>
        <Text
          style={{
            fontFamily: "Poppins-Medium",
            fontSize: 13,
            color: "#6A1B9A",
          }}
        >
          {membersCount} members
        </Text>

        <Text
          style={{
            fontFamily: "Poppins-Medium",
            fontSize: 12,
            color: isMember ? "#16A34A" : "#6B7280",
          }}
        >
          {isMember ? "Joined" : type?.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
