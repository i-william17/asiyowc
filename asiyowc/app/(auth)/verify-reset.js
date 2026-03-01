// app/(auth)/verify-otp.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';
import { server } from '../../server';

const VerifyResetCodeScreen = () => {
  const router = useRouter();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);

  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [infoMsg, setInfoMsg] = useState(null);

  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputs = useRef([]);
  const params = useLocalSearchParams();
  const email = params.email;

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
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

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value) focusNext(index, value);
  };

  const handleVerification = async () => {
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setErrorMsg("Please enter the 6-digit reset code.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await axios.post(`${server}/auth/verify-reset`, {
        token: otpString
      });

      setSuccessMsg("Code verified! Continue to reset your password…");

      // Wait a moment then go to reset password page
      setTimeout(() => {
        router.replace({
          pathname: '/(auth)/reset-password',
          params: { token: otpString }
        });
      }, 1200);

    } catch (err) {
      console.log("❌ RESET VERIFY ERROR:", err?.response?.data || err);

      setErrorMsg(
        err?.response?.data?.message ||
        "Invalid or expired reset code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      if (!email) {
        setErrorMsg("Missing email information.");
        return;
      }

      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      setErrorMsg(null);
      setSuccessMsg(null);
      setInfoMsg(null);

      await axios.post(`${server}/auth/forgot-password`, {
        email
      });

      setInfoMsg("A new verification code has been sent to your email.");
    } catch (err) {
      console.log("❌ RESEND ERROR:", err?.response?.data || err);

      setErrorMsg(
        err?.response?.data?.message || "Failed to resend code"
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* ---------------- HEADER ---------------- */}
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
            shadowColor: '#4A148C',
            shadowOpacity: 0.3,
            shadowRadius: 20,
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
            Verify Reset Code
          </Text>

          <Text
            style={{
              fontFamily: 'Poppins-Regular',
              color: 'rgba(255,255,255,0.85)',
              marginTop: 6,
            }}
          >
            Enter the 6-digit reset code
          </Text>
        </LinearGradient>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 60 }}>
        {/* Centered Container - Web Optimized */}
        <View
          style={{
            width: '100%',
            maxWidth: 420,
            alignSelf: 'center',
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <LottieLoader 
              type="otp" 
              size={Platform.OS === 'web' ? 100 : 120} 
            />
          </View>

          <Text
            style={{
              fontFamily: 'Poppins-Bold',
              fontSize: 22,
              color: '#6A1B9A',
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            Enter Reset Code
          </Text>
          
          <Text
            style={{
              fontFamily: 'Poppins-Light',
              fontSize: 14,
              color: '#6B7280',
              textAlign: 'center',
              marginBottom: 32,
            }}
          >
            We sent a password reset code to your email.
          </Text>

          {/* OTP Inputs - Centered with fixed spacing */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              marginBottom: 32,
            }}
          >
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => (inputs.current[index] = ref)}
                style={[
                  {
                    width: 48,
                    height: 52,
                    borderWidth: 2,
                    borderColor: digit ? '#6A1B9A' : '#D1D5DB',
                    borderRadius: 14,
                    textAlign: 'center',
                    fontSize: 18,
                    fontFamily: 'Poppins-Bold',
                    marginHorizontal: 6,
                    backgroundColor: digit ? '#F3E8FF' : '#FFFFFF',
                    color: '#111827',
                  }
                ]}
                value={digit}
                onChangeText={(v) => handleOtpChange(v, index)}
                keyboardType="number-pad"
                maxLength={1}
              />
            ))}
          </View>

          {/* INFO MESSAGE - Unified Banner Style */}
          {infoMsg && (
            <View
              style={{
                backgroundColor: '#EDE9FE',
                borderRadius: 16,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Poppins-Medium',
                  fontSize: 14,
                  color: '#5B21B6',
                  textAlign: 'center',
                }}
              >
                {infoMsg}
              </Text>
            </View>
          )}

          {/* SUCCESS MESSAGE - Unified Banner Style */}
          {successMsg && (
            <View
              style={{
                backgroundColor: '#DCFCE7',
                borderRadius: 16,
                padding: 14,
                marginBottom: 12,
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

          {/* ERROR MESSAGE - Unified Banner Style */}
          {errorMsg && (
            <View
              style={{
                backgroundColor: '#FEE2E2',
                borderRadius: 16,
                padding: 14,
                marginBottom: 12,
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

          <AnimatedButton
            title="Verify Code"
            onPress={handleVerification}
            variant="primary"
            size="lg"
            loading={loading}
            fullWidth
            style={{ marginTop: 16 }}
          />

          <View style={{ alignItems: 'center', marginTop: 24 }}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text
                  style={{
                    fontFamily: 'Poppins-SemiBold',
                    color: '#6A1B9A',
                    fontSize: 14,
                  }}
                >
                  Resend Code
                </Text>
              </TouchableOpacity>
            ) : (
              <Text
                style={{
                  fontFamily: 'Poppins-Regular',
                  color: '#6B7280',
                  fontSize: 14,
                }}
              >
                Resend in {timer}s
              </Text>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default VerifyResetCodeScreen;