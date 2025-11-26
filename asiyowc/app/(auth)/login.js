import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setToken, fetchAuthenticatedUser } from '../../store/slices/authSlice';
import { secureStore } from '../../services/storage';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';
import { server } from '../../server';

const LoginScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [responseMessage, setResponseMessage] = useState(null);
  const [responseType, setResponseType] = useState(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    }
  });

  const handleLogin = async (data) => {
    try {
      setLoading(true);
      setResponseMessage(null);
      setResponseType(null);

      console.log("📤 LOGIN PAYLOAD:", data);

      const res = await axios.post(
        `${server}/auth/login`,
        data,
        { headers: { "Content-Type": "application/json" }, timeout: 15000 }
      );

      console.log("✅ LOGIN RESPONSE:", res.data);

      if (res.data.requires2FA) {
        setResponseType("success");
        setResponseMessage("Verification required — redirecting…");

        setTimeout(() => {
          router.push({
            pathname: "/(tabs)",
            params: {
              verificationId: res.data.verificationId,
              type: "2fa"
            }
          });
        }, 1000);
        return;
      }

      // Save token securely
      await secureStore.setItem("token", res.data.data.token);

      // Update Redux instantly
      dispatch(setToken(res.data.data.token));

      // 🔥 Fetch full authenticated user profile
      await dispatch(fetchAuthenticatedUser());

      setResponseType("success");
      setResponseMessage("Login successful! Redirecting…");

      setTimeout(() => {
        router.replace("/(tabs)");
      }, 1000);

    } catch (err) {
      console.log("❌ LOGIN ERROR:", err.response?.data || err.message);

      setResponseType("error");
      setResponseMessage(
        err?.response?.data?.message ||
        err.message ||
        "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <LinearGradient
          colors={["#6A1B9A", "#8E24AA"]}
          style={tw`h-40 rounded-b-3xl`}
        >
          <View style={tw`flex-1 justify-center items-center`}>
            <Text style={[{ fontFamily: "Poppins-Bold" }, tw`text-2xl text-white mt-5`]}>
              Asiyo Women Connect App
            </Text>
            <Text style={[{ fontFamily: "Poppins-Regular" }, tw`text-white opacity-90 mt-5`]}>
              Get Back on Track
            </Text>
          </View>
        </LinearGradient>

        <ScrollView
          style={tw`flex-1 px-6 py-8`}
          showsVerticalScrollIndicator={false}
        >
          <View style={tw`items-center mb-8`}>
            <LottieLoader type="welcome" size={120} />
          </View>

          <Text style={[{ fontFamily: "Poppins-Bold" }, tw`text-2xl text-purple-900 mb-2`]}>
            Sign In
          </Text>
          <Text style={[{ fontFamily: "Poppins-Light" }, tw`text-gray-600 mb-8`]}>
            Continue your empowerment journey
          </Text>

          <View style={tw`space-y-4`}>
            {/* EMAIL INPUT */}
            <View>
              <Text style={[{ fontFamily: "Poppins-Medium" }, tw`text-sm text-gray-700 mb-2`]}>
                Email Address
              </Text>

              <Controller
                control={control}
                rules={{
                  required: "Email is required",
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: "Invalid email address"
                  }
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      tw`border-2 border-gray-200 rounded-2xl px-4 py-4`,
                      errors.email && tw`border-red-500`
                    ]}
                    placeholder="Enter your email"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
                name="email"
              />

              {errors.email && (
                <Text style={[{ fontFamily: "Poppins-Regular" }, tw`text-red-500 text-sm mt-1`]}>
                  {errors.email.message}
                </Text>
              )}
            </View>

            {/* PASSWORD INPUT */}
            <View>
              <Text style={[{ fontFamily: "Poppins-Medium" }, tw`text-sm text-gray-700 mb-2`]}>
                Password
              </Text>

              <Controller
                control={control}
                rules={{ required: "Password is required" }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={tw`relative`}>
                    <TextInput
                      style={[
                        tw`border-2 border-gray-200 rounded-2xl px-4 py-4 pr-12`,
                        errors.password && tw`border-red-500`
                      ]}
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showPassword}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
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
                <Text style={[{ fontFamily: "Poppins-Regular" }, tw`text-red-500 text-sm mt-1`]}>
                  {errors.password.message}
                </Text>
              )}
            </View>
          </View>

          {/* FORGOT PASSWORD */}
          <TouchableOpacity
            style={tw`self-end mt-3`}
            onPress={() => router.push("/(auth)/forgot-password")}
          >
            <Text style={[{ fontFamily: "Poppins-SemiBold" }, tw`text-purple-500`]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* FEEDBACK */}
          {responseMessage && (
            <View
              style={tw`mt-4 p-4 rounded-2xl ${
                responseType === "success" ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <Text
                style={[
                  { fontFamily: "Poppins-Medium" },
                  tw`${
                    responseType === "success" ? "text-green-700" : "text-red-700"
                  } text-center`
                ]}
              >
                {responseMessage}
              </Text>
            </View>
          )}

          {/* LOGIN BUTTON */}
          <AnimatedButton
            title="Sign In"
            onPress={handleSubmit(handleLogin)}
            variant="primary"
            size="lg"
            loading={loading}
            style={tw`mt-8`}
            fullWidth
          />

          {/* SIGN UP */}
          <View style={tw`flex-row justify-center items-center mt-8`}>
            <Text style={[{ fontFamily: "Poppins-Regular" }, tw`text-gray-600`]}>
              Don't have an account?{" "}
            </Text>

            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={[{ fontFamily: "Poppins-SemiBold" }, tw`text-purple-500`]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
