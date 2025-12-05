import React from "react";
import { View } from "react-native";
import tw from "../../utils/tw";
import LottieView from "lottie-react-native";

const FeedShimmer = () => {
  return (
    <View
      style={[
        tw`flex-1 w-full items-center justify-center`,
        { paddingTop: 40 }
      ]}
    >
      {/* Lottie Loader */}
      <LottieView
        source={require("../../assets/animations/loading-spinner.json")}
        autoPlay
        loop
        style={{
          width: 250,
          height: 250,
        }}
      />

      {/* Subtle Placeholders */}
      <View style={[tw`w-full mt-4 px-6`]}>
        <View style={tw`bg-gray-100 rounded-xl h-32 w-full mb-4`} />
        <View style={tw`bg-gray-100 rounded-xl h-32 w-full mb-4`} />
      </View>
    </View>
  );
};

export default FeedShimmer;
