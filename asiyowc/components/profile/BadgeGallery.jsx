import React from "react";
import { View, Text, Image, ScrollView } from "react-native";
import tw from "../../utils/tw";
import { BADGE_IMAGES } from "../../utils/badges";

/* =====================================================
   Badge + type alignment
   Schema sticks to strings only
===================================================== */

export default function BadgeGallery({ badges = [] }) {

  /* =============== EMPTY STATE =============== */
  if (!Array.isArray(badges) || badges.length === 0) {
    return (
      <View style={tw`mx-3 my-4 bg-[#F9FAFB] rounded-2xl p-6 border border-gray-100`}>
        
        <View style={tw`items-center`}>
          <View style={tw`w-18 h-18 bg-white rounded-full items-center justify-center shadow-sm mb-3 border border-gray-100`}>
            <Text style={tw`text-gray-300 text-2xl font-['Poppins-SemiBold']`}>
              🏅
            </Text>
          </View>

          <Text style={tw`text-gray-500 text-base font-['Poppins-SemiBold'] mb-1`}>
            Badges Gallery
          </Text>

          <Text style={tw`text-gray-400 text-sm font-['Poppins-Regular'] text-center`}>
            Achievements and completed milestones will appear here once programs are finished and verified.
          </Text>
        </View>
      </View>
    );
  }

  /* =============== BADGES LIST =============== */
  return (
    <View style={tw`py-3`}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-3`}>
        
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
                p-4
                items-center
                shadow-md
              `}
            >
              {/* ===== Badge Image / Placeholder ===== */}
              {img ? (
                <View style={tw`flex-1 items-center justify-center w-full`}>
                  <Image
                    source={img}
                    resizeMode="contain"
                    style={tw`w-20 h-20`}
                  />
                </View>
              ) : (
                <View style={tw`flex-1 items-center justify-center w-full`}>
                  <View style={tw`w-20 h-20 bg-gray-50 rounded-full items-center justify-center border border-gray-100`}>
                    <Text style={tw`text-gray-300 text-xl font-['Poppins-Bold']`}>
                      •••
                    </Text>
                  </View>
                </View>
              )}

              {/* ===== Labels ===== */}
              <View style={tw`w-full items-center mt-2`}>
                
                <Text
                  numberOfLines={2}
                  style={tw`text-gray-900 text-sm font-['Poppins-SemiBold'] text-center leading-tight`}
                >
                  {badgeKey}
                </Text>

                <Text style={tw`text-gray-400 text-[11px] font-['Poppins-Regular'] mt-1 tracking-wide`}>
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
