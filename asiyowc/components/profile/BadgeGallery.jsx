import React from "react";
import { View, Text, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "../../utils/tw";
import { BADGE_IMAGES } from "../../utils/badges";

/* =====================================================
   Professional Badge Gallery
   - Explicit fontFamily usage
   - No emojis
   - Icon-based UI
===================================================== */

export default function BadgeGallery({ badges = [] }) {
  /* ================= EMPTY STATE ================= */
  if (!Array.isArray(badges) || badges.length === 0) {
    return (
      <View
        style={tw`mx-4 my-5 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm`}
      >
        <View style={tw`items-center`}>
          <View
            style={tw`w-14 h-14 rounded-full bg-gray-50 border border-gray-200 items-center justify-center mb-3`}
          >
            <Ionicons name="ribbon-outline" size={26} color="#9CA3AF" />
          </View>

          <Text
            style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 16,
              color: "#1F2937",
              marginBottom: 4,
            }}
          >
            Badges
          </Text>

          <Text
            style={{
              fontFamily: "Poppins-Regular",
              fontSize: 13,
              color: "#6B7280",
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            Earned badges and verified achievements will appear here once
            programs are completed.
          </Text>
        </View>
      </View>
    );
  }

  /* ================= BADGE LIST ================= */
  return (
    <View style={tw`py-3`}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`px-4`}
      >
        {badges.map((badgeKey, i) => {
          const key = badgeKey.toLowerCase().trim();
          const img = BADGE_IMAGES[key];

          return (
            <View
              key={i}
              style={tw`
                mr-4
                w-32
                h-40
                bg-white
                rounded-2xl
                border border-gray-100
                shadow-sm
                px-3
                py-4
                items-center
                justify-between
              `}
            >
              {/* ===== Badge Visual ===== */}
              <View style={tw`mt-1`}>
                {img ? (
                  <Image
                    source={img}
                    resizeMode="contain"
                    style={tw`w-16 h-16`}
                  />
                ) : (
                  <View
                    style={tw`w-16 h-16 rounded-full bg-gray-50 border border-gray-200 items-center justify-center`}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={22}
                      color="#9CA3AF"
                    />
                  </View>
                )}
              </View>

              {/* ===== Badge Text ===== */}
              <View style={tw`items-center mt-3`}>
                <Text
                  numberOfLines={2}
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 13,
                    color: "#111827",
                    textAlign: "center",
                    lineHeight: 16,
                  }}
                >
                  {badgeKey}
                </Text>

                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 11,
                    color: "#9CA3AF",
                    marginTop: 4,
                    letterSpacing: 0.5,
                  }}
                >
                  {key}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
