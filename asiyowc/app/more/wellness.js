import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  SafeAreaView
} from 'react-native';
import {
  Heart,
  Play,
  Moon,
  Sun,
  Sparkles,
  Activity,
  ChevronLeft,
  Check,
  Save,
  Gauge,
  Thermometer,
  Frown,
  Meh,
  Smile,
  Laugh,
  Brain,
  Feather,
  Wind,
} from 'lucide-react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useAnimatedProps,
  withSequence,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Svg, {
  Path,
  Defs,
  Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';
import tw from "../../utils/tw";

// ✅ REDUX IMPORTS
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTodayJournal,
  saveJournal,
  fetchRetreats,
} from "../../store/slices/wellnessSlice";

// Constants for SecureStore keys
const STORAGE_KEYS = {
  LAST_TAB: 'wellness_last_tab'
};

const { width } = Dimensions.get('window');

// Optimized Design Constants
const DIAL_RADIUS = 130;
const STROKE_WIDTH = 28;
const KNOB_SIZE = 36;
const DIAL_PADDING = 28;

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Professional Color Palette with Purple (#6A1B9A)
const COLORS = {
  primary: {
    50: '#F5F0FF',
    100: '#E9D5FF',
    200: '#D8B4FE',
    300: '#C084FC',
    400: '#A855F7',
    500: '#9333EA',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
    purple: '#6A1B9A', // New purple shade
  },
  neutral: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
  },
  mood: {
    excellent: '#10B981',
    good: '#3B82F6',
    okay: '#F59E0B',
    low: '#F97316',
    veryLow: '#EF4444',
  },
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

// Enhanced Tab Component
const TabButton = React.memo(({ label, value, activeTab, onPress, icon: Icon }) => {
  const isActive = activeTab === value;

  return (
    <TouchableOpacity
      style={[
        tw`flex-1 flex-row items-center justify-center px-4 py-3 rounded-xl mx-1`,
        isActive ? { backgroundColor: COLORS.primary.purple } : tw`bg-neutral-100`,
      ]}
      onPress={() => onPress(value)}
      activeOpacity={0.7}
    >
      {Icon && (
        <Icon
          size={18}
          color={isActive ? '#FFFFFF' : COLORS.neutral[500]}
          style={tw`mr-2`}
        />
      )}
      <Text style={[
        tw`text-sm font-medium`,
        { fontFamily: 'Poppins-Medium' },
        isActive ? tw`text-white` : tw`text-neutral-600`
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

// ✅ PERFORMANCE OPTIMIZED Mood Dial Component
const MoodDial = React.memo(({ value, onValueChange, isDragging, setIsDraggingMood }) => {
  const dialSize = DIAL_RADIUS * 2 + DIAL_PADDING * 2;
  const centerX = dialSize / 2;
  const centerY = DIAL_RADIUS + DIAL_PADDING + 10;
  const circumference = Math.PI * DIAL_RADIUS;

  const animatedAngle = useSharedValue(0);
  const knobScale = useSharedValue(1);
  // ✅ OPTIMIZED: Track drag value on UI thread
  const dragValue = useSharedValue(0);

  useEffect(() => {
    dragValue.value = value;
  }, [value]);

  // Calculate mood state
  const getMoodState = (val) => {
    if (val >= 80) return {
      label: "Excellent",
      color: COLORS.mood.excellent,
      icon: Laugh,
    };
    if (val >= 60) return {
      label: "Good",
      color: COLORS.mood.good,
      icon: Smile,
    };
    if (val >= 40) return {
      label: "Okay",
      color: COLORS.mood.okay,
      icon: Meh,
    };
    if (val >= 20) return {
      label: "Low",
      color: COLORS.mood.low,
      icon: Frown,
    };
    return {
      label: "Very Low",
      color: COLORS.mood.veryLow,
      icon: Thermometer,
    };
  };

  const mood = getMoodState(value);
  const IconComponent = mood.icon;

  // Calculate angle from value (0-100 maps to 0-180 degrees)
  const targetAngle = (value / 100) * 180;

  // ✅ OPTIMIZED: Only animate when not dragging
  useEffect(() => {
    if (!isDragging) {
      animatedAngle.value = targetAngle;

    }
  }, [value, isDragging]);

  // Create arc path
  const getArcPath = () => {
    const startAngle = Math.PI;
    const endAngle = 0;

    const startX = DIAL_RADIUS * Math.cos(startAngle) + centerX;
    const startY = DIAL_RADIUS * Math.sin(startAngle) + centerY;

    const endX = DIAL_RADIUS * Math.cos(endAngle) + centerX;
    const endY = DIAL_RADIUS * Math.sin(endAngle) + centerY;

    return `M ${startX} ${startY} A ${DIAL_RADIUS} ${DIAL_RADIUS} 0 1 1 ${endX} ${endY}`;
  };

  // Knob position
  const knobStyle = useAnimatedStyle(() => {
    // animatedAngle: 0..180  (0 = left, 180 = right)

    const rad = Math.PI + (animatedAngle.value * Math.PI) / 180; // π..2π

    const x = centerX + DIAL_RADIUS * Math.cos(rad);
    const y = centerY + DIAL_RADIUS * Math.sin(rad);

    return {
      position: "absolute",
      transform: [
        { translateX: x - KNOB_SIZE / 2 },
        { translateY: y - KNOB_SIZE / 2 },
        { scale: knobScale.value },
      ],
    };
  });

  // Animated arc props
  const animatedPathProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - animatedAngle.value / 180);
    return { strokeDashoffset };
  });

  // Calculate touch point to angle conversion
  const getTouchPointAngle = (touchX, touchY) => {
    'worklet';

    const dx = touchX - centerX;
    const dy = touchY - centerY;

    // raw angle: -π → π
    let angle = Math.atan2(dy, dx);

    // convert to 0 → 2π
    if (angle < 0) angle += 2 * Math.PI;

    // restrict to TOP semicircle only (π → 2π)
    angle = Math.min(Math.max(angle, Math.PI), 2 * Math.PI);

    // normalize to 0 → π
    const normalized = angle - Math.PI;

    return (normalized / Math.PI) * 180;
  };

  const angleToValue = (angleDeg) => {
    'worklet';

    const value = Math.round((angleDeg / 180) * 100);

    if (value < 2) return 0;
    if (value > 98) return 100;

    return value;

  };

  // ✅ CRITICAL FIX: Optimized pan gesture - NO bridge calls in onUpdate
  const pan = Gesture.Pan()
    .onBegin(() => {
      knobScale.value = withSpring(1.2, { damping: 12 });
      if (setIsDraggingMood) {
        runOnJS(setIsDraggingMood)(true);
      }
    })
    .onUpdate((event) => {
      const angle = getTouchPointAngle(event.x, event.y); // 0..180
      animatedAngle.value = angle;
      dragValue.value = angleToValue(angle); // 0..100
    })

    .onEnd(() => {
      knobScale.value = withSpring(1, { damping: 15 });

      // ✅ Only call JS bridge ONCE at the end
      runOnJS(onValueChange)(Math.round(dragValue.value));

      if (setIsDraggingMood) {
        runOnJS(setIsDraggingMood)(false);
      }
    })
    .minDistance(2);

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      style={[
        tw`items-center justify-center mb-6 bg-white rounded-2xl p-5`,
        {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.05)',
        }
      ]}
    >
      {/* Mood Header with Icon */}
      <View style={tw`flex-row items-center justify-between w-full mb-5`}>
        <View style={tw`flex-row items-center`}>
          <View style={[
            tw`w-10 h-10 items-center justify-center mr-3`,
          ]}>
            <IconComponent size={20} color={mood.color} strokeWidth={1.8} />
          </View>
          <View>
            <Text style={[
              tw`text-base font-semibold`,
              { fontFamily: 'Poppins-SemiBold', color: COLORS.neutral[800] }
            ]}>
              Current Mood
            </Text>
            <Text style={[
              tw`text-sm`,
              { fontFamily: 'Poppins-Regular', color: COLORS.neutral[500] }
            ]}>
              {mood.label}
            </Text>
          </View>
        </View>
        <View style={tw`bg-neutral-50 px-3 py-1.5 rounded-full`}>
          <Text style={[
            tw`text-sm font-medium`,
            { fontFamily: 'Poppins-Medium', color: mood.color }
          ]}>
            {value}/100
          </Text>
        </View>
      </View>

      {/* Dial Container */}
      <View style={[
        tw`relative items-center justify-center mb-2`,
        { width: dialSize, height: dialSize }
      ]}>
        <GestureDetector gesture={pan}>
          <View style={[
            tw`absolute`,
            { width: dialSize, height: dialSize, zIndex: 10 }
          ]}>
            <Svg width={dialSize} height={dialSize}>
              <Defs>
                <SvgLinearGradient id="moodGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#EF4444" stopOpacity="1" />
                  <Stop offset="50%" stopColor="#F97316" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#10B981" stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>

              {/* Background track */}
              <Path
                d={getArcPath()}
                stroke="rgba(244, 244, 245, 0.8)"
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                fill="none"
                opacity={0.8}
              />

              {/* Animated fill with gradient */}
              <AnimatedPath
                animatedProps={animatedPathProps}
                d={getArcPath()}
                stroke="url(#moodGradient)"
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeDasharray={[circumference, circumference]}
                fill="none"
              />
            </Svg>

            {/* Draggable Knob */}
            <Animated.View style={knobStyle}>
              <View
                style={[
                  tw`w-9 h-9 rounded-full items-center justify-center`,
                  {
                    backgroundColor: mood.color,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    elevation: 4,
                    borderWidth: 3,
                    borderColor: '#FFFFFF',
                  }
                ]}
              >
                <View style={tw`w-2.5 h-2.5 rounded-full bg-white opacity-80`} />
              </View>
            </Animated.View>
          </View>
        </GestureDetector>
      </View>

      {/* Mood Scale */}
      <View style={tw`flex-row justify-between w-full px-2 mt-5`}>
        {[
          { label: 'Low', value: 0 },
          { label: 'Moderate', value: 50 },
          { label: 'High', value: 100 }
        ].map((item, index) => (
          <View key={index} style={tw`items-center`}>
            <Text style={[
              tw`text-xs font-medium mb-1`,
              { fontFamily: 'Poppins-Medium', color: COLORS.neutral[600] }
            ]}>
              {item.label}
            </Text>
            <Text style={[
              tw`text-xs`,
              { fontFamily: 'Poppins-Regular', color: COLORS.neutral[400] }
            ]}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
});

// Virtual Session Card
const VirtualSessionCard = React.memo(({ session, router }) => {
  const [isPressed, setIsPressed] = useState(false);

  const getStatus = () => {
    if (session.progress >= 100) return 'completed';
    if (session.progress > 0) return 'started';
    return 'new';
  };

  const status = getStatus();
  const statusConfig = {
    new: { text: 'Begin', color: COLORS.primary.purple, badge: 'New' },
    started: { text: 'Continue', color: COLORS.warning, badge: 'In Progress' },
    completed: { text: 'Review', color: COLORS.neutral[500], badge: 'Completed' }
  };

  const handlePressIn = () => setIsPressed(true);
  const handlePressOut = () => setIsPressed(false);

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => router.push(`/wellness/retreat/${session._id}`)}
      >
        <View style={[
          tw`bg-white rounded-xl p-4 mb-3`,
          isPressed && { transform: [{ scale: 0.99 }] },
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 3,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.05)',
          }
        ]}>
          <View style={tw`flex-row items-center`}>
            <View style={[
              tw`w-14 h-14 rounded-lg overflow-hidden mr-3 relative`,
              { backgroundColor: `${COLORS.primary.purple}15` }
            ]}>
              {session.thumbnail ? (
                <Image
                  source={{ uri: session.thumbnail }}
                  style={tw`w-full h-full`}
                  resizeMode="cover"
                />
              ) : (
                <View style={tw`w-full h-full items-center justify-center`}>
                  <Brain size={24} color={COLORS.primary.purple} />
                </View>
              )}
            </View>

            <View style={tw`flex-1`}>
              <View style={tw`flex-row items-center justify-between mb-1`}>
                <Text style={[
                  tw`text-neutral-900 flex-1 text-sm`,
                  { fontFamily: 'Poppins-SemiBold' }
                ]}>
                  {session.title}
                </Text>
                {status !== 'new' && (
                  <View style={[
                    tw`px-2 py-0.5 rounded-full`,
                    { backgroundColor: `${statusConfig[status].color}15` }
                  ]}>
                    <Text style={[
                      tw`text-xs`,
                      { fontFamily: 'Poppins-Medium', color: statusConfig[status].color }
                    ]}>
                      {statusConfig[status].badge}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[
                tw`text-neutral-600 text-xs mb-2`,
                { fontFamily: 'Poppins-Regular' }
              ]}>
                {session.instructor}
              </Text>

              {/* Progress Bar */}
              {session.progress > 0 && (
                <View style={tw`mb-2`}>
                  <View style={tw`h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-0.5`}>
                    <View
                      style={[
                        tw`h-full rounded-full`,
                        {
                          width: `${session.progress}%`,
                          backgroundColor: COLORS.primary.purple
                        }
                      ]}
                    />
                  </View>
                  <Text style={[
                    tw`text-xs`,
                    { fontFamily: 'Poppins-Medium', color: COLORS.neutral[500] }
                  ]}>
                    {Math.round(session.progress)}% complete
                  </Text>
                </View>
              )}

              <View style={tw`flex-row items-center`}>
                <Text style={[
                  tw`text-neutral-500 text-xs`,
                  { fontFamily: 'Poppins-Regular' }
                ]}>
                  {session.duration || '15'} mins
                </Text>
                <Text style={[
                  tw`text-neutral-500 text-xs mx-2`,
                  { fontFamily: 'Poppins-Regular' }
                ]}>
                  •
                </Text>
                <Text style={[
                  tw`text-neutral-500 text-xs`,
                  { fontFamily: 'Poppins-Regular' }
                ]}>
                  {session.participants || '0'} completed
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={tw`ml-2`}
              activeOpacity={0.7}
              onPress={() => router.push(`/wellness/retreat/${session._id}`)}
              disabled={status === 'completed'}
            >
              <View style={[
                tw`px-3 py-2 rounded-lg min-w-20 items-center justify-center`,
                { backgroundColor: statusConfig[status].color }
              ]}>
                <Text style={[
                  tw`text-white text-xs font-medium`,
                  { fontFamily: 'Poppins-Medium' }
                ]}>
                  {statusConfig[status].text}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function WellnessScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('journal');
  const [journalText, setJournalText] = useState('');
  const [moodValue, setMoodValue] = useState(50);
  const [isDraggingMood, setIsDraggingMood] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [refreshing, setRefreshing] = useState(false);
  const saveButtonScale = useSharedValue(1);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // ✅ REDUX STATE
  const dispatch = useDispatch();
  const { todayJournal, retreats, loading } = useSelector((s) => s.wellness);
  const { token, user } = useSelector((s) => s.auth);
  const fullName = user?.profile?.fullName;
  const firstName = fullName?.split(" ")[0];

  // Get greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // ✅ LOAD DATA
  useEffect(() => {

    if (!token) return;

    dispatch(fetchTodayJournal(token));
    dispatch(fetchRetreats(token));

    const loadLastTab = async () => {
      try {
        const lastTab = await SecureStore.getItemAsync(STORAGE_KEYS.LAST_TAB);
        if (lastTab) {
          setActiveTab(lastTab);
        }
      } catch (error) {
        console.log('Error loading last tab from SecureStore:', error);
      }
    };
    loadLastTab();
  }, []);

  // ✅ HYDRATE JOURNAL TEXT & MOOD
  useEffect(() => {
    if (!todayJournal) return;

    setJournalText(todayJournal.text ?? '');

    // ⭐ hydrate dial from backend
    if (typeof todayJournal.moodValue === "number") {
      setMoodValue(todayJournal.moodValue);
    }
  }, [todayJournal]);

  // ✅ HANDLE TAB PRESS WITH PERSISTENCE
  const handleTabPress = async (tab) => {
    setActiveTab(tab);
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.LAST_TAB, tab, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED
      });
    } catch (error) {
      console.log('Error saving last tab to SecureStore:', error);
    }
  };

  // ✅ HANDLE MOOD VALUE CHANGE
  const handleMoodValueChange = useCallback((value) => {
    setMoodValue(value);
  }, []);

  // ✅ CHECK IF FORM IS DIRTY
  const isDirty =
    journalText !== (todayJournal?.text || '') ||
    moodValue !== (todayJournal?.moodValue || 75);

  const getMoodScore = (value) => {
    if (value >= 80) return 4;
    if (value >= 60) return 3;
    if (value >= 40) return 2;
    return 1;
  };

  // ✅ SAVE JOURNAL HANDLER
  const handleSaveJournal = async () => {
    if (!isDirty) {
      return;
    }

    if (!journalText.trim() && moodValue === 75) {
      return;
    }

    setSaveStatus('saving');

    const getMoodLabel = (value) => {
      if (value >= 80) return "great";
      if (value >= 60) return "good";
      if (value >= 40) return "okay";
      if (value >= 20) return "low";
      return "very low";
    };

    try {
      await dispatch(
        saveJournal({
          payload: {
            text: journalText,
            moodValue: moodValue,   // ⭐ EXACT NUMBER SENT
            mood: {
              label: getMoodLabel(moodValue),
              score: getMoodScore(moodValue)
            }
          },
          token,
        })
      ).unwrap();

      setSaveStatus('saved');
      setShowSavedToast(true);

      saveButtonScale.value = withSequence(
        withTiming(1.1, { duration: 100 }),
        withSpring(1, { damping: 15 })
      );

      setTimeout(() => {
        setShowSavedToast(false);
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.log('Error saving journal:', error);
      setSaveStatus('idle');
    }
  };

  // ✅ REFRESH HANDLER
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchTodayJournal(token)),
        dispatch(fetchRetreats(token))
      ]);
    } catch (error) {
      console.log('Refresh error:', error);
    }
    setRefreshing(false);
  };

  // ✅ AFFIRMATIONS
  const dailyAffirmations = [
    { text: "I am strong, capable, and worthy of all the good things life has to offer.", author: "Mindful Wisdom" },
    { text: "Today I choose peace over perfection. I am exactly where I need to be.", author: "Inner Peace" },
    { text: "My mind is clear, my heart is open, and my spirit is at ease.", author: "Daily Gratitude" },
    { text: "I release what I cannot control and focus on what brings me joy.", author: "Letting Go" },
    { text: "I am resilient, adaptable, and growing every day.", author: "Growth Mindset" }
  ];

  const getDailyAffirmation = () => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    return dailyAffirmations[dayOfYear % dailyAffirmations.length];
  };

  const affirmation = getDailyAffirmation();

  // ✅ TIMESTAMP FORMAT
  const getSavedTimestamp = () => {
    if (!todayJournal?.updatedAt) return null;

    const date = new Date(todayJournal.updatedAt);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Animated save button style
  const saveButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveButtonScale.value }],
  }));

  const renderJournalTab = () => (
    <>
      {/* Daily Check-In Header */}
      <Animated.View entering={FadeInUp.duration(300)}>
        <View
          style={[
            tw`rounded-xl p-5 mb-4`,
            { backgroundColor: COLORS.primary.purple }
          ]}
        >
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center`}>
              <View style={tw`w-10 h-10 items-center justify-center mr-3`}>
                <Heart size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={[tw`text-white text-lg mb-0.5`, { fontFamily: 'Poppins-Bold' }]}>
                  Daily Check-In
                </Text>
                <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
                  How are you feeling today, {user?.firstName || 'friend'}?
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Mood Dial */}
      <MoodDial
        value={moodValue}
        onValueChange={handleMoodValueChange}
        isDragging={isDraggingMood}
        setIsDraggingMood={setIsDraggingMood}
      />

      {/* Journal Entry */}
      <Animated.View
        entering={FadeInUp.delay(200).duration(300)}
        style={[
          tw`bg-white rounded-xl p-4 mb-4`,
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 3,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.05)',
          }
        ]}
      >
        <View style={tw`flex-row justify-between items-center mb-4`}>
          <View style={tw`flex-row items-center`}>
            <View style={[
              tw`w-8 h-8 items-center justify-center mr-2`
            ]}>
              <Feather size={16} color={COLORS.primary.purple} />
            </View>
            <View>
              <Text style={[tw`text-neutral-900 text-base`, { fontFamily: 'Poppins-SemiBold' }]}>
                Today's Reflection
              </Text>
              {todayJournal?.updatedAt && (
                <Text style={[tw`text-primary-700 text-xs mt-0.5`, { fontFamily: 'Poppins-Medium' }]}>
                  Last saved: {getSavedTimestamp()}
                </Text>
              )}
            </View>
          </View>
        </View>

        <TextInput
          style={[
            tw`bg-neutral-50 rounded-lg px-3 py-3 text-neutral-800 h-40 mb-4`,
            {
              fontFamily: 'Poppins-Regular',
              textAlignVertical: 'top',
              fontSize: 14,
              lineHeight: 20,
            }
          ]}
          placeholder="Write your thoughts, gratitude, or feelings here..."
          placeholderTextColor={COLORS.neutral[400]}
          multiline
          value={journalText}
          onChangeText={setJournalText}
        />

        {/* Save Button */}
        <Animated.View style={saveButtonStyle}>
          <TouchableOpacity
            style={[
              tw`rounded-lg overflow-hidden`,
              saveStatus === 'saving' && tw`opacity-80`,
              !isDirty && tw`opacity-60`
            ]}
            activeOpacity={0.8}
            onPress={handleSaveJournal}
            disabled={saveStatus === 'saving' || !isDirty}
          >
            <View
              style={[
                tw`py-3 items-center flex-row justify-center`,
                saveStatus === 'saved' ?
                  { backgroundColor: COLORS.success } :
                  isDirty ?
                    { backgroundColor: COLORS.primary.purple } :
                    { backgroundColor: COLORS.neutral[400] }
              ]}
            >
              {saveStatus === 'saving' ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" style={tw`mr-2`} />
                  <Text style={[tw`text-white text-base`, { fontFamily: 'Poppins-SemiBold' }]}>
                    Saving...
                  </Text>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <Check size={18} color="#FFFFFF" style={tw`mr-2`} />
                  <Text style={[tw`text-white text-base`, { fontFamily: 'Poppins-SemiBold' }]}>
                    Saved
                  </Text>
                </>
              ) : (
                <>
                  <Save size={18} color="#FFFFFF" style={tw`mr-2`} />
                  <Text style={[tw`text-white text-base`, { fontFamily: 'Poppins-SemiBold' }]}>
                    {isDirty ? 'Save Entry' : 'No Changes'}
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Saved Toast */}
        {showSavedToast && (
          <Animated.View
            entering={SlideInDown.duration(200)}
            exiting={FadeInDown.duration(200)}
            style={[
              tw`absolute top-4 right-4 bg-success px-3 py-2 rounded-lg flex-row items-center`,
              {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }
            ]}
          >
            <Check size={14} color="#FFFFFF" style={tw`mr-1.5`} />
            <Text style={[tw`text-white text-xs`, { fontFamily: 'Poppins-Medium' }]}>
              Saved successfully
            </Text>
          </Animated.View>
        )}
      </Animated.View>
      {/* Daily Affirmation */}
      <Animated.View entering={FadeInUp.delay(300).duration(300)}>
        <View
          style={[
            tw`bg-white rounded-xl p-4 mb-4`,
            {
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.05)',
            }
          ]}
        >
          <View style={tw`flex-row items-start`}>

            {/* Text */}
            <View style={tw`flex-1 mr-3`}>
              <Text
                style={[
                  tw`text-sm mb-1`,
                  { fontFamily: 'Poppins-SemiBold', color: COLORS.primary.purple }
                ]}
              >
                Daily Affirmation
              </Text>

              <Text
                style={[
                  tw`text-sm leading-5 mb-1`,
                  { fontFamily: 'Poppins-Regular', color: COLORS.neutral[800] }
                ]}
              >
                "{affirmation.text}"
              </Text>

              <Text
                style={[
                  tw`text-xs`,
                  { fontFamily: 'Poppins-Regular', color: COLORS.neutral[500] }
                ]}
              >
                — {affirmation.author}
              </Text>
            </View>

          </View>
        </View>
      </Animated.View>

    </>
  );

  const renderVirtualTab = () => {
    if (loading) {
      return (
        <View style={tw`mt-4`}>
          {[1, 2].map((i) => (
            <View key={i} style={tw`bg-white rounded-xl p-4 mb-3`}>
              <View style={tw`flex-row items-center`}>
                <View style={tw`w-14 h-14 bg-neutral-200 rounded-lg mr-3`} />
                <View style={tw`flex-1`}>
                  <View style={tw`h-4 bg-neutral-200 rounded w-3/4 mb-2`} />
                  <View style={tw`h-3 bg-neutral-200 rounded w-1/2 mb-3`} />
                  <View style={tw`h-2 bg-neutral-200 rounded w-1/4`} />
                </View>
                <View style={tw`w-20 h-8 bg-neutral-200 rounded-lg`} />
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (!retreats || retreats.length === 0) {
      return (
        <View style={tw`items-center justify-center mt-8`}>
          <View style={[
            tw`w-20 h-20 rounded-full items-center justify-center mb-4`,
            { backgroundColor: `${COLORS.primary.purple}15` }
          ]}>
            <Brain size={32} color={COLORS.primary.purple} />
          </View>
          <Text style={[
            tw`text-neutral-900 text-lg mb-2`,
            { fontFamily: 'Poppins-SemiBold' }
          ]}>
            No sessions yet
          </Text>
          <Text style={[
            tw`text-neutral-600 text-center px-8 mb-4`,
            { fontFamily: 'Poppins-Regular' }
          ]}>
            Check back later for new wellness sessions
          </Text>
          <TouchableOpacity
            style={[
              tw`px-4 py-2 rounded-lg`,
              {
                backgroundColor: `${COLORS.primary.purple}15`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.purple}30`
              }
            ]}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <Text style={[
              tw`text-sm`,
              {
                fontFamily: 'Poppins-Medium',
                color: COLORS.primary.purple
              }
            ]}>
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    const completedToday = retreats.filter(r => r.progress >= 100).length;
    const totalSessions = retreats.length;

    return (
      <>
        <Animated.View entering={FadeInUp.duration(300)}>
          <View
            style={[
              tw`rounded-xl p-5 mb-4`,
              { backgroundColor: COLORS.primary.purple }
            ]}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <View>
                <Text style={[tw`text-white text-lg mb-1`, { fontFamily: 'Poppins-Bold' }]}>
                  Virtual Retreats
                </Text>
                <Text style={[tw`text-white/90 text-sm mb-3`, { fontFamily: 'Poppins-Regular' }]}>
                  {completedToday} completed • {totalSessions} total
                </Text>
              </View>
              <View style={tw`w-10 h-10 items-center justify-center`}>
                <Brain size={20} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={tw`mb-6`}>
          {retreats.map((session, index) => (
            <VirtualSessionCard
              key={`session-${session._id || index}`}
              session={session}
              router={router}
            />
          ))}
        </View>

        {/* Quick Actions */}
        {/* <Animated.View entering={FadeInUp.delay(200).duration(300)}>
          <Text style={[
            tw`text-neutral-900 text-base mb-3`,
            { fontFamily: 'Poppins-SemiBold' }
          ]}>
            Quick Start
          </Text>
          <View style={tw`flex-row mb-6`}>
            <View style={tw`w-1/2 pr-1.5`}>
              <TouchableOpacity
                style={[
                  tw`bg-white rounded-lg p-4 items-center`,
                  {
                    borderWidth: 1,
                    borderColor: 'rgba(0,0,0,0.05)',
                  }
                ]}
                activeOpacity={0.7}
              >
                <View style={tw`w-10 h-10 bg-amber-100 rounded-full items-center justify-center mb-2`}>
                  <Sun size={20} color="#F59E0B" />
                </View>
                <Text style={[
                  tw`text-neutral-900 text-sm mb-0.5`,
                  { fontFamily: 'Poppins-Medium' }
                ]}>
                  Morning
                </Text>
                <Text style={[
                  tw`text-neutral-500 text-xs text-center`,
                  { fontFamily: 'Poppins-Regular' }
                ]}>
                  15 min
                </Text>
              </TouchableOpacity>
            </View>
            <View style={tw`w-1/2 pl-1.5`}>
              <TouchableOpacity
                style={[
                  tw`bg-white rounded-lg p-4 items-center`,
                  {
                    borderWidth: 1,
                    borderColor: 'rgba(0,0,0,0.05)',
                  }
                ]}
                activeOpacity={0.7}
              >
                <View style={tw`w-10 h-10 bg-blue-100 rounded-full items-center justify-center mb-2`}>
                  <Moon size={20} color="#3B82F6" />
                </View>
                <Text style={[
                  tw`text-neutral-900 text-sm mb-0.5`,
                  { fontFamily: 'Poppins-Medium' }
                ]}>
                  Evening
                </Text>
                <Text style={[
                  tw`text-neutral-500 text-xs text-center`,
                  { fontFamily: 'Poppins-Regular' }
                ]}>
                  20 min
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View> */}
      </>
    );
  };

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: '#FAFAFA' }]}>
      <View style={tw`flex-1 bg-neutral-50`}>
        {/* Header with Increased Height and Curved Border Radius */}
        <View
          style={[
            tw`px-4`,
            {
              backgroundColor: COLORS.primary.purple,
              minHeight: 170,
              paddingTop: 40,      // pushes content DOWN
              paddingBottom: 20,
              borderBottomLeftRadius: 30,
              borderBottomRightRadius: 30,
              justifyContent: "center", // vertical centering
            }
          ]}
        >

          <View style={tw`flex-row items-center justify-between`}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center`,
                { backgroundColor: 'rgba(255,255,255,0.15)' }
              ]}
              activeOpacity={0.7}
            >
              <ChevronLeft color="#FFFFFF" size={20} />
            </TouchableOpacity>

            <View style={tw`flex-1 mx-6`}>
              <Text
                numberOfLines={1}
                style={[
                  tw`text-white text-xl mb-1`,
                  { fontFamily: 'Poppins-Bold' }
                ]}
              >
                {firstName
                  ? `${getGreeting()}, ${firstName}!`
                  : "Wellness"}
              </Text>
              <Text style={[
                tw`text-white/90 text-md`,
                { fontFamily: 'Poppins-Regular' }
              ]}>
                Mind, body & spirit
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/wellness/stepwall")}
              activeOpacity={0.8}
            >
              <View
                style={[
                  tw`w-10 h-10 rounded-full items-center justify-center`,
                  { backgroundColor: 'rgba(255,255,255,0.2)' }
                ]}
              >
                <Activity color="#FFFFFF" size={18} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation */}
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[tw`mx-4 mt-4 mb-3`, { marginTop: -20 }]} // Adjusted margin to overlap with header
        >
          <View style={[
            tw`flex-row rounded-lg p-1`,
            {
              backgroundColor: COLORS.neutral[100],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }
          ]}>
            <TabButton
              label="Journal"
              value="journal"
              activeTab={activeTab}
              onPress={handleTabPress}
              icon={Heart}
            />
            <TabButton
              label="Retreats"
              value="virtual"
              activeTab={activeTab}
              onPress={handleTabPress}
              icon={Brain}
            />
          </View>
        </Animated.View>

        <ScrollView
          style={tw`flex-1`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary.purple]}
              tintColor={COLORS.primary.purple}
            />
          }
        >
          <View style={tw`px-4 pb-6 pt-1`}>
            {activeTab === 'journal' && renderJournalTab()}
            {activeTab === 'virtual' && renderVirtualTab()}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}