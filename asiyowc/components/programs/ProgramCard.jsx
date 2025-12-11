import React from "react";
import { View, Text, Image, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import AchievementBadge from "../programs/AchievementBadge";
import tw from "../../utils/tw";

const ProgramCard = ({ program }) => {
  const router = useRouter();

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
    ? new Date(participant.completedAt).toLocaleDateString()
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/program/${program._id}`)}
      style={[
        tw`bg-white rounded-3xl overflow-hidden mb-6`,
        {
          shadowColor: "#000",
          shadowOpacity: 0.13,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: Platform.OS === "android" ? 4 : 1,
          borderCurve: "continuous",
        },
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
            backgroundColor: "#f3f4f6",
          }}
          resizeMode="cover"
        />

        {/* Soft Bottom Overlay */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            height: 70,
            width: "100%",
            backgroundColor: "rgba(0,0,0,0.15)",
            opacity: 0.35,
          }}
        />
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
            color: "#111827",
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
            color: "#6B7280",
            marginTop: 4,
          }}
        >
          {program.category} • {duration}
        </Text>

        {/* Price Badge */}
        <View style={[tw`mt-3`, { alignSelf: "flex-start" }]}>
          <AchievementBadge
            label={priceLabel}
            type={program?.price?.amount > 0 ? "paid" : "free"}
            size="sm"
          />
        </View>

        {/* -------------------------------- 
            STATUS BADGES
        -------------------------------- */}
        <View style={tw`flex-row mt-3 flex-wrap`}>
          {isCompleted && (
            <AchievementBadge
              label="Completed"
              type="completed"
              size="sm"
              style={{ marginRight: 8, marginBottom: 6 }}
            />
          )}

          {isEnrolled && !isCompleted && (
            <AchievementBadge
              label="Enrolled"
              type="purple"
              size="sm"
              style={{ marginRight: 8, marginBottom: 6 }}
            />
          )}

          {program.featured && (
            <AchievementBadge
              label="Featured"
              type="gold"
              size="sm"
              style={{ marginRight: 8, marginBottom: 6 }}
            />
          )}
        </View>

        {/* -------------------------------- 
            COMPLETED SECTION (New)
        -------------------------------- */}
        {isCompleted && (
          <View style={tw`mt-4`}>
            <Text
              style={{
                fontFamily: "Poppins-Medium",
                fontSize: 13,
                color: "#10B981",
              }}
            >
              Completed on: {completedDate}
            </Text>

            <View style={tw`flex-row items-center mt-2`}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 20,
                  backgroundColor: "#10B981",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 11,
                    top: -1,
                  }}
                >
                  ✓
                </Text>
              </View>

              <Text
                style={{
                  marginLeft: 8,
                  fontFamily: "Poppins-Medium",
                  color: "#10B981",
                }}
              >
                100% completed
              </Text>
            </View>
          </View>
        )}

        {/* -------------------------------- 
            PROGRESS (Enrolled but not completed)
        -------------------------------- */}
        {isEnrolled && !isCompleted && (
          <View style={tw`mt-5`}>
            <View
              style={{
                height: 7,
                backgroundColor: "#E5E7EB",
                borderRadius: 50,
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  backgroundColor: "#7C3AED",
                  borderRadius: 50,
                }}
              />
            </View>

            <Text
              style={{
                marginTop: 6,
                fontFamily: "Poppins-Medium",
                color: "#6B7280",
                fontSize: 12,
              }}
            >
              {Math.round(progress)}% completed
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default ProgramCard;
