import React from "react";
import { View, Platform, Dimensions } from "react-native";
import tw from "../../utils/tw";
import LottieView from "lottie-react-native";

const { width } = Dimensions.get("window");

const FeedShimmer = () => {
  const isWeb = Platform.OS === "web";

  // Medium sizing for web
  const lottieSize = isWeb ? 260 : 220;
  const cardHeight = isWeb ? 150 : 130;
  const containerWidth = isWeb ? Math.min(width, 560) : "100%";

  return (
    <View
      style={[
        tw`flex-1 items-center justify-center`,
        { paddingTop: isWeb ? 60 : 40 }
      ]}
    >
      {/* Loader */}
      <LottieView
        source={require("../../assets/animations/loading-spinner.json")}
        autoPlay
        loop
        style={{
          width: lottieSize,
          height: lottieSize,
        }}
      />

      {/* Skeleton Cards */}
      <View
        style={[
          tw`mt-5 px-4`,
          { width: containerWidth }
        ]}
      >
        <View
          style={[
            tw`bg-gray-100 rounded-xl w-full mb-4`,
            { height: cardHeight }
          ]}
        />
        <View
          style={[
            tw`bg-gray-100 rounded-xl w-full mb-4`,
            { height: cardHeight }
          ]}
        />
      </View>
    </View>
  );
};

export default FeedShimmer;
