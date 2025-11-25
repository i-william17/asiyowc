import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';
import { server } from '../../server';

const VerifyResetCodeScreen = () => {
  const router = useRouter();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);

  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputs = useRef([]);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const focusNext = (index, value) => {
    if (value && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value) focusNext(index, value);
  };

  const handleVerification = async () => {
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setErrorMsg("Please enter the 6-digit reset code.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await axios.post(`${server}/auth/verify-reset`, {
        token: otpString
      });

      setSuccessMsg("Code verified! Continue to reset your password…");

      // Wait a moment then go to reset password page
      setTimeout(() => {
        router.replace({
          pathname: '/(auth)/reset-password',
          params: { token: otpString }
        });
      }, 1200);

    } catch (err) {
      console.log("❌ RESET VERIFY ERROR:", err?.response?.data || err);

      setErrorMsg(
        err?.response?.data?.message ||
        "Invalid or expired reset code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);

      await axios.post(`${server}/auth/forgot-password`, {
        email: "yourEmailHere@todo.com"  // You will fill this from previous screen
      });

      Alert.alert("Code Sent", "A new reset code has been sent to your email.");
    } catch (err) {
      Alert.alert("Error", "Could not resend reset code.");
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <LinearGradient
        colors={['#6A1B9A', '#8E24AA']}
        style={tw`h-40 rounded-b-3xl`}
      >
        <View style={tw`flex-1 justify-center items-center`}>
          <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-white mt-5`]}>
            Verify Reset Code
          </Text>
          <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-white opacity-90 mt-5`]}>
            Enter the 6-digit reset code
          </Text>
        </View>
      </LinearGradient>

      <View style={tw`flex-1 px-6 py-8`}>
        <View style={tw`items-center mb-8`}>
          <LottieLoader type="otp" size={120} />
        </View>

        <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-center text-purple-900 mb-2`]}>
          Enter Reset Code
        </Text>
        <Text style={[{ fontFamily: 'Poppins-Light' }, tw`text-center text-gray-600 mb-8`]}>
          We sent a password reset code to your email.
        </Text>

        {/* OTP Inputs */}
        <View style={tw`flex-row justify-between mb-8`}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => (inputs.current[index] = ref)}
              style={[
                tw`w-12 h-12 border-2 rounded-xl text-center text-lg font-bold`,
                digit ? tw`border-purple-500 bg-purple-50` : tw`border-gray-300`
              ]}
              value={digit}
              onChangeText={(v) => handleOtpChange(v, index)}
              keyboardType="number-pad"
              maxLength={1}
            />
          ))}
        </View>

        {/* SUCCESS MESSAGE */}
        {successMsg && (
          <View style={tw`p-4 mb-3 bg-green-100 rounded-xl`}>
            <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-green-700 text-center`]}>
              {successMsg}
            </Text>
          </View>
        )}

        {/* ERROR MESSAGE */}
        {errorMsg && (
          <View style={tw`p-4 mb-3 bg-red-100 rounded-xl`}>
            <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-red-700 text-center`]}>
              {errorMsg}
            </Text>
          </View>
        )}

        <AnimatedButton
          title="Verify Code"
          onPress={handleVerification}
          variant="primary"
          size="lg"
          loading={loading}
          fullWidth
        />

        <View style={tw`items-center mt-6`}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={[{ fontFamily: 'Poppins-SemiBold' }, tw`text-purple-500`]}>Resend Code</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-gray-500`]}>Resend in {timer}s</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default VerifyResetCodeScreen;
