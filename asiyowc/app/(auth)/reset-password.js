import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  SafeAreaView,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/auth';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';

const ResetPasswordScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ⭐ added success/error UI state
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    }
  });

  const password = watch('password');
  const token = params.token;

  const handlePasswordReset = async (data) => {
    if (!token) {
      setErrorMsg("Invalid reset link.");
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(token, data.password);

      setSuccessMsg("Password reset successfully! Redirecting…");
      setErrorMsg(null);

      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1500);

    } catch (error) {
      setSuccessMsg(null);
      setErrorMsg(error.response?.data?.message || 'Something went wrong');
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
          <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-white opacity-90 mt-5`]}>New Password</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={tw`flex-1 px-6 py-8`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`items-center mb-8`}>
          <LottieLoader type="success" size={120} />
        </View>

        <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-center text-purple-900 mb-2`]}>
          Create New Password
        </Text>
        <Text style={[{ fontFamily: 'Poppins-Light' }, tw`text-base text-center text-gray-600 mb-8`]}>
          Enter your new password below
        </Text>

        {/* ⭐ SUCCESS MESSAGE */}
        {successMsg && (
          <View style={tw`p-4 mb-4 rounded-xl bg-green-100`}>
            <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-green-700 text-center`]}>
              {successMsg}
            </Text>
          </View>
        )}

        {/* ⭐ ERROR MESSAGE */}
        {errorMsg && (
          <View style={tw`p-4 mb-4 rounded-xl bg-red-100`}>
            <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-red-700 text-center`]}>
              {errorMsg}
            </Text>
          </View>
        )}

        <View style={tw`space-y-4 mb-6`}>
          
          {/* PASSWORD FIELD */}
          <View>
            <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-sm text-gray-700 mb-2`]}>
              New Password
            </Text>

            <Controller
              control={control}
              rules={{
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters'
                }
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={tw`relative`}>
                  <TextInput
                    style={[
                      tw`border-2 border-gray-200 rounded-2xl px-4 py-4 text-base pr-12`,
                      errors.password && tw`border-red-500`
                    ]}
                    placeholder="Enter new password"
                    placeholderTextColor="#9CA3AF"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    secureTextEntry={!showPassword}
                    autoComplete="password-new"
                  />
                  <TouchableOpacity
                    style={tw`absolute right-4 top-4`}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#6B7280" 
                    />
                  </TouchableOpacity>
                </View>
              )}
              name="password"
            />
            {errors.password && (
              <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-red-500 text-sm mt-1`]}>
                {errors.password.message}
              </Text>
            )}
          </View>

          {/* CONFIRM PASSWORD FIELD */}
          <View>
            <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-sm text-gray-700 mb-2`]}>
              Confirm Password
            </Text>

            <Controller
              control={control}
              rules={{
                required: 'Please confirm your password',
                validate: value => value === password || 'Passwords do not match'
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={tw`relative`}>
                  <TextInput
                    style={[
                      tw`border-2 border-gray-200 rounded-2xl px-4 py-4 text-base pr-12`,
                      errors.confirmPassword && tw`border-red-500`
                    ]}
                    placeholder="Confirm new password"
                    placeholderTextColor="#9CA3AF"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="password-new"
                  />
                  <TouchableOpacity
                    style={tw`absolute right-4 top-4`}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#6B7280" 
                    />
                  </TouchableOpacity>
                </View>
              )}
              name="confirmPassword"
            />

            {errors.confirmPassword && (
              <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-red-500 text-sm mt-1`]}>
                {errors.confirmPassword.message}
              </Text>
            )}
          </View>

        </View>

        <AnimatedButton
          title="Reset Password"
          onPress={handleSubmit(handlePasswordReset)}
          variant="primary"
          size="lg"
          loading={loading}
          style={tw`mb-4`}
          fullWidth
        />

        <AnimatedButton
          title="Back to Login"
          onPress={() => router.replace('/(auth)/login')}
          variant="secondary"
          size="md"
          fullWidth
        />

      </ScrollView>
    </SafeAreaView>
  );
};

export default ResetPasswordScreen;
