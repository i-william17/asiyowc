import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import AchievementBadge from "../programs/AchievementBadge";
import tw from "../../utils/tw";
import { LinearGradient } from "expo-linear-gradient";

const ProgramCard = ({ program }) => {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  /* -------------------------------
      SAFE VALUES
  ------------------------------- */
  const duration =
    program?.duration?.value && program?.duration?.unit
      ? `${program.duration.value} ${program.duration.unit}`
      : "Duration Unavailable";

  const priceLabel =
    !program?.price?.amount || program?.price?.amount === 0
      ? "Free Program"
      : `KES ${program.price.amount}`;

  const participant = program?.participantData || null;
  const isEnrolled = !!participant;
  const progress = participant?.progress ?? 0;
  const isCompleted = progress === 100;

  const completedDate = participant?.completedAt
    ? new Date(participant.completedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    : null;

  const handleMouseEnter = () => Platform.OS === "web" && setIsHovered(true);
  const handleMouseLeave = () => Platform.OS === "web" && setIsHovered(false);

  const cardShadowStyle = Platform.select({
    web: {
      shadowColor: "#0f172a",
      shadowOpacity: isHovered ? 0.12 : 0.06,
      shadowRadius: isHovered ? 16 : 8,
      shadowOffset: { width: 0, height: isHovered ? 8 : 4 },
      transform: [{ translateY: isHovered ? -2 : 0 }],
      transition: "all 0.2s ease",
    },
    default: {
      shadowColor: "#0f172a",
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/program/${program._id}`)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={[
        tw`bg-white rounded-2xl overflow-hidden`,
        {
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: "#f1f5f9",
          marginBottom: 16, // Consistent spacing for lists
          // Grid-friendly: margin is on card, not relying on parent
        },
        cardShadowStyle,
      ]}
    >
      {/* -------------------------------- 
          PROGRAM IMAGE 
      -------------------------------- */}
      <View style={{ position: "relative" }}>
        <Image
          source={{ uri: program.image }}
          style={{
            width: "100%",
            height: 190,
            backgroundColor: "#f8fafc",
          }}
          resizeMode="cover"
        />

        {/* Refined bottom overlay */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            "rgba(15, 23, 42, 0.00)", // clear at the top
            "rgba(15, 23, 42, 0.10)",
            "rgba(15, 23, 42, 0.22)",
            "rgba(15, 23, 42, 0.40)", // darkest at the bottom
          ]}
          locations={[0, 0.45, 0.72, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 120, // smoother gradient; tweak 100–140
          }}
        />

        {/* Price badge positioned on image */}
        <View style={{ position: "absolute", top: 16, right: 16 }}>
          <AchievementBadge
            // label={priceLabel}
            type={program?.price?.amount > 0 ? "paid" : "free"}
            size="sm"
          />
        </View>
      </View>

      {/* -------------------------------- 
          CONTENT
      -------------------------------- */}
      <View style={tw`p-5`}>
        {/* Title */}
        <Text
          style={{
            fontFamily: "Poppins-SemiBold",
            fontSize: 18,
            lineHeight: 26,
            color: "#0f172a",
          }}
          numberOfLines={2}
        >
          {program.title}
        </Text>

        {/* Category + Duration */}
        <Text
          style={{
            fontFamily: "Poppins-Regular",
            fontSize: 14,
            lineHeight: 20,
            color: "#475569",
            marginTop: 4,
          }}
        >
          {program.category} • {duration}
        </Text>

        {/* Status Badges - compact row */}
        <View style={tw`flex-row mt-4 flex-wrap`}>
          {isCompleted && (
            <AchievementBadge
              label="Completed"
              type="completed"
              size="sm"
              style={{ marginRight: 8, marginBottom: 4 }}
            />
          )}

          {isEnrolled && !isCompleted && (
            <AchievementBadge
              label="Enrolled"
              type="purple"
              size="sm"
              style={{ marginRight: 8, marginBottom: 4 }}
            />
          )}

          {program.featured && !isCompleted && !isEnrolled && (
            <AchievementBadge
              label="Featured"
              type="gold"
              size="sm"
              style={{ marginRight: 8, marginBottom: 4 }}
            />
          )}
        </View>

        {/* -------------------------------- 
            COMPLETED SECTION
        -------------------------------- */}
        {isCompleted && (
          <View style={tw`mt-5 pt-4 border-t border-slate-100`}>
            <View style={tw`flex-row items-center`}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 20,
                  backgroundColor: "#10b981",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 12,
                    includeFontPadding: false,
                  }}
                >
                  ✓
                </Text>
              </View>

              <View style={tw`ml-2`}>
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    fontSize: 13,
                    color: "#0f172a",
                  }}
                >
                  100% completed
                </Text>
                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 12,
                    color: "#64748b",
                    marginTop: 2,
                  }}
                >
                  {completedDate}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* -------------------------------- 
            PROGRESS (Enrolled but not completed)
        -------------------------------- */}
        {isEnrolled && !isCompleted && (
          <View style={tw`mt-5 pt-3`}>
            <View
              style={{
                height: 6,
                backgroundColor: "#e2e8f0",
                borderRadius: 50,
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  backgroundColor: "#7c3aed",
                  borderRadius: 50,
                }}
              />
            </View>

            <View style={tw`flex-row justify-between mt-2`}>
              <Text
                style={{
                  fontFamily: "Poppins-Medium",
                  color: "#475569",
                  fontSize: 12,
                }}
              >
                Progress
              </Text>
              <Text
                style={{
                  fontFamily: "Poppins-SemiBold",
                  color: "#7c3aed",
                  fontSize: 12,
                }}
              >
                {Math.round(progress)}%
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default ProgramCard;