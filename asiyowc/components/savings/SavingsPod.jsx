import React, { useMemo } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import tw from "../../utils/tw";

/**
 * SavingsPod Component
 */

const SavingsPod = ({
  pod,
  style,
  onPress,
  onJoin,
  onContribute,
  currentUserId,
}) => {
  /* ============================================================
     NORMALIZE BACKEND DATA (SAFE)
  ============================================================ */

  const {
    id,
    image,
    membersCount,
    savedAmount,
    myContribution,
    goalAmount,
    targetDate,
    isMember,
  } = useMemo(() => {
    const id = pod._id || pod.id;

    const image =
      pod.image ||
      "https://res.cloudinary.com/ducckh8ip/image/upload/v1766603798/asiyo-app/a8vl3ff1muzlnnunkjy3.jpg";

    const membersCount =
      pod.membersCount ??
      pod.members?.length ??
      0;

    const savedAmount =
      pod.savedAmount ??
      pod.totalSaved ??
      pod.balance ??
      0;

    const myContribution =
      pod.myContribution ??
      pod.contributions
        ?.filter(
          (c) =>
            String(c.user) === String(currentUserId) ||
            String(c.member) === String(currentUserId)
        )
        ?.reduce((s, c) => s + (c.amount || 0), 0) ??
      0;

    const goalAmount =
      pod.goalAmount ??
      pod.targetAmount ??
      0;

    const targetDate =
      pod.targetDate ||
      pod.endsAt ||
      pod.deadline;

    const isMember =
      typeof pod.isMember === "boolean"
        ? pod.isMember
        : pod.members?.some(
          (m) =>
            String(m) === String(currentUserId) ||
            String(m?._id) === String(currentUserId)
        );

    return {
      id,
      image,
      membersCount,
      savedAmount,
      myContribution,
      goalAmount,
      targetDate,
      isMember,
    };
  }, [pod, currentUserId]);

  /* ============================================================
     DERIVED UI VALUES
  ============================================================ */

  const progress =
    goalAmount > 0
      ? Math.min(Math.round((savedAmount / goalAmount) * 100), 100)
      : 0;

  const daysLeft = targetDate
    ? Math.max(
      0,
      Math.ceil(
        (new Date(targetDate) - new Date()) /
        (1000 * 60 * 60 * 24)
      )
    )
    : "--";

  const size = 64;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressOffset =
    circumference - (progress / 100) * circumference;

  /* ============================================================
     UI
  ============================================================ */

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress?.(id)}
      style={[
        tw`bg-white rounded-3xl p-4`,
        {
          borderCurve: "continuous",
          shadowColor: "#1e1e2f",
          shadowOpacity: 0.04,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          borderWidth: 1.5,
          borderColor: "#FFD700",
          shadowColor: "#FFD700",
        },
        style,
      ]}
    >
      {/* HEADER */}
      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center flex-1`}>
          <Image
            source={{ uri: image }}
            style={[
              tw`w-14 h-14`,
              {
                borderRadius: 28,
                borderWidth: 2,
                borderColor: "#f8f4ff",
              },
            ]}
          />

          <View style={tw`ml-3 flex-1`}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: "Poppins-SemiBold",
                fontSize: 16,
                color: "#1e1e2f",
                marginBottom: 2,
              }}
            >
              {pod.name}
            </Text>

            <View style={tw`flex-row items-center`}>
              <Ionicons
                name="people-outline"
                size={14}
                color="#6b7280"
              />
              <Text
                style={{
                  fontFamily: "Poppins-Regular",
                  color: "#6b7280",
                  marginLeft: 4,
                  fontSize: 12,
                }}
              >
                {membersCount}{" "}
                {membersCount === 1 ? "person" : "people"}
              </Text>
            </View>
          </View>
        </View>

        {/* PROGRESS RING */}
        <View style={tw`relative items-center justify-center`}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#f0f0f5"
              strokeWidth={strokeWidth}
            />

            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#6A1B9A"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>

          <View style={tw`absolute items-center justify-center`}>
            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                fontSize: 13,
                color: "#1e1e2f",
              }}
            >
              {progress}%
            </Text>
          </View>
        </View>
      </View>

      {/* METRICS */}
      <View
        style={tw`flex-row justify-between mt-4 pt-3 border-t border-gray-100`}
      >
        <Metric
          label="Saved"
          value={`KES ${savedAmount.toLocaleString()}`}
          size="small"
        />

        <View style={tw`w-px h-8 bg-gray-100`} />

        <Metric
          label="Goal"
          value={`KES ${goalAmount.toLocaleString()}`}
          size="small"
        />

        <View style={tw`w-px h-8 bg-gray-100`} />

        <Metric
          label="My share"
          value={`KES ${myContribution.toLocaleString()}`}
          highlight={myContribution > 0}
          size="small"
        />

        <View style={tw`w-px h-8 bg-gray-100`} />

        <Metric
          label="Time left"
          value={daysLeft === "--" ? "—" : `${daysLeft}d`}
          size="small"
        />
      </View>

    </TouchableOpacity>
  );
};

/* ============================================================
   METRIC COMPONENT
============================================================ */

const Metric = ({ label, value, highlight, size = "normal" }) => {
  const textSize = size === "small" ? 14 : 16;
  const labelSize = size === "small" ? 11 : 12;

  return (
    <View style={tw`flex-1 items-center`}>
      <Text
        style={{
          fontFamily: highlight
            ? "Poppins-SemiBold"
            : "Poppins-Medium",
          fontSize: textSize,
          color: highlight ? "#6A1B9A" : "#1e1e2f",
        }}
      >
        {value}
      </Text>

      <Text
        style={{
          fontFamily: "Poppins-Regular",
          color: "#94a3b8",
          fontSize: labelSize,
          marginTop: 2,
          textTransform: "uppercase",
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </View>
  );
};

export default React.memo(SavingsPod);