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
import { loginUser } from '../../store/slices/authSlice';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import tw from '../../utils/tw';

const LoginScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { loading, error, twoFactorRequired } = useSelector(state => state.auth);
  
  const [showPassword, setShowPassword] = useState(false);

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
      const result = await dispatch(loginUser(data)).unwrap();
      
      if (result.requires2FA) {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: { verificationId: result.verificationId, type: '2fa' }
        });
      }
    } catch (error) {
      Alert.alert('Login Failed', error.message || 'Something went wrong');
    }
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
            <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-white opacity-90 mt-5`]}>Get Back on Track</Text>
          </View>
        </LinearGradient>

        <ScrollView 
          style={tw`flex-1 px-6 py-8`}
          showsVerticalScrollIndicator={false}
        >
          <View style={tw`items-center mb-8`}>
            <LottieLoader type="welcome" size={120} />
          </View>

          <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-purple-900 mb-2`]}>
            Sign In
          </Text>
          <Text style={[{ fontFamily: 'Poppins-Light' }, tw`text-gray-600 mb-8`]}>
            Continue your empowerment journey
          </Text>

          <View style={tw`space-y-4`}>
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
                Password
              </Text>
              <Controller
                control={control}
                rules={{
                  required: 'Password is required'
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={tw`relative`}>
                    <TextInput
                      style={[
                        tw`border-2 border-gray-200 rounded-2xl px-4 py-4 text-base pr-12`,
                        errors.password && tw`border-red-500`
                      ]}
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
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
          </View>

          <TouchableOpacity
            style={tw`self-end mt-2`}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={[{ fontFamily: 'Poppins-SemiBold' }, tw`text-purple-500`]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          <AnimatedButton
            title="Sign In"
            onPress={handleSubmit(handleLogin)}
            variant="primary"
            size="lg"
            loading={loading}
            style={tw`mt-8`}
            fullWidth
          />

          <View style={tw`flex-row justify-center items-center mt-8`}>
            <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-gray-600`]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[{ fontFamily: 'Poppins-SemiBold' }, tw`text-purple-500`]}>
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