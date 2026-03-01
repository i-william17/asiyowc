// app/(auth)/login.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { loginUser, fetchAuthenticatedUser } from '../../store/slices/authSlice';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';
import { server } from '../../server';

// ============================================
// CROSS-PLATFORM WRAPPERS
// ============================================

/**
 * KeyboardWrapper - Conditionally applies KeyboardAvoidingView only on mobile
 */
const KeyboardWrapper = ({ children }) => {
  if (Platform.OS === 'web') {
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
};

/**
 * DismissKeyboardWrapper - Allows keyboard dismissal on mobile only
 * On web, this is just a View to avoid interfering with input focus
 */
const DismissKeyboardWrapper = ({ children }) => {
  if (Platform.OS === 'web') {
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1 }}>{children}</View>
    </TouchableWithoutFeedback>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

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

      // 1️⃣ Dispatch login thunk
      const resultAction = await dispatch(loginUser(data));

      // 2️⃣ Check if login succeeded
      if (loginUser.fulfilled.match(resultAction)) {
        const payload = resultAction.payload;

        console.log("✅ LOGIN RESPONSE:", payload);

        // 🔐 Handle 2FA case
        if (payload.requires2FA) {
          setResponseType("success");
          setResponseMessage("Verification required — redirecting…");

          setTimeout(() => {
            router.push({
              pathname: "/(auth)/2fa",
            });
          }, 800);

          return;
        }

        // 🎉 Normal login success
        setResponseType("success");
        setResponseMessage("Login successful! Redirecting…");

        // 3️⃣ Fetch authenticated user profile
        await dispatch(fetchAuthenticatedUser());

        // 4️⃣ Navigate to tabs
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 600);
      }

      // ❌ If rejected
      else if (loginUser.rejected.match(resultAction)) {
        const errorMessage =
          resultAction.payload?.message ||
          resultAction.error?.message ||
          "Login failed. Please try again.";

        setResponseType("error");
        setResponseMessage(errorMessage);
      }
    } catch (err) {
      console.log("❌ LOGIN ERROR:", err);
      setResponseType("error");
      setResponseMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <KeyboardWrapper>
        {/* HEADER - FULL WIDTH - OUTSIDE SCROLLVIEW */}
        <View
          style={{
            backgroundColor: '#6A1B9A',
            height: 170,
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 15,
            elevation: 12,
          }}
        >
          <LinearGradient
            colors={['#4A148C', '#6A1B9A']}
            style={{
              flex: 1,
              borderBottomLeftRadius: 40,
              borderBottomRightRadius: 40,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'Poppins-Bold',
                fontSize: 22,
                color: '#FFFFFF',
                marginTop: 10,
              }}
            >
              Asiyo Women Connect
            </Text>

            <Text
              style={{
                fontFamily: 'Poppins-Regular',
                color: 'rgba(255,255,255,0.85)',
                marginTop: 6,
              }}
            >
              Get Back on Track
            </Text>
          </LinearGradient>
        </View>

        <DismissKeyboardWrapper>
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: 24,
                paddingTop: 24,
                paddingBottom: 60,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === 'ios' ? 'interactive' : 'on-drag'
              }
            >
              {/* CENTERED CONTAINER FOR WEB CONSISTENCY */}
              <View
                style={{
                  width: '100%',
                  maxWidth: 420,
                  alignSelf: 'center',
                }}
              >
                <Text style={[{ fontFamily: "Poppins-Bold", color: '#6A1B9A' }, tw`text-2xl mb-2`]}>
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
                            tw`border-2 border-gray-200 rounded-2xl px-4 py-3`,
                            { color: '#111827', fontFamily: 'Poppins-Regular' },
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
                              tw`border-2 border-gray-200 rounded-2xl px-4 py-3 pr-12`,
                              { color: '#111827', fontFamily: 'Poppins-Regular' },
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
                            style={tw`absolute right-4 top-3`}
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
                  <Text style={[{ fontFamily: "Poppins-SemiBold", color: '#6A1B9A' }]}>
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
                    <Text style={[{ fontFamily: "Poppins-SemiBold", color: '#6A1B9A' }]}>
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </DismissKeyboardWrapper>
      </KeyboardWrapper>
    </SafeAreaView>
  );
};

export default LoginScreen;