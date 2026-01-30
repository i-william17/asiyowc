import React, { useMemo } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "../../utils/tw";

/**
 * SavingsPod Component
 *
 * Props:
 * - pod: backend pod object (raw)
 * - style: animated style
 * - onPress: view pod
 * - onJoin: join pod
 * - onContribute: contribute to pod
 * - currentUserId: logged in user id (optional, for contribution calc)
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

    const image = "https://res.cloudinary.com/ducckh8ip/image/upload/v1766603798/asiyo-app/a8vl3ff1muzlnnunkjy3.jpg";

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
            c.user === currentUserId ||
            c.member === currentUserId
        )
        ?.reduce((s, c) => s + c.amount, 0) ??
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
            m === currentUserId ||
            m?._id === currentUserId
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
      ? Math.min(
        Math.round((savedAmount / goalAmount) * 100),
        100
      )
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

  /* ============================================================
     UI
  ============================================================ */

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
      {/* ================= HEADER ================= */}
      <View style={tw`flex-row items-start`}>
        <Image
          source={{ uri: image }}
          style={tw`w-20 h-20 rounded-2xl`}
        />

        <View style={tw`flex-1 ml-4`}>
          <Text
            numberOfLines={2}
            style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 18,
              color: "#111827",
            }}
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
                fontSize: 13,
              }}
            >
              {membersCount} members
            </Text>
          </View>
        </View>
      </View>

      {/* ================= PROGRESS ================= */}
      <View style={tw`mt-4`}>
        <View style={tw`h-3 bg-gray-200 rounded-full overflow-hidden`}>
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
          {progress}% of KES {goalAmount.toLocaleString()}
        </Text>
      </View>

      {/* ================= METRICS ================= */}
      <View style={tw`flex-row justify-between mt-5`}>
        <Metric
          label="Total Saved"
          value={`KES ${savedAmount.toLocaleString()}`}
          strong
        />
        <Metric
          label="My Contribution"
          value={`KES ${myContribution.toLocaleString()}`}
          color="#6A1B9A"
          strong
        />
        <Metric label="Days Left" value={daysLeft} />
      </View>

      {/* ================= ACTIONS ================= */}
      <View style={tw`flex-row justify-between mt-6`}>
        {/* VIEW */}
        <TouchableOpacity
          style={tw`flex-1 bg-purple-600 rounded-xl py-3 mr-2`}
          onPress={onPress}
        >
          <Text
            style={{
              fontFamily: "Poppins-SemiBold",
              textAlign: "center",
              color: "#FFFFFF",
              fontSize: 14,
            }}
          >
            View Pod
          </Text>
        </TouchableOpacity>

        {/* JOIN */}
        {/* ================= ACTIONS ================= */}
        <View style={tw`flex-row justify-between mt-6`}>
          {/* MEMBER ACTIONS */}
          {isMember && (
            <>
              <TouchableOpacity
                style={tw`flex-1 bg-purple-600 rounded-xl py-3 mr-2`}
                onPress={onPress}
              >
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    textAlign: "center",
                    color: "#FFFFFF",
                    fontSize: 14,
                  }}
                >
                  View Pod
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`flex-1 bg-green-600 rounded-xl py-3 ml-2`}
                onPress={() => onContribute?.(id)}
              >
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    textAlign: "center",
                    color: "#FFFFFF",
                    fontSize: 14,
                  }}
                >
                  Contribute
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* NON-MEMBER ACTION */}
          {/* {!isMember && (
            <TouchableOpacity
              style={tw`flex-1 bg-gray-800 rounded-xl py-3`}
              onPress={() => onJoin?.(id)}
            >
              <Text
                style={{
                  fontFamily: "Poppins-SemiBold",
                  textAlign: "center",
                  color: "#FFFFFF",
                  fontSize: 14,
                }}
              >
                Join Pod
              </Text>
            </TouchableOpacity>
          )} */}
        </View>

      </View>
    </TouchableOpacity>
  );
};

/* ============================================================
   SMALL METRIC COMPONENT
============================================================ */

const Metric = ({ label, value, strong, color }) => (
  <View style={tw`flex-1 items-center`}>
    <Text
      style={{
        fontFamily: strong ? "Poppins-SemiBold" : "Poppins-Regular",
        fontSize: 16,
        color: color || "#111827",
      }}
    >
      {value}
    </Text>
    <Text
      style={{
        fontFamily: "Poppins-Regular",
        color: "#6B7280",
        fontSize: 12,
        marginTop: 4,
      }}
    >
      {label}
    </Text>
  </View>
);

export default React.memo(SavingsPod);
