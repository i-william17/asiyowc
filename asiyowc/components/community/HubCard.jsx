import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Globe } from "lucide-react-native";
import tw from "../../utils/tw";

export default function HubCard({
  id,
  name,
  region,
  members = 0,
  onPress,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(id)}
      style={tw`bg-white rounded-2xl p-4 mb-4 shadow-sm`}
    >
      <View style={tw`flex-row items-center`}>
        <View style={tw`w-12 h-12 bg-blue-100 rounded-xl items-center justify-center mr-4`}>
          <Globe size={20} color="#2563EB" />
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

          {!!region && (
            <Text
              style={{
                fontFamily: "Poppins-Regular",
                fontSize: 13,
                color: "#6B7280",
                marginTop: 2,
              }}
            >
              {region}
            </Text>
          )}
        </View>
      </View>

      <Text
        style={{
          fontFamily: "Poppins-Medium",
          fontSize: 13,
          color: "#2563EB",
          marginTop: 10,
        }}
      >
        {members} members
      </Text>
    </TouchableOpacity>
  );
}
