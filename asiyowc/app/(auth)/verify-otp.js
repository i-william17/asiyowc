import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  SafeAreaView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { verifyOTP } from '../../store/slices/authSlice';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';

const VerifyOTPScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useLocalSearchParams();
  const { loading } = useSelector(state => state.auth);
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef([]);

  const verificationId = params.verificationId;
  const type = params.type || 'registration';

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
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

  const focusPrevious = (index, key) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    if (value) {
      focusNext(index, value);
    }
  };

  const handleVerification = async () => {
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter the complete verification code');
      return;
    }

    try {
      await dispatch(verifyOTP({
        verificationId,
        otp: otpString
      })).unwrap();
      
      if (type === '2fa') {
        router.replace('/(tabs)');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Verification Failed', error.message || 'Invalid verification code');
    }
  };

  const handleResend = () => {
    setTimer(60);
    setCanResend(false);
    setOtp(['', '', '', '', '', '']);
    // Implement resend logic here
    Alert.alert('Code Sent', 'A new verification code has been sent to your phone.');
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <LinearGradient
        colors={['#6A1B9A', '#8E24AA']}
        style={tw`h-40 rounded-b-3xl`}
      >
        <View style={tw`flex-1 justify-center items-center`}>
          <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-white mt-5`]}>Asiyo Women Connect App</Text>
          <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-white opacity-90 mt-5`]}>Verify Your Account</Text>
        </View>
      </LinearGradient>

      <View style={tw`flex-1 px-6 py-8`}>
        <View style={tw`items-center mb-8`}>
          <LottieLoader type="success" size={120} />
        </View>

        <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-center text-purple-900 mb-2`]}>
          Enter Verification Code
        </Text>
        <Text style={[{ fontFamily: 'Poppins-Light' }, tw`text-base text-center text-gray-600 mb-8`]}>
          We've sent a 6-digit code to your phone number
        </Text>

        <View style={tw`flex-row justify-between mb-8`}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => inputs.current[index] = ref}
              style={[
                tw`w-12 h-12 border-2 border-gray-300 rounded-xl text-center text-lg font-bold`,
                digit && tw`border-purple-500 bg-purple-50`,
                index === 0 && tw`ml-0`
              ]}
              value={digit}
              onChangeText={value => handleOtpChange(value, index)}
              onKeyPress={({ nativeEvent: { key } }) => focusPrevious(index, key)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <AnimatedButton
          title="Verify & Continue"
          onPress={handleVerification}
          variant="primary"
          size="lg"
          loading={loading}
          style={tw`mb-4`}
          fullWidth
        />

        <View style={tw`items-center`}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={[{ fontFamily: 'Poppins-SemiBold' }, tw`text-purple-500`]}>
                Resend Code
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-gray-500`]}>
              Resend code in {timer}s
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default VerifyOTPScreen;