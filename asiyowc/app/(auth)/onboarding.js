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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch } from 'react-redux';
import { setOnboardingData } from '../../store/slices/authSlice';
import LottieLoader from '../../components/animations/LottieLoader';
import AnimatedButton from '../../components/ui/AnimatedButton';
import AnimatedBackground from '../../components/animations/AnimatedBackground';
import { MaterialIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import tw from '../../utils/tw';

const { width } = Dimensions.get('window');

const OnboardingScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');

  const fadeAnim = useState(new Animated.Value(1))[0];
  const slideAnim = useState(new Animated.Value(0))[0];
  const progressAnim = useState(new Animated.Value(0))[0];
  const contentRef = useRef(null);

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
    { id: 'leadership', name: 'Leadership', icon: 'crown', library: FontAwesome5, color: '#8B5CF6' },
    { id: 'finance', name: 'Finance', icon: 'trending-up', library: Feather, color: '#10B981' },
    { id: 'health', name: 'Health & Wellness', icon: 'favorite', library: MaterialIcons, color: '#EF4444' },
    { id: 'advocacy', name: 'Advocacy', icon: 'megaphone', library: Ionicons, color: '#F59E0B' },
    { id: 'entrepreneurship', name: 'Entrepreneurship', icon: 'briefcase', library: Feather, color: '#6366F1' },
    { id: 'education', name: 'Education', icon: 'graduation-cap', library: FontAwesome5, color: '#EC4899' },
    { id: 'technology', name: 'Technology', icon: 'cpu', library: Feather, color: '#06B6D4' },
    { id: 'arts', name: 'Arts & Culture', icon: 'palette', library: MaterialIcons, color: '#8B5CF6' },
  ];

  const roles = [
    {
      id: 'mentor',
      name: 'Mentor',
      description: 'Guide and support other women',
      gradient: ['#6A1B9A', '#8E24AA'],
      icon: 'people',
      library: MaterialIcons
    },
    {
      id: 'entrepreneur',
      name: 'Entrepreneur',
      description: 'Building businesses and ventures',
      gradient: ['#FFD700', '#FBC02D'],
      icon: 'business',
      library: MaterialIcons
    },
    {
      id: 'advocate',
      name: 'Advocate',
      description: 'Championing causes and rights',
      gradient: ['#FF6B6B', '#FF8E53'],
      icon: 'gavel',
      library: MaterialIcons
    },
    {
      id: 'changemaker',
      name: 'Changemaker',
      description: 'Driving social impact',
      gradient: ['#4ECDC4', '#44A08D'],
      icon: 'public',
      library: MaterialIcons
    },
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
    router.push('/(auth)/login');
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
                ? tw`bg-purple-600 border-purple-600`
                : stepNumber < step
                  ? tw`bg-green-500 border-green-500`
                  : tw`bg-white border-gray-300`,
            ]}
          >
            {stepNumber < step ? (
              <MaterialIcons name="check" size={16} color="#FFFFFF" />
            ) : (
              <Text style={[
                { fontFamily: 'Poppins-Medium' },
                stepNumber === step ? tw`text-white` : tw`text-gray-400`
              ]}>
                {stepNumber}
              </Text>
            )}
          </View>
          {stepNumber < 4 && (
            <View
              style={[
                tw`w-8 h-0.5`,
                stepNumber < step ? tw`bg-green-500` : tw`bg-gray-300`
              ]}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={tw`flex-1 justify-center items-center`}>
            <View style={tw`items-center mb-6`}>
              <Image
                source={require('../../assets/images/asiyo-nobg.png')}
                style={tw`w-40 h-40 rounded-full mb-4`}
              />
            </View>

            <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-gray-900 mb-10 text-center`]}>
              Asiyo Women Connect App
            </Text>

            <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-base text-gray-600 mb-6 text-center leading-6`]}>
              {quotes[0].text}
            </Text>

            <Text style={[{ fontFamily: 'Poppins-Light' }, tw`text-sm text-gray-500 mb-8 text-center italic`]}>
              — {quotes[0].author}
            </Text>

            <AnimatedButton
              title="Join the Sisterhood"
              onPress={handleNext}
              variant="primary"
              size="lg"
            />

            {/* ⭐ NEW — Skip to Login Link */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={tw`mt-6`}
            >
              <Text style={[
                { fontFamily: 'Poppins-Medium' },
                tw`text-sm text-black text-center`
              ]}>
                Already registered? <Text style={tw`text-purple-900 underline`}>Move to Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        );

        return (
          <View style={tw`flex-1 justify-center items-center`}>
            <View style={tw`items-center mb-6`}>
              <Image
                source={require('../../assets/images/asiyo-nobg.png')}
                style={tw`w-40 h-40 rounded-full mb-4`}
              />
            </View>
            <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-gray-900 mb-10 text-center`]}>
              Asiyo Women Connect App
            </Text>
            <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-base text-gray-600 mb-6 text-center leading-6`]}>
              {quotes[0].text}
            </Text>
            <Text style={[{ fontFamily: 'Poppins-Light' }, tw`text-sm text-gray-500 mb-8 text-center italic`]}>
              — {quotes[0].author}
            </Text>
            <AnimatedButton
              title="Join the Sisterhood"
              onPress={handleNext}
              variant="primary"
              size="lg"
            />
          </View>
        );

      case 2:
        return (
          <View style={tw`flex-1`}>
            <View style={tw`items-center mb-4`}>
            </View>
            <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-center text-gray-900 mb-3`]}>
              Professional Interests
            </Text>
            <Text style={[{ fontFamily: 'Poppins-Light' }, tw`text-base text-center text-gray-600 mb-8`]}>
              Select areas that align with your professional goals
            </Text>

            <ScrollView
              ref={contentRef}
              style={tw`flex-1 mb-6`}
              showsVerticalScrollIndicator={false}
            >
              <View style={tw`flex-row flex-wrap justify-between`}>
                {interests.map((interest) => {
                  const IconComponent = interest.library;
                  const isSelected = selectedInterests.includes(interest.id);
                  return (
                    <TouchableOpacity
                      key={interest.id}
                      style={[
                        tw`w-[48%] mb-4 p-5 rounded-xl border-2 transition-all duration-200`,
                        isSelected
                          ? tw`border-purple-500 bg-purple-50 shadow-sm`
                          : tw`border-gray-200 bg-white hover:border-gray-300`
                      ]}
                      onPress={() => toggleInterest(interest.id)}
                    >
                      <View style={tw`items-center`}>
                        <View style={[
                          tw`w-14 h-14 rounded-full items-center justify-center mb-3 transition-all duration-200`,
                          {
                            backgroundColor: isSelected ? interest.color : '#F8FAFC',
                            transform: [{ scale: isSelected ? 1.05 : 1 }]
                          }
                        ]}>
                          <IconComponent
                            name={interest.icon}
                            size={26}
                            color={isSelected ? '#FFFFFF' : interest.color}
                          />
                        </View>
                        <Text style={[
                          { fontFamily: 'Poppins-SemiBold' },
                          tw`text-base text-center leading-5`,
                          isSelected ? tw`text-purple-700` : tw`text-gray-700`
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
            <View style={tw`items-center mb-4`}>
            </View>
            <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-2xl text-center text-gray-900 mb-3`]}>
              Professional Role
            </Text>
            <Text style={[{ fontFamily: 'Poppins-Light' }, tw`text-base text-center text-gray-600 mb-8`]}>
              How do you envision contributing to our community?
            </Text>

            <ScrollView
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
                        tw`p-6 rounded-xl transition-all duration-200`,
                        isSelected && tw`border-4 border-white shadow-lg`,
                        !isSelected && tw`opacity-90`
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={tw`flex-row items-center`}>
                        <View style={tw`flex-row items-center flex-1`}>
                          <View style={[
                            tw`w-12 h-12 rounded-full bg-white bg-opacity-20 items-center justify-center mr-4 transition-all duration-200`,
                            isSelected && tw`bg-opacity-30`
                          ]}>
                            <IconComponent
                              name={role.icon}
                              size={24}
                              color="#FFFFFF"
                            />
                          </View>
                          <View style={tw`flex-1`}>
                            <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-white text-xl mb-1`]}>
                              {role.name}
                            </Text>
                            <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-white text-opacity-90 text-sm leading-5`]}>
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

            <Text style={[{ fontFamily: 'Poppins-Bold' }, tw`text-3xl text-center text-gray-900 mb-6 mt-8 leading-tight`]}>
              Together we rise, together we thrive
            </Text>
            <Text style={[{ fontFamily: 'Poppins-Light' }, tw`text-lg text-center text-gray-600 mb-6 leading-7`]}>
              You're now ready to connect with professional women worldwide, access exclusive resources, and accelerate your growth.
            </Text>
            <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-base text-center text-purple-700 mb-2 italic`]}>
              "{quotes[3].text}"
            </Text>
            <Text style={[{ fontFamily: 'Poppins-Regular' }, tw`text-sm text-center text-purple-600 mb-12`]}>
              — {quotes[3].author}
            </Text>

            <AnimatedButton
              title="Start your Journey"
              onPress={handleNext}
              variant="primary"
              size="lg"
            />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <AnimatedBackground type="floating" opacity={0.08} speed={0.2} />

      {/* Enhanced Header with Professional Gradient */}
      <LinearGradient
        colors={['#1E3A8A', '#3730A3', '#6A1B9A']}
        style={tw`h-52 mt-[-750] rounded-b-3xl shadow-lg`}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={tw`flex-1 justify-center items-center pt-8`}>
          <LottieLoader
            type={getAnimationType()}
            size={140}
          />
        </View>
      </LinearGradient>

      {/* Enhanced Progress Section */}
      <View style={tw`px-6 -mt-8 mb-6`}>
        <View style={tw`bg-white rounded-2xl p-6 shadow-lg border border-gray-100`}>
          <StepIndicator />

          <View style={tw`flex-row items-center justify-between mb-3`}>
            <View style={tw`flex-row items-center`}>
              <Image
                source={require('../../assets/images/asiyowc.png')}
                style={tw`w-8 h-8 rounded-full mr-3`}
              />
              <Text style={[{ fontFamily: 'Poppins-SemiBold' }, tw`text-sm text-gray-700`]}>
                Asiyo Women Connect
              </Text>
            </View>
            <Text style={[{ fontFamily: 'Poppins-Medium' }, tw`text-xs text-gray-500`]}>
              Step {step} of 4
            </Text>
          </View>

        </View>
      </View>

      {/* Main Content Area */}
      <View style={tw`flex-1 px-6 pb-8`}>
        <Animated.View
          style={[
            tw`flex-1`,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {renderStep()}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;