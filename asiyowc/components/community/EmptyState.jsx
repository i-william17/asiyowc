import { View, Text } from "react-native";
import LottieView from "lottie-react-native";
import tw from "../../utils/tw";

/* =====================================================
   EMPTY STATE (CENTERED)
===================================================== */

const EMPTY_ANIMATION = require("../../assets/animations/empty.json");

export default function EmptyState({ title, subtitle }) {
  return (
    <View style={tw`flex-1 justify-center items-center px-6`}>
      <View style={tw`bg-white rounded-3xl px-8 py-10 items-center w-full max-w-md`}>
        {/* LOTTIE ANIMATION */}
        <LottieView
          source={EMPTY_ANIMATION}
          autoPlay
          loop
          style={{ height: 140, width: 140 }}
        />

        {/* TITLE */}
        <Text
          style={{
            fontFamily: "Poppins-Bold",
            fontSize: 18,
            color: "#111827",
            marginTop: 12,
            textAlign: "center",
          }}
        >
          {title}
        </Text>

        {/* SUBTITLE */}
        {!!subtitle && (
          <Text
            style={{
              fontFamily: "Poppins-Regular",
              fontSize: 14,
              marginTop: 8,
              color: "#6B7280",
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            {subtitle}
          </Text>
        )}

        {/* ACCENT DIVIDER */}
        <View
          style={tw`mt-6 h-1 w-12 rounded-full`}
          backgroundColor="#2563EB"
        />
      </View>
    </View>
  );
}
