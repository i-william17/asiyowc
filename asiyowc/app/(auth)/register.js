import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { registerUser } from '../../store/slices/authSlice';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';

const RegisterScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { onboardingData, loading } = useSelector(state => state.auth);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

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

  const handleRegistration = async (data) => {
    if (!agreeToTerms) {
      Alert.alert('Terms Required', 'Please agree to the Terms and Conditions to continue.');
      return;
    }
    
    router.push({
      pathname: '/(tabs)',
    });
    // try {
    //   const userData = {
    //     ...data,
    //     ...onboardingData,
    //     interests: onboardingData?.interests || [],
    //     role: onboardingData?.role || 'professional'
    //   };

    //   const result = await dispatch(registerUser(userData)).unwrap();
      
    //   router.push({
    //     pathname: '/(auth)/verify-otp',
    //     params: { verificationId: result.data.user._id, type: 'registration' }
    //   });
    // } catch (error) {
    //   Alert.alert('Registration Failed', error.message || 'Something went wrong');
    // }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <KeyboardAvoidingView 
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={['#6A1B9A', '#8E24AA']}
          style={tw`h-40 rounded-b-3xl`}
        >
          <View style={tw`flex-1 justify-center items-center`}>
            <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-white mt-5`]}>Asiyo Women Connect App</Text>
            <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-white opacity-90 mt-5`]}>Join Our Sisterhood</Text>
          </View>
        </LinearGradient>

        <ScrollView 
          style={tw`flex-1 px-6 py-8`}
          showsVerticalScrollIndicator={false}
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
            <View>
              <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-sm text-gray-700 mb-2`]}>
                Full Name
              </Text>
              <Controller
                control={control}
                rules={{
                  required: 'Full name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters'
                  }
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

            <View>
              <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-sm text-gray-700 mb-2`]}>
                Phone Number
              </Text>
              <Controller
                control={control}
                rules={{
                  required: 'Phone number is required'
                }}
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

            <View>
              <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-sm text-gray-700 mb-2`]}>
                Password
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
                      placeholder="Create a password"
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

            {/* Terms and Conditions Checkbox */}
            <View style={tw`flex-row items-start mt-4 mb-2`}>
              <TouchableOpacity
                style={tw`flex-row items-start`}
                onPress={() => setAgreeToTerms(!agreeToTerms)}
              >
                <View style={[
                  tw`w-5 h-5 border-2 rounded mt-1 mr-3 items-center justify-center`,
                  agreeToTerms ? tw`bg-purple-600 border-purple-600` : tw`border-gray-400`
                ]}>
                  {agreeToTerms && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-gray-700 text-sm leading-5`]}>
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