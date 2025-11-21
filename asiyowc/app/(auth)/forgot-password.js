import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '../../services/api';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
    }
  });

  const handleResetRequest = async (data) => {
    setLoading(true);
    try {
      await authService.forgotPassword(data.email);
      Alert.alert(
        'Reset Link Sent',
        'Check your email for password reset instructions',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong');
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
          <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-white mt-5`]}>Asiyo Women Connect App</Text>
          <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-white opacity-90 mt-5`]}>Reset Password</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={tw`flex-1 px-6 py-8`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`items-center mb-8`}>
          <LottieLoader type="meditation" size={120} />
        </View>

        <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-center text-purple-900 mb-2`]}>
          Forgot Password?
        </Text>
        <Text style={[{ fontFamily: 'Poppins-Light' }, tw`text-base text-center text-gray-600 mb-8`]}>
          Enter your email address and we'll send you instructions to reset your password
        </Text>

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
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
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

        <AnimatedButton
          title="Send Reset Instructions"
          onPress={handleSubmit(handleResetRequest)}
          variant="primary"
          size="lg"
          loading={loading}
          style={tw`mb-4`}
          fullWidth
        />

        <AnimatedButton
          title="Back to Login"
          onPress={() => router.back()}
          variant="secondary"
          size="md"
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;