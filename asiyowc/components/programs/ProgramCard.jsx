import React from "react";
import { View, Text, Image, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import AchievementBadge from "../programs/AchievementBadge";
import tw from "../../utils/tw";

const ProgramCard = ({ program }) => {
  const router = useRouter();

  const duration =
    program?.duration?.value && program?.duration?.unit
      ? `${program.duration.value} ${program.duration.unit}`
      : "Duration Unavailable";

  const priceLabel =
    !program?.price?.amount || program?.price?.amount === 0
      ? "Free Program"
      : `KES ${program.price.amount}`;

  const isEnrolled = !!program?.participantData;
  const progress = program?.participantData?.progress ?? 0;
  const isCompleted = progress === 100;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/program/${program._id}`)}
      style={[
        tw`bg-white rounded-3xl overflow-hidden mb-6`,
        {
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: Platform.OS === "android" ? 4 : 0,
          borderCurve: "continuous",
        },
      ]}
    >
      {/* IMAGE */}
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

        {/* Gradient Overlay */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            height: 60,
            width: "100%",
            backgroundColor: "rgba(0,0,0,0.15)",
            opacity: 0.4,
          }}
        />
      </View>

      {/* CONTENT */}
      <View style={tw`p-5`}>
        {/* Program Title */}
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

        {/* PRICE BADGE */}
        <View style={[tw`mt-3`, { alignSelf: "flex-start" }]}>
          <AchievementBadge
            label={priceLabel}
            type={program?.price?.amount > 0 ? "paid" : "free"}
            size="sm"
            style={{ maxWidth: 140 }} // adjust this value
          />
        </View>


        {/* STATUS BADGES */}
        <View style={tw`flex-row mt-3 flex-wrap`}>
          {isCompleted && (
            <AchievementBadge
              label="Completed"
              type="completed"
              size="sm"
              style={{ marginRight: 8, marginBottom: 6 }}
            />
          )}

          {!isCompleted && isEnrolled && (
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


        {/* PROGRESS BAR */}
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
