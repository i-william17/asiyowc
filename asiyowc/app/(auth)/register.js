// app/(auth)/register.js
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
import { useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';
import axios from 'axios';
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

const RegisterScreen = () => {
  const router = useRouter();
  const { onboardingData } = useSelector(state => state.auth);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

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
      interests:
        Array.isArray(onboardingData?.interests) &&
          onboardingData.interests.length > 0
          ? onboardingData.interests
          : []
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
      setResponseMessage('Verification OTP sent! Redirecting…');

      setTimeout(() => {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: {
            email: data.email,
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
              Join Our Sisterhood
            </Text>
          </LinearGradient>
        </View>

        <DismissKeyboardWrapper>
          {/* ---------------- FORM ---------------- */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
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
                          tw`border-2 border-gray-200 rounded-2xl px-4 py-3 text-base`,
                          {
                            color: '#111827',
                            fontFamily: 'Poppins-Regular',
                            fontSize: 14,
                          },
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
                          tw`border-2 border-gray-200 rounded-2xl px-4 py-3 text-base`,
                          { color: '#111827', fontFamily: 'Poppins-Regular', fontSize: 14 },
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
                          tw`border-2 border-gray-200 rounded-2xl px-4 py-3`,
                          {
                            color: '#111827',
                            fontFamily: 'Poppins-Regular',
                            fontSize: 14
                          },
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
                            tw`border-2 border-gray-200 rounded-2xl px-4 py-3 text-base pr-12`,
                            { color: '#111827', fontFamily: 'Poppins-Regular', fontSize: 14 },
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
                            tw`border-2 border-gray-200 rounded-2xl px-4 py-3 text-base pr-12`,
                            {
                              color: '#111827',
                              fontFamily: 'Poppins-Regular',
                              fontSize: 14
                            },
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
                          style={tw`absolute right-4 top-3`}
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
                        agreeToTerms ? { backgroundColor: '#6A1B9A', borderColor: '#6A1B9A' } : tw`border-gray-400`
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
                        <Text
                          onPress={() => setShowTermsModal(true)}
                          style={{
                            fontFamily: 'Poppins-SemiBold',
                            color: '#6A1B9A',
                            textDecorationLine: 'underline'
                          }}
                        >
                          Terms and Conditions
                        </Text>
                        {' '}and{' '}
                        <Text
                          onPress={() => setShowPrivacyModal(true)}
                          style={{
                            fontFamily: 'Poppins-SemiBold',
                            color: '#6A1B9A',
                            textDecorationLine: 'underline'
                          }}
                        >
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
                  <Text style={[{ fontFamily: 'Poppins-SemiBold' }, { color: '#6A1B9A' }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </DismissKeyboardWrapper>

        {/* ---------------- TERMS MODAL ---------------- */}
        {showTermsModal && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <TouchableOpacity
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              onPress={() => setShowTermsModal(false)}
            />

            <View
              style={{
                width: '85%',
                maxHeight: '70%',
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                padding: 20,
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 18, marginBottom: 10 }}>
                  Terms & Conditions
                </Text>

                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151', marginBottom: 12 }}>
                  Effective Date: {new Date().getFullYear()}
                </Text>

                <Text style={{ fontFamily: 'Poppins-SemiBold', marginTop: 10 }}>1. Acceptance of Terms</Text>
                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151' }}>
                  By accessing or using Asiyo Women Connect, you agree to comply with and be bound by these
                  Terms & Conditions. If you do not agree, please discontinue use of the platform.
                </Text>

                <Text style={{ fontFamily: 'Poppins-SemiBold', marginTop: 15 }}>2. Platform Purpose</Text>
                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151' }}>
                  Asiyo Women Connect exists to empower, connect, and support women professionals,
                  entrepreneurs, advocates, and learners globally. The platform facilitates mentorship,
                  networking, professional growth, and community engagement.
                </Text>

                <Text style={{ fontFamily: 'Poppins-SemiBold', marginTop: 15 }}>3. User Responsibilities</Text>
                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151' }}>
                  Users agree to:
                  {"\n"}• Provide accurate registration information
                  {"\n"}• Maintain confidentiality of their login credentials
                  {"\n"}• Engage respectfully and professionally
                  {"\n"}• Avoid harassment, discrimination, or harmful conduct
                  {"\n"}• Comply with applicable laws and regulations
                </Text>

                <Text style={{ fontFamily: 'Poppins-SemiBold', marginTop: 15 }}>4. Prohibited Conduct</Text>
                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151' }}>
                  The following are strictly prohibited:
                  {"\n"}• Hate speech, harassment, or abuse
                  {"\n"}• Fraudulent or misleading information
                  {"\n"}• Unauthorized commercial solicitation
                  {"\n"}• Sharing confidential member data without consent
                  {"\n"}• Attempting to compromise platform security
                </Text>

                <Text style={{ fontFamily: 'Poppins-SemiBold', marginTop: 15 }}>5. Account Suspension</Text>
                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151' }}>
                  We reserve the right to suspend or terminate accounts that violate these terms
                  without prior notice.
                </Text>

                <Text style={{ fontFamily: 'Poppins-SemiBold', marginTop: 15 }}>6. Intellectual Property</Text>
                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151' }}>
                  All platform content, branding, and materials remain the intellectual property
                  of Asiyo Women Connect unless otherwise stated.
                </Text>

                <Text style={{ fontFamily: 'Poppins-SemiBold', marginTop: 15 }}>7. Limitation of Liability</Text>
                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151' }}>
                  Asiyo Women Connect is not responsible for user-generated content or interactions.
                  Users participate at their own discretion and risk.
                </Text>

                <Text style={{ fontFamily: 'Poppins-SemiBold', marginTop: 15 }}>8. Modifications</Text>
                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151' }}>
                  We may update these Terms periodically. Continued use of the platform constitutes
                  acceptance of any changes.
                </Text>

                <Text style={{ fontFamily: 'Poppins-Regular', color: '#6A1B9A', marginTop: 20 }}>
                  By continuing to use Asiyo Women Connect, you confirm that you have read,
                  understood, and agreed to these Terms & Conditions.
                </Text>
              </ScrollView>

              <TouchableOpacity
                onPress={() => setShowTermsModal(false)}
                style={{
                  marginTop: 20,
                  backgroundColor: '#6A1B9A',
                  paddingVertical: 10,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins-SemiBold' }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ---------------- PRIVACY MODAL ---------------- */}
        {showPrivacyModal && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <TouchableOpacity
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              onPress={() => setShowPrivacyModal(false)}
            />

            <View
              style={{
                width: '85%',
                maxHeight: '70%',
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                padding: 20,
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 18, marginBottom: 10 }}>
                  Privacy Policy
                </Text>

                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151', marginBottom: 12 }}>
                  Effective Date: {new Date().getFullYear()}
                </Text>

                <Text style={{ fontFamily: 'Poppins-SemiBold', marginTop: 10 }}>1. Information We Collect</Text>
                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151' }}>
                  We collect:
                  {"\n"}• Name and profile information
                  {"\n"}• Email and phone number
                  {"\n"}• Professional interests and role
                  {"\n"}• Platform activity and usage data
                </Text>

                <Text style={{ fontFamily: 'Poppins-SemiBold', marginTop: 15 }}>2. How We Use Your Information</Text>
                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151' }}>
                  Your data is used to:
                  {"\n"}• Provide and personalize services
                  {"\n"}• Facilitate mentorship and networking
                  {"\n"}• Improve platform performance
                  {"\n"}• Send important notifications
                </Text>

                <Text style={{ fontFamily: 'Poppins-SemiBold', marginTop: 15 }}>3. Data Protection</Text>
                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151' }}>
                  We implement industry-standard encryption and security practices
                  to safeguard your personal information.
                </Text>

                <Text style={{ fontFamily: 'Poppins-SemiBold', marginTop: 15 }}>4. Data Sharing</Text>
                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151' }}>
                  We do not sell or rent your personal data. Information may be shared
                  only when required by law or with your explicit consent.
                </Text>

                <Text style={{ fontFamily: 'Poppins-SemiBold', marginTop: 15 }}>5. Your Rights</Text>
                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151' }}>
                  You may:
                  {"\n"}• Access your stored data
                  {"\n"}• Request corrections
                  {"\n"}• Request deletion of your account
                  {"\n"}• Withdraw consent for communications
                </Text>

                <Text style={{ fontFamily: 'Poppins-SemiBold', marginTop: 15 }}>6. Data Retention</Text>
                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151' }}>
                  We retain data only as long as necessary to provide services
                  and comply with legal obligations.
                </Text>

                <Text style={{ fontFamily: 'Poppins-SemiBold', marginTop: 15 }}>7. Policy Updates</Text>
                <Text style={{ fontFamily: 'Poppins-Regular', color: '#374151' }}>
                  This Privacy Policy may be updated periodically.
                  Continued use of the platform signifies acceptance of any revisions.
                </Text>

                <Text style={{ fontFamily: 'Poppins-Regular', color: '#6A1B9A', marginTop: 20 }}>
                  Your trust matters to us. We are committed to protecting your privacy
                  and ensuring transparency in how your data is handled.
                </Text>
              </ScrollView>

              <TouchableOpacity
                onPress={() => setShowPrivacyModal(false)}
                style={{
                  marginTop: 20,
                  backgroundColor: '#6A1B9A',
                  paddingVertical: 10,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins-SemiBold' }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardWrapper>
    </SafeAreaView>
  );
};

export default RegisterScreen;