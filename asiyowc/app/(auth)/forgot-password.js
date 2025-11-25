import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  SafeAreaView,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';
import { authService } from '../../services/auth';

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const fadeAnim = useState(new Animated.Value(0))[0];

  const showMessage = (type, message) => {
    if (type === 'success') {
      setSuccessMessage(message);
      setErrorMessage('');
    } else {
      setErrorMessage(message);
      setSuccessMessage('');
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setSuccessMessage('');
        setErrorMessage('');
      });
    }, 3500);
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { email: '' }
  });

  const handleResetRequest = async ({ email }) => {
    setLoading(true);

    try {
      console.log("📤 FORGOT PASSWORD REQUEST:", email);

      const res = await authService.forgotPassword(email);
      console.log("📥 RESPONSE:", res);

      showMessage('success', 'OTP sent to your email!');

      setTimeout(() => {
        router.push('/(auth)/verify-reset', { email });
      }, 1200);

    } catch (error) {
      console.log("❌ FORGOT PASSWORD ERROR:", error.response?.data || error.message);

      const msg = error?.response?.data?.message || 'Something went wrong. Try again.';
      showMessage('error', msg);
    } finally {
      setLoading(false);
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
            Asiyo Women Connect App
          </Text>
          <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-white opacity-90 mt-5`]}>
            Reset Password
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={tw`flex-1 px-6 py-8`}
        showsVerticalScrollIndicator={false}
      >
        {/* Center Animation */}
        <View style={tw`items-center mb-8`}>
          <LottieLoader type="meditation" size={120} />
        </View>

        {/* Title */}
        <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-center text-purple-900 mb-2`]}>
          Forgot Password?
        </Text>
        <Text style={[{ fontFamily: 'Poppins-Light' }, tw`text-base text-center text-gray-600 mb-8`]}>
          Enter your email and we’ll send you a reset code.
        </Text>

        {/* SUCCESS / ERROR BANNER */}
        {successMessage !== '' && (
          <Animated.View
            style={[
              tw`bg-green-100 border border-green-400 p-4 rounded-xl mb-6`,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-green-700 text-center`]}>
              ✅ {successMessage}
            </Text>
          </Animated.View>
        )}

        {errorMessage !== '' && (
          <Animated.View
            style={[
              tw`bg-red-100 border border-red-400 p-4 rounded-xl mb-6`,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-red-700 text-center`]}>
              ❌ {errorMessage}
            </Text>
          </Animated.View>
        )}

        {/* Email Input */}
        <View style={tw`mb-6`}>
          <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-sm text-gray-700 mb-2`]}>
            Email Address
          </Text>

          <Controller
            control={control}
            rules={{
              required: 'Email is required',
              pattern: {
                value: /^\S+@\S+$/i,
                message: 'Invalid email address'
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[
                  tw`border-2 border-gray-200 rounded-2xl px-4 py-4 text-base`,
                  errors.email && tw`border-red-500`
                ]}
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            )}
            name="email"
          />

          {errors.email && (
            <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-red-500 text-sm mt-1`]}>
              {errors.email.message}
            </Text>
          )}
        </View>

        {/* Buttons */}
        <AnimatedButton
          title="Send Reset Code"
          onPress={handleSubmit(handleResetRequest)}
          variant="primary"
          size="lg"
          loading={loading}
          fullWidth
          style={tw`mb-4`}
        />

        <AnimatedButton
          title="Back to Login"
          variant="secondary"
          size="md"
          onPress={() => router.back()}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;
