// app/(auth)/onboarding.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Animated,
  Dimensions,
  TouchableOpacity,
  BackHandler,
  Image,
  useWindowDimensions,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch } from 'react-redux';
import { setOnboardingData } from '../../store/slices/authSlice';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import AnimatedBackground from '../../components/animations/AnimatedBackground';
import { MaterialIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import tw from '../../utils/tw';
import { Platform } from 'react-native';

// Brand color constants for consistency
const BRAND = {
  primary: '#6A1B9A',
  dark: '#4A148C',
  light: '#F3E8FF',
  accent: '#8E24AA',
  success: '#16A34A',
};

const OnboardingScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const Container =
    Platform.OS === 'web'
      ? View
      : Platform.OS === 'ios'
        ? SafeAreaView
        : View; // Android uses View
  const isWeb = Platform.OS === 'web';
  const { width, height } = useWindowDimensions();

  // Responsive breakpoints
  const isSmallWeb = isWeb && width < 480;
  const isMediumWeb = isWeb && width >= 480 && width < 900;
  const isLargeWeb = isWeb && width >= 900;

  const fadeAnim = useState(new Animated.Value(1))[0];
  const slideAnim = useState(new Animated.Value(0))[0];
  const progressAnim = useState(new Animated.Value(0))[0];
  const contentRef = useRef(null);
  const screenHeight = height;

  const quotes = [
    {
      text: "When women support each other, incredible things happen.",
      author: "Phoebe Asiyo"
    },
    {
      text: "Your voice matters. Your story is important.",
      author: "Phoebe Asiyo"
    },
    {
      text: "Together we rise, together we thrive.",
      author: "Asiyo Foundation"
    },
    {
      text: "Empowered women empower women.",
      author: "Global Sisterhood"
    }
  ];

  const interests = [
    { id: 'leadership', name: 'Leadership', icon: 'crown', library: FontAwesome5 },
    { id: 'finance', name: 'Finance', icon: 'trending-up', library: Feather },
    { id: 'health', name: 'Health & Wellness', icon: 'favorite', library: MaterialIcons },
    { id: 'advocacy', name: 'Advocacy', icon: 'megaphone', library: Ionicons },
    { id: 'entrepreneurship', name: 'Entrepreneurship', icon: 'briefcase', library: Feather },
    { id: 'education', name: 'Education', icon: 'graduation-cap', library: FontAwesome5 },
    { id: 'technology', name: 'Technology', icon: 'cpu', library: Feather },
    { id: 'arts', name: 'Arts & Culture', icon: 'palette', library: MaterialIcons },
  ];

  const roles = [
    {
      id: 'mentor',
      name: 'Mentor',
      description: 'Guide and support other women',
      gradient: [BRAND.dark, BRAND.primary],
      icon: 'people',
      library: MaterialIcons
    },
    {
      id: 'entrepreneur',
      name: 'Entrepreneur',
      description: 'Building businesses and ventures',
      gradient: [BRAND.primary, BRAND.accent],
      icon: 'business',
      library: MaterialIcons
    },
    {
      id: 'advocate',
      name: 'Advocate',
      description: 'Championing causes and rights',
      gradient: [BRAND.dark, BRAND.primary],
      icon: 'gavel',
      library: MaterialIcons
    },
    {
      id: 'changemaker',
      name: 'Changemaker',
      description: 'Driving social impact',
      gradient: [BRAND.primary, BRAND.accent],
      icon: 'public',
      library: MaterialIcons
    },
    {
      id: 'learner',
      name: 'Learner',
      description: 'Get up and going',
      gradient: [BRAND.dark, BRAND.primary],
      icon: 'book',
      library: MaterialIcons
    }
  ];

  // Enhanced step navigation with smooth transitions
  const navigateToStep = (targetStep) => {
    if (targetStep === step) return;

    const direction = targetStep > step ? 'forward' : 'backward';

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: direction === 'forward' ? -30 : 30,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(targetStep);
      // Scroll to top when changing steps
      if (contentRef.current) {
        contentRef.current.scrollTo({ y: 0, animated: false });
      }
    });
  };

  useEffect(() => {
    // Animate in when step changes
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(progressAnim, {
        toValue: (step / 4) * 100,
        friction: 8,
        tension: 40,
        useNativeDriver: false,
      }),
    ]).start();
  }, [step]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 1) {
        navigateToStep(step - 1);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [step]);

  const handleNext = () => {
    if (step < 4) {
      navigateToStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      navigateToStep(step - 1);
    }
  };

  const toggleInterest = (interestId) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const completeOnboarding = () => {
    dispatch(setOnboardingData({
      interests: selectedInterests,
      role: selectedRole,
      completed: true
    }));
    router.push('/(auth)/register');
  };

  const getAnimationType = () => {
    switch (step) {
      case 1: return 'welcome';
      case 2: return 'empowerment';
      case 3: return 'mentorship';
      case 4: return 'celebration';
      default: return 'welcome';
    }
  };

  // Professional step indicator component
  const StepIndicator = () => (
    <View style={tw`flex-row justify-center mb-8`}>
      {[1, 2, 3, 4].map((stepNumber) => (
        <TouchableOpacity
          key={stepNumber}
          onPress={() => navigateToStep(stepNumber)}
          style={tw`flex-row items-center`}
        >
          <View
            style={[
              tw`w-8 h-8 rounded-full items-center justify-center border-2 mx-2`,
              stepNumber === step
                ? { backgroundColor: BRAND.primary, borderColor: BRAND.primary }
                : stepNumber < step
                  ? { backgroundColor: BRAND.success, borderColor: BRAND.success }
                  : { backgroundColor: '#FFFFFF', borderColor: '#D1D5DB' }
            ]}
          >
            {stepNumber < step ? (
              <MaterialIcons name="check" size={16} color="#FFFFFF" />
            ) : (
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  { fontFamily: 'Poppins-Medium' },
                  stepNumber === step ? { color: '#FFFFFF' } : { color: '#9CA3AF' }
                ]}>
                {stepNumber}
              </Text>
            )}
          </View>
          {stepNumber < 4 && (
            <View
              style={[
                tw`w-8 h-0.5`,
                stepNumber < step ? { backgroundColor: BRAND.success } : { backgroundColor: '#D1D5DB' }
              ]}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep = () => {
    // Responsive grid logic
    let numColumns = 2;

    if (isSmallWeb) numColumns = 1;
    else if (isMediumWeb) numColumns = 2;
    else if (isLargeWeb) numColumns = 3;

    const cardWidth = numColumns === 1 ? '100%' : `${100 / numColumns - 2}%`;

    switch (step) {
      case 1:
        return (
          <View style={tw`flex-1 items-center justify-center px-4`}>
            <Image
              source={require('../../assets/images/asiyo-nobg.png')}
              style={tw`w-28 h-28 rounded-full mb-6`}
            />

            <Text
              maxFontSizeMultiplier={1.3}
              style={[
                { fontFamily: 'Poppins-Bold', fontSize: 26, color: BRAND.primary, textAlign: 'center' },
                tw`mb-6`
              ]}
            >
              Asiyo Women Connect
            </Text>

            <Text
              maxFontSizeMultiplier={1.3}
              style={[
                { fontFamily: 'Poppins-Medium' },
                tw`text-base text-gray-600 mb-4 text-center leading-6`
              ]}
            >
              {quotes[0].text}
            </Text>

            <Text
              maxFontSizeMultiplier={1.3}
              style={[
                { fontFamily: 'Poppins-Light' },
                tw`text-sm text-gray-500 mb-10 text-center italic`
              ]}
            >
              — {quotes[0].author}
            </Text>

            <AnimatedButton
              title="Join the Sisterhood"
              onPress={handleNext}
              variant="primary"
              size="lg"
            />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={tw`mt-6`}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  { fontFamily: 'Poppins-Medium' },
                  tw`text-sm text-black text-center`
                ]}
              >
                Already registered?{" "}
                <Text style={{ color: BRAND.primary, textDecorationLine: 'underline' }}>
                  Move to Login
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View style={tw`flex-1`}>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-center text-gray-900 mb-3`]}>
              Professional Interests
            </Text>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[{ fontFamily: 'Poppins-Light' }, tw`text-base text-center text-gray-600 mb-8`]}>
              Select areas that align with your professional goals
            </Text>

            <ScrollView
              nestedScrollEnabled
              ref={contentRef}
              style={tw`flex-1 mb-6`}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
                {interests.map((interest) => {
                  const IconComponent = interest.library;
                  const isSelected = selectedInterests.includes(interest.id);
                  return (
                    <TouchableOpacity
                      key={interest.id}
                      style={[
                        {
                          width: cardWidth,
                          marginBottom: 16,
                          paddingVertical: 18,
                          paddingHorizontal: 12,
                          minHeight: 110,
                          borderRadius: 16,
                          borderWidth: 1.5,
                          borderColor: isSelected ? BRAND.primary : '#E5E7EB',
                          backgroundColor: isSelected ? BRAND.light : '#FFFFFF',
                          shadowColor: '#000',
                          shadowOpacity: 0.04,
                          shadowRadius: 8,
                          elevation: 2,
                        }
                      ]}
                      onPress={() => toggleInterest(interest.id)}
                    >
                      <View style={tw`items-center`}>
                        <View style={[
                          {
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: isSelected ? BRAND.primary : '#F3F4F6',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 10,
                          }
                        ]}>
                          <IconComponent
                            name={interest.icon}
                            size={20}
                            color={isSelected ? '#FFFFFF' : BRAND.primary}
                          />
                        </View>
                        <Text
                          numberOfLines={2}
                          maxFontSizeMultiplier={1.3}
                          style={[
                            { fontFamily: 'Poppins-Medium', fontSize: 13, textAlign: 'center' },
                            isSelected ? { color: BRAND.primary } : { color: '#374151' }
                          ]}>
                          {interest.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={tw`flex-row justify-between pt-4 border-t border-gray-100`}>
              <AnimatedButton
                title="Back"
                onPress={handleBack}
                variant="secondary"
                size="md"
              />
              <AnimatedButton
                title={`Continue (${selectedInterests.length})`}
                onPress={handleNext}
                variant="primary"
                size="md"
                disabled={selectedInterests.length === 0}
              />
            </View>
          </View>
        );

      case 3:
        return (
          <View style={tw`flex-1`}>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-center text-gray-900 mb-3`]}>
              Professional Role
            </Text>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[{ fontFamily: 'Poppins-Light' }, tw`text-base text-center text-gray-600 mb-8`]}>
              How do you envision contributing to our community?
            </Text>

            <ScrollView
              nestedScrollEnabled
              ref={contentRef}
              style={tw`flex-1 mb-6`}
              showsVerticalScrollIndicator={false}
            >
              {roles.map((role) => {
                const IconComponent = role.library;
                const isSelected = selectedRole === role.id;
                return (
                  <TouchableOpacity
                    key={role.id}
                    onPress={() => setSelectedRole(role.id)}
                    style={tw`mb-4`}
                  >
                    <LinearGradient
                      colors={role.gradient}
                      style={[
                        {
                          paddingVertical: 18,
                          paddingHorizontal: 18,
                          borderRadius: 20,
                        },
                        isSelected && tw`border-4 border-white shadow-lg`,
                        !isSelected && tw`opacity-90`
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={tw`flex-row items-center`}>
                        <View style={tw`flex-row items-center flex-1`}>
                          <View style={[
                            {
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              backgroundColor: 'rgba(255,255,255,0.2)',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 16,
                            },
                            isSelected && { backgroundColor: 'rgba(255,255,255,0.3)' }
                          ]}>
                            <IconComponent
                              name={role.icon}
                              size={20}
                              color="#FFFFFF"
                            />
                          </View>
                          <View style={tw`flex-1`}>
                            <Text
                              maxFontSizeMultiplier={1.3}
                              style={[
                                { fontFamily: 'Poppins-SemiBold', fontSize: 16, color: '#FFFFFF' },
                                tw`mb-1`
                              ]}>
                              {role.name}
                            </Text>
                            <Text
                              maxFontSizeMultiplier={1.3}
                              style={[{ fontFamily: 'Poppins-Regular' }, tw`text-white text-opacity-90 text-sm leading-5`]}>
                              {role.description}
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <View style={tw`w-7 h-7 rounded-full bg-white items-center justify-center shadow-md`}>
                            <MaterialIcons name="check" size={18} color={role.gradient[0]} />
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={tw`flex-row justify-between pt-4 border-t border-gray-100`}>
              <AnimatedButton
                title="Back"
                onPress={handleBack}
                variant="secondary"
                size="md"
              />
              <AnimatedButton
                title="Continue"
                onPress={handleNext}
                variant="primary"
                size="md"
                disabled={!selectedRole}
              />
            </View>
          </View>
        );

      case 4:
        return (
          <View style={tw`flex-1 justify-center items-center`}>
            <View style={tw`items-center mb-6`}>
              <Image
                source={require('../../assets/images/asiyo-nobg.png')}
                style={tw`w-40 h-40 rounded-full`}
              />
            </View>
            <LottieLoader
              type="celebration"
              size={200}
              loop={false}
            />

            <Text
              maxFontSizeMultiplier={1.3}
              style={[{ fontFamily: 'Poppins-Bold' }, tw`text-3xl text-center text-gray-900 mb-6 mt-8 leading-tight`]}>
              Together we rise, together we thrive
            </Text>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[{ fontFamily: 'Poppins-Light' }, tw`text-lg text-center text-gray-600 mb-6 leading-7`]}>
              You're now ready to connect with professional women worldwide, access exclusive resources, and accelerate your growth.
            </Text>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[{ fontFamily: 'Poppins-Medium' }, tw`text-base text-center mb-2 italic`, { color: BRAND.primary }]}>
              "{quotes[3].text}"
            </Text>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[{ fontFamily: 'Poppins-Regular' }, tw`text-sm text-center mb-12`, { color: BRAND.accent }]}>
              — {quotes[3].author}
            </Text>

            <AnimatedButton
              title="Start your Journey"
              onPress={handleNext}
              variant="primary"
              size="lg"
            />

            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.7}
              style={{
                marginTop: 18,
                alignSelf: 'center',
                paddingVertical: 6,
                paddingHorizontal: 14,
                borderRadius: 20,
                backgroundColor: '#F3F4F6',
              }}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                style={{
                  fontFamily: 'Poppins-Medium',
                  fontSize: 12,
                  color: '#4B5563',
                  textAlign: 'center',
                  letterSpacing: 0.3,
                }}
              >
                ← Go back
              </Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <Container style={tw`flex-1 bg-white`}>

      <StatusBar translucent style="light" backgroundColor="rgba(0,0,0,0)" />

      {Platform.OS !== 'web' && (
        <AnimatedBackground
          type="floating"
          opacity={0.08}
          speed={0.2}
        />
      )}

      {/* Enhanced Header with Professional Gradient - Clean Version */}
<LinearGradient
  colors={[BRAND.dark, BRAND.primary, BRAND.accent]}
  style={{
    height: 150 + (Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0),
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    marginTop: Platform.OS === 'web' ? 0 : -100,
  }}
>
        <View style={tw`flex-1 justify-center items-center`}>
          <LottieLoader
            type={getAnimationType()}
            size={140}
          />
        </View>
      </LinearGradient>

      {/* Enhanced Progress Section */}
      <View style={tw`px-6 mb-6 -mt-10`}>
        <View style={tw`bg-white rounded-2xl p-6 shadow-lg border border-gray-100`}>
          <StepIndicator />

          <View style={tw`flex-row items-center justify-between mb-3`}>
            <View style={tw`flex-row items-center`}>
              <Image
                source={require('../../assets/images/asiyowc.png')}
                style={tw`w-8 h-8 rounded-full mr-3`}
              />
              <Text
                maxFontSizeMultiplier={1.3}
                style={[{ fontFamily: 'Poppins-SemiBold' }, tw`text-sm text-gray-700`]}>
                Asiyo Women Connect
              </Text>
            </View>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[{ fontFamily: 'Poppins-Medium' }, tw`text-xs text-gray-500`]}>
              Step {step} of 4
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content Area - Now Scrollable */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 80,
          paddingHorizontal: isWeb ? (width < 600 ? 16 : 80) : 24,
          maxWidth: isWeb ? 900 : '100%',
          alignSelf: 'center',
          width: '100%',
        }}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {renderStep()}
        </Animated.View>
      </ScrollView>
    </Container>
  );
};

export default OnboardingScreen;