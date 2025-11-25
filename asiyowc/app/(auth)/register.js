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
import { useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';
import axios from 'axios';
import { server } from '../../server';

const RegisterScreen = () => {
  const router = useRouter();
  const { onboardingData } = useSelector(state => state.auth);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const [responseMessage, setResponseMessage] = useState(null);
  const [responseType, setResponseType] = useState(null);

  const [passwordStrength, setPasswordStrength] = useState(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      fullName: '',
    }
  });

  const password = watch('password');

  /* ------------------------------------------
     🔥 PASSWORD STRENGTH CHECKER
  ------------------------------------------- */
  const evaluatePasswordStrength = (pwd) => {
    if (!pwd) return setPasswordStrength(null);

    let score = 0;

    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) setPasswordStrength("Weak");
    else if (score === 2) setPasswordStrength("Medium");
    else setPasswordStrength("Strong");
  };

  const strengthColor = {
    Weak: "text-red-600",
    Medium: "text-yellow-600",
    Strong: "text-green-600"
  };

  /* ------------------------------------------
     🔥 HANDLE REGISTRATION
  ------------------------------------------- */
  const handleRegistration = async (data) => {
    if (!agreeToTerms) {
      setResponseType('error');
      setResponseMessage('Please agree to the Terms and Conditions to continue.');
      return;
    }

    const formattedPhone =
      data.phone.startsWith("0")
        ? `+254${data.phone.substring(1)}`
        : data.phone;

    const userPayload = {
      email: data.email,
      password: data.password,
      phone: formattedPhone,
      profile: {
        fullName: data.fullName,
        role: onboardingData?.role || 'professional',
      },
      interests: onboardingData?.interests || []
    };

    console.log("📤 SENDING PAYLOAD:", userPayload);

    try {
      setLoading(true);
      setResponseType(null);
      setResponseMessage(null);

      const res = await axios.post(
        `${server}/auth/register`,
        userPayload,
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("✅ REGISTER RESPONSE:", res.data);

      setResponseType('success');
      setResponseMessage('Registration successful! Redirecting…');

      setTimeout(() => {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: {
            verificationId: res.data.data.user.id,
            type: 'registration'
          }
        });
      }, 1000);

    } catch (err) {
      console.log("❌ REGISTER AXIOS ERROR:", err?.response?.data || err.message);

      setResponseType('error');
      setResponseMessage(
        err?.response?.data?.message ||
        err?.message ||
        "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

        {/* ---------------- HEADER ---------------- */}
        <LinearGradient
          colors={['#6A1B9A', '#8E24AA']}
          style={tw`h-40 rounded-b-3xl`}
        >
          <View style={tw`flex-1 justify-center items-center`}>
            <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-white mt-5`]}>
              Asiyo Women Connect App
            </Text>
            <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-white opacity-90 mt-5`]}>
              Join Our Sisterhood
            </Text>
          </View>
        </LinearGradient>

        {/* ---------------- FORM ---------------- */}
        <ScrollView
          style={tw`flex-1 px-6 py-8`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={tw`items-center mb-8`}>
            <LottieLoader type="connection" size={120} />
          </View>

          <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-purple-900 mb-2`]}>
            Create Account
          </Text>
          <Text style={[{ fontFamily: 'Poppins-Light' }, tw`text-gray-600 mb-8`]}>
            Join our global community of empowered women
          </Text>

          <View style={tw`space-y-4`}>

            {/* ---------------- FULL NAME ---------------- */}
            <View>
              <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-sm text-gray-700 mb-2`]}>
                Full Name
              </Text>

              <Controller
                control={control}
                rules={{
                  required: 'Full name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' }
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      tw`border-2 border-gray-200 rounded-2xl px-4 py-4 text-base`,
                      errors.fullName && tw`border-red-500`
                    ]}
                    placeholder="Enter your full name"
                    placeholderTextColor="#9CA3AF"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="words"
                  />
                )}
                name="fullName"
              />

              {errors.fullName && (
                <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-red-500 text-sm mt-1`]}>
                  {errors.fullName.message}
                </Text>
              )}
            </View>

            {/* ---------------- EMAIL ---------------- */}
            <View>
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

            {/* ---------------- PHONE ---------------- */}
            <View>
              <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-sm text-gray-700 mb-2`]}>
                Phone Number
              </Text>

              <Controller
                control={control}
                rules={{ required: 'Phone number is required' }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      tw`border-2 border-gray-200 rounded-2xl px-4 py-4 text-base`,
                      errors.phone && tw`border-red-500`
                    ]}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#9CA3AF"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                  />
                )}
                name="phone"
              />

              {errors.phone && (
                <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-red-500 text-sm mt-1`]}>
                  {errors.phone.message}
                </Text>
              )}
            </View>

            {/* ---------------- PASSWORD ---------------- */}
            <View>
              <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-sm text-gray-700 mb-2`]}>
                Password
              </Text>

              <Controller
                control={control}
                rules={{
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' }
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={tw`relative`}>
                    <TextInput
                      style={[
                        tw`border-2 border-gray-200 rounded-2xl px-4 py-4 text-base pr-12`,
                        errors.password && tw`border-red-500`
                      ]}
                      placeholder="Create a password"
                      placeholderTextColor="#9CA3AF"
                      onBlur={onBlur}
                      onChangeText={(txt) => {
                        onChange(txt);
                        evaluatePasswordStrength(txt);
                      }}
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

              {/* Password Strength Indicator */}
              {passwordStrength && (
                <Text
                  style={[
                    { fontFamily: 'Poppins-SemiBold' },
                    tw`${strengthColor[passwordStrength]} mt-1`
                  ]}
                >
                  Password Strength: {passwordStrength}
                </Text>
              )}

              {errors.password && (
                <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-red-500 text-sm mt-1`]}>
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* ---------------- CONFIRM PASSWORD ---------------- */}
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
                      placeholder="Confirm your password"
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

            {/* ---------------- TERMS ---------------- */}
            <View style={tw`flex-row items-start mt-4 mb-2`}>
              <TouchableOpacity
                style={tw`flex-row items-start`}
                onPress={() => setAgreeToTerms(!agreeToTerms)}
              >
                <View
                  style={[
                    tw`w-5 h-5 border-2 rounded mt-1 mr-3 items-center justify-center`,
                    agreeToTerms ? tw`bg-purple-600 border-purple-600` : tw`border-gray-400`
                  ]}
                >
                  {agreeToTerms && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>

                <View style={tw`flex-1`}>
                  <Text
                    style={[
                      { fontFamily: 'Poppins-Regular' },
                      tw`text-gray-700 text-sm leading-5`
                    ]}
                  >
                    I agree to the{' '}
                    <Text style={[{ fontFamily: 'Poppins-SemiBold' }, tw`text-purple-600`]}>
                      Terms and Conditions
                    </Text>
                    {' '}and{' '}
                    <Text style={[{ fontFamily: 'Poppins-SemiBold' }, tw`text-purple-600`]}>
                      Privacy Policy
                    </Text>
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* ---------------- FEEDBACK MESSAGE ---------------- */}
          {responseMessage && (
            <View
              style={tw`
                mt-4 p-4 rounded-2xl
                ${responseType === 'success' ? 'bg-green-100' : 'bg-red-100'}
              `}
            >
              <Text
                style={[
                  { fontFamily: 'Poppins-Medium' },
                  tw`${responseType === 'success' ? 'text-green-700' : 'text-red-700'} text-center`
                ]}
              >
                {responseMessage}
              </Text>
            </View>
          )}

          {/* ---------------- SUBMIT BUTTON ---------------- */}
          <AnimatedButton
            title="Create Account"
            onPress={handleSubmit(handleRegistration)}
            variant="primary"
            size="lg"
            loading={loading}
            style={tw`mt-6`}
            fullWidth
            disabled={!agreeToTerms}
          />

          <View style={tw`flex-row justify-center items-center mt-8`}>
            <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-gray-600`]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={[{ fontFamily: 'Poppins-SemiBold' }, tw`text-purple-500`]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegisterScreen;
