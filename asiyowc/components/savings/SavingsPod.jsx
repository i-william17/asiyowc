import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "../../utils/tw";

/**
 * SavingsPod Component
 * 
 * Props:
 * - pod: {
 *     id, name, description, goalAmount, savedAmount, myContribution,
 *     targetDate, membersCount, isMember, image
 *   }
 */

const SavingsPod = ({ pod, style, onPress }) => {
  const progress = Math.min(
    Math.round((pod.savedAmount / pod.goalAmount) * 100),
    100
  );

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        tw`bg-white rounded-3xl p-4 shadow-md`,
        {
          borderCurve: "continuous",
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        },
        style,
      ]}
    >
      {/* =============================== */}
      {/* HEADER */}
      {/* =============================== */}
      <View style={tw`flex-row items-start`}>
        <Image
          source={{ uri: pod.image }}
          style={tw`w-20 h-20 rounded-2xl`}
        />

        <View style={tw`flex-1 ml-4`}>
          <Text
            style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 18,
              color: "#111827",
            }}
            numberOfLines={2}
          >
            {pod.name}
          </Text>

          <View style={tw`flex-row items-center mt-1`}>
            <Ionicons name="people" size={18} color="#6A1B9A" />
            <Text
              style={{
                fontFamily: "Poppins-Medium",
                color: "#6A1B9A",
                marginLeft: 6,
              }}
            >
              {pod.membersCount} members
            </Text>
          </View>
        </View>
      </View>

      {/* =============================== */}
      {/* PROGRESS BAR */}
      {/* =============================== */}
      <View style={tw`mt-4`}>
        <View style={tw`h-3 bg-gray-200 rounded-full`}>
          <View
            style={{
              width: `${progress}%`,
              height: "100%",
              backgroundColor: "#6A1B9A",
              borderRadius: 20,
            }}
          />
        </View>

        <Text
          style={{
            fontFamily: "Poppins-Medium",
            marginTop: 6,
            color: "#6B7280",
            fontSize: 12,
          }}
        >
          {progress}% of KES {pod.goalAmount.toLocaleString()}
        </Text>
      </View>

      {/* =============================== */}
      {/* ANALYTICS MINI DASHBOARD */}
      {/* =============================== */}
      <View style={tw`flex-row justify-between mt-5`}>
        {/* Total Saved */}
        <View style={tw`flex-1 items-center`}>
          <Text
            style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 16,
              color: "#111827",
            }}
          >
            KES {pod.savedAmount.toLocaleString()}
          </Text>
          <Text style={tw`text-gray-500 text-xs mt-1`}>Total Saved</Text>
        </View>

        {/* My Contribution */}
        <View style={tw`flex-1 items-center`}>
          <Text
            style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 16,
              color: "#6A1B9A",
            }}
          >
            KES {pod.myContribution?.toLocaleString() || 0}
          </Text>
          <Text style={tw`text-gray-500 text-xs mt-1`}>My Contribution</Text>
        </View>

        {/* Days Left */}
        <View style={tw`flex-1 items-center`}>
          <Text
            style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 16,
              color: "#111827",
            }}
          >
            {Math.max(
              0,
              Math.ceil(
                (new Date(pod.targetDate) - new Date()) /
                  (1000 * 60 * 60 * 24)
              )
            )}
          </Text>
          <Text style={tw`text-gray-500 text-xs mt-1`}>Days Left</Text>
        </View>
      </View>

      {/* =============================== */}
      {/* ACTION BUTTONS */}
      {/* =============================== */}
      <View style={tw`flex-row justify-between mt-6`}>
        {/* VIEW POD */}
        <TouchableOpacity
          style={tw`flex-1 bg-purple-600 rounded-xl py-3 mr-2`}
          onPress={() => onPress?.()}
        >
          <Text
            style={{
              fontFamily: "Poppins-SemiBold",
              textAlign: "center",
              color: "white",
            }}
          >
            View Pod
          </Text>
        </TouchableOpacity>

        {/* CONTRIBUTE */}
        {pod.isMember && (
          <TouchableOpacity
            style={tw`flex-1 bg-green-600 rounded-xl py-3 ml-2`}
          >
            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                textAlign: "center",
                color: "white",
              }}
            >
              Contribute
            </Text>
          </TouchableOpacity>
        )}

        {/* JOIN POD */}
        {!pod.isMember && (
          <TouchableOpacity
            style={tw`flex-1 bg-gray-800 rounded-xl py-3 ml-2`}
          >
            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                textAlign: "center",
                color: "white",
              }}
            >
              Join Pod
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default SavingsPod;
