// app/(auth)/reset-password.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  SafeAreaView,
  Alert,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/auth';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';

export default function ResetPasswordScreen() {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
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
            New Password
          </Text>

          <Text
            style={{
              fontFamily: 'Poppins-Regular',
              color: 'rgba(255,255,255,0.85)',
              marginTop: 6,
            }}
          >
            Secure your account
          </Text>
        </LinearGradient>
      </View>

      {/* SCROLLABLE CONTENT - WITH PADDING ONLY */}
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
        keyboardDismissMode="on-drag"
      >
        {/* CENTERED CONTAINER (WEB FIX) */}
        <View
          style={{
            width: '100%',
            maxWidth: 420,
            alignSelf: 'center',
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <LottieLoader
              type="success"
              size={Platform.OS === 'web' ? 100 : 120}
            />
          </View>

          <Text
            style={{
              fontFamily: 'Poppins-Bold',
              fontSize: 22,
              color: '#6A1B9A',
              textAlign: 'center',
              marginBottom: 6,
            }}
          >
            Create New Password
          </Text>

          <Text
            style={{
              fontFamily: 'Poppins-Light',
              fontSize: 14,
              color: '#6B7280',
              textAlign: 'center',
              marginBottom: 28,
            }}
          >
            Enter your new password below
          </Text>

          {/* SUCCESS */}
          {successMsg && (
            <View
              style={{
                backgroundColor: '#DCFCE7',
                borderRadius: 16,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Poppins-Medium',
                  fontSize: 14,
                  color: '#166534',
                  textAlign: 'center',
                }}
              >
                {successMsg}
              </Text>
            </View>
          )}

          {/* ERROR */}
          {errorMsg && (
            <View
              style={{
                backgroundColor: '#FEE2E2',
                borderRadius: 16,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Poppins-Medium',
                  fontSize: 14,
                  color: '#991B1B',
                  textAlign: 'center',
                }}
              >
                {errorMsg}
              </Text>
            </View>
          )}

          {/* PASSWORD FIELD */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: 'Poppins-Medium',
                fontSize: 13,
                color: '#374151',
                marginBottom: 6,
              }}
            >
              New Password
            </Text>

            <Controller
              control={control}
              rules={{
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={{
                      borderWidth: 2,
                      borderColor: errors.password
                        ? '#EF4444'
                        : '#E5E7EB',
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      paddingRight: 48,
                      fontFamily: 'Poppins-Regular',
                      fontSize: 14,
                      color: '#111827',
                    }}
                    placeholder="Enter new password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    autoComplete="password-new"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 16,
                      top: 14,
                    }}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
              )}
              name="password"
            />

            {errors.password && (
              <Text
                style={{
                  fontFamily: 'Poppins-Regular',
                  fontSize: 12,
                  color: '#EF4444',
                  marginTop: 4,
                }}
              >
                {errors.password.message}
              </Text>
            )}
          </View>

          {/* CONFIRM PASSWORD */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: 'Poppins-Medium',
                fontSize: 13,
                color: '#374151',
                marginBottom: 6,
              }}
            >
              Confirm Password
            </Text>

            <Controller
              control={control}
              rules={{
                required: 'Please confirm your password',
                validate: value =>
                  value === password || 'Passwords do not match',
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={{
                      borderWidth: 2,
                      borderColor: errors.confirmPassword
                        ? '#EF4444'
                        : '#E5E7EB',
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      paddingRight: 48,
                      fontFamily: 'Poppins-Regular',
                      fontSize: 14,
                      color: '#111827',
                    }}
                    placeholder="Confirm new password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="password-new"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 16,
                      top: 14,
                    }}
                    onPress={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                  >
                    <Ionicons
                      name={
                        showConfirmPassword ? 'eye-off' : 'eye'
                      }
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
              )}
              name="confirmPassword"
            />

            {errors.confirmPassword && (
              <Text
                style={{
                  fontFamily: 'Poppins-Regular',
                  fontSize: 12,
                  color: '#EF4444',
                  marginTop: 4,
                }}
              >
                {errors.confirmPassword.message}
              </Text>
            )}
          </View>

          <AnimatedButton
            title="Reset Password"
            onPress={handleSubmit(handlePasswordReset)}
            variant="primary"
            size="lg"
            loading={loading}
            fullWidth
            style={{ marginBottom: 12 }}
          />

          <AnimatedButton
            title="Back to Login"
            onPress={() => router.replace('/(auth)/login')}
            variant="secondary"
            size="md"
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};