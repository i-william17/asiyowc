// app/(auth)/forgot-password.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  SafeAreaView,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';
import { authService } from '../../services/auth';

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

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // ✅ FIXED: useRef instead of useState to prevent animation reset on web
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
        router.push({
          pathname: '/(auth)/verify-reset',
          params: { email }
        });
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
              Reset Password
            </Text>
          </LinearGradient>
        </View>

        <DismissKeyboardWrapper>
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
              {/* Animation */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <LottieLoader type="meditation" size={110} />
              </View>

              {/* Title */}
              <Text
                style={{
                  fontFamily: 'Poppins-Bold',
                  fontSize: 22,
                  textAlign: 'center',
                  color: '#6A1B9A',
                  marginBottom: 6,
                }}
              >
                Forgot Password?
              </Text>

              <Text
                style={{
                  fontFamily: 'Poppins-Light',
                  fontSize: 14,
                  textAlign: 'center',
                  color: '#6B7280',
                  marginBottom: 28,
                }}
              >
                Enter your email and we’ll send you a reset code.
              </Text>

              {/* SUCCESS / ERROR */}
              {successMessage !== '' && (
                <Animated.View
                  style={[
                    {
                      backgroundColor: '#DCFCE7',
                      padding: 14,
                      borderRadius: 16,
                      marginBottom: 20,
                      opacity: fadeAnim,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: 'Poppins-Medium',
                      color: '#166534',
                      textAlign: 'center',
                      fontSize: 14,
                    }}
                  >
                    ✅ {successMessage}
                  </Text>
                </Animated.View>
              )}

              {errorMessage !== '' && (
                <Animated.View
                  style={[
                    {
                      backgroundColor: '#FEE2E2',
                      padding: 14,
                      borderRadius: 16,
                      marginBottom: 20,
                      opacity: fadeAnim,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: 'Poppins-Medium',
                      color: '#991B1B',
                      textAlign: 'center',
                      fontSize: 14,
                    }}
                  >
                    ❌ {errorMessage}
                  </Text>
                </Animated.View>
              )}

              {/* Email Field */}
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontFamily: 'Poppins-Medium',
                    fontSize: 13,
                    color: '#374151',
                    marginBottom: 6,
                  }}
                >
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
                        {
                          borderWidth: 2,
                          borderColor: errors.email ? '#EF4444' : '#E5E7EB',
                          borderRadius: 16,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          fontFamily: 'Poppins-Regular',
                          fontSize: 14,
                          color: '#111827',
                        },
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
                  <Text
                    style={{
                      fontFamily: 'Poppins-Regular',
                      color: '#EF4444',
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
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
                style={{ marginBottom: 14 }}
              />

              <AnimatedButton
                title="Back to Login"
                variant="secondary"
                size="md"
                onPress={() => router.back()}
                fullWidth
              />
            </View>
          </ScrollView>
        </DismissKeyboardWrapper>
      </KeyboardWrapper>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;