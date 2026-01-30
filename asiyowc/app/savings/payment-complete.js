import React, { useEffect, useState } from "react";
import { View, Text, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import tw from "../../utils/tw";

/* =====================================================
   PAYMENT COMPLETE (NO CONTEXT, NO POD ID)
===================================================== */

export default function PaymentCompleteScreen() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(3);

  /* =====================================================
     COUNTDOWN + REDIRECT
  ===================================================== */

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => s - 1);
    }, 1000);

    const timeout = setTimeout(() => {
      // Redirect to Savings tab root
      router.replace("/savings");
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  /* =====================================================
     UI
  ===================================================== */

  return (
    <SafeAreaView style={tw`flex-1 bg-white justify-center items-center px-6`}>
      {/* Success animation */}
      <LottieView
        source={require("../../assets/animations/payment_success.json")}
        autoPlay
        loop={false}
        style={{ width: 220, height: 220 }}
      />

      <Text style={[tw`mt-6 text-xl text-gray-900`, { fontFamily: "Poppins-Bold" }]}>
        Payment Successful
      </Text>

      <Text
        style={[
          tw`text-gray-500 mt-2 text-center`,
          { fontFamily: "Poppins-Regular" },
        ]}
      >
        Your contribution has been received successfully.
      </Text>

      <Text
        style={[
          tw`mt-6 text-purple-700`,
          { fontFamily: "Poppins-Medium" },
        ]}
      >
        Redirecting in {seconds}s…
      </Text>
    </SafeAreaView>
  );
}
