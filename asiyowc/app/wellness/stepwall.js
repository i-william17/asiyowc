import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  Platform,
  Image,
  AppState,
  Linking,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgLG, Stop } from "react-native-svg";
import { ChevronLeft, Share2, X, Download } from "lucide-react-native";
import * as Sharing from 'expo-sharing';
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

import tw from "../../utils/tw";

// Safe conditional imports for web compatibility
let captureRef = null;
if (Platform.OS !== "web") {
  captureRef = require("react-native-view-shot").captureRef;
}

// Web-safe Pedometer import
let Pedometer = null;
let requestPermissionsAsync = null;
let Accelerometer = null;

if (Platform.OS !== "web") {
  const sensors = require("expo-sensors");
  Pedometer = sensors.Pedometer;
  requestPermissionsAsync = sensors.requestPermissionsAsync;
  Accelerometer = sensors.Accelerometer;
}

// Web-safe LinearGradient import
let LinearGradient = View;
try {
  LinearGradient = require("expo-linear-gradient").LinearGradient || View;
} catch (e) {
  LinearGradient = View;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/* =====================================================
   HELPERS
===================================================== */
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const format = (n) => new Intl.NumberFormat().format(n);
const getDayOfWeek = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};
const getFormattedDate = () => {
  const date = new Date();
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

/* =====================================================
   PERMISSION MODAL COMPONENT
===================================================== */
function PermissionModal({ visible, onClose, onOpenSettings }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={tw`flex-1 bg-black/50 justify-center items-center px-6`}>
        <View style={tw`bg-white w-full rounded-3xl p-6 shadow-xl`}>

          {/* Header */}
          <Text
            style={[
              tw`text-lg text-center text-[#6A1B9A] mb-3`,
              { fontFamily: "Poppins-Bold" }
            ]}
          >
            Motion & Fitness Permission Needed
          </Text>

          {/* Description */}
          <Text
            style={[
              tw`text-gray-600 text-center text-sm mb-6`,
              { fontFamily: "Poppins-Regular" }
            ]}
          >
            StepWall needs access to your device sensors to track your daily steps accurately.
          </Text>

          {/* Buttons */}
          <View style={tw`flex-row justify-between`}>

            {/* Cancel */}
            <TouchableOpacity
              onPress={onClose}
              style={tw`flex-1 mr-3 py-3 rounded-2xl bg-gray-100 items-center`}
            >
              <Text style={{ fontFamily: "Poppins-SemiBold", color: "#555" }}>
                Cancel
              </Text>
            </TouchableOpacity>

            {/* Settings */}
            <TouchableOpacity
              onPress={onOpenSettings}
              style={tw`flex-1 py-3 rounded-2xl bg-[#6A1B9A] items-center`}
            >
              <Text style={{ fontFamily: "Poppins-SemiBold", color: "#fff" }}>
                Open Settings
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </View>
    </Modal>
  );
}

/* =====================================================
   SHARE MODAL CONTENT
===================================================== */
function ShareModalContent({ 
  steps, 
  goal, 
  calories, 
  distanceKm, 
  progress, 
  onClose,
  viewRef 
}) {
  const date = getFormattedDate();
  const dayOfWeek = getDayOfWeek();
  
  const PREVIEW_SIZE = screenWidth - 24;
  const EXPORT_SIZE = 1080;
  const scale = PREVIEW_SIZE / EXPORT_SIZE;

  const handleExportImage = async () => {
    try {
      if (!captureRef) {
        console.log('Screenshot capture not available');
        return;
      }
      
      const uri = await captureRef(viewRef, {
        format: 'jpg',
        quality: 1.0,
        result: 'tmpfile',
        width: EXPORT_SIZE,
        height: EXPORT_SIZE,
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Share Your Achievement',
          UTI: 'image/jpeg'
        });
      } else {
        console.log('Sharing not available');
      }
    } catch (error) {
      console.log('Error capturing image:', error);
    }
  };

  return (
    <View style={tw`flex-1 bg-[#0F0B1F]`}>
      {/* Modal Header */}
      <View style={tw`flex-row justify-between items-center px-6 pt-12 pb-4 border-b border-gray-800`}>
        <View style={tw`flex-row items-center`}>
          <View style={tw`w-3 h-8 bg-[#6A1B9A] rounded-full mr-3`} />
          <Text style={[tw`text-white text-xl`, { fontFamily: "Poppins-Bold" }]}>
            Move of the Day
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={tw`p-2`}>
          <X color="#FFF" size={24} />
        </TouchableOpacity>
      </View>

      {/* Content to be captured as image */}
      <View style={tw`flex-1 items-center justify-center px-4`}>
        <View
          ref={viewRef}
          collapsable={false}
          style={{
            width: EXPORT_SIZE,
            height: EXPORT_SIZE,
            padding: 48,
            backgroundColor: "#0F0B1F",
            justifyContent: "center",
            transform: [{ scale }],
            borderRadius: 24,
            overflow: "hidden",
          }}
        >
          {/* Header with logo */}
          <View style={tw`items-center mb-8`}>
            <Text style={[tw`text-4xl text-white mb-2`, { fontFamily: "Poppins-Bold" }]}>
              StepWall
            </Text>
            <Text style={[tw`text-gray-400 text-lg`, { fontFamily: "Poppins-Medium" }]}>
              {dayOfWeek} • {date}
            </Text>
          </View>

          {/* Main achievement card */}
          <LinearGradient
            colors={["#1E0B36", "#140A28"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={tw`rounded-3xl p-8 mb-8 shadow-lg`}
          >
            <Text style={[tw`text-center text-gray-300 text-xl mb-6`, { fontFamily: "Poppins-SemiBold" }]}>
              Today's Steps Achievement
            </Text>
            
            {/* Progress ring with steps */}
            <View style={tw`items-center mb-8`}>
              <View style={tw`relative`}>
                <Svg width={280} height={280}>
                  <Defs>
                    <SvgLG id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#6A1B9A" />
                      <Stop offset="100%" stopColor="#8A4CE6" />
                    </SvgLG>
                  </Defs>
                  <Circle
                    cx={140}
                    cy={140}
                    r={125}
                    stroke="#2D2A3F"
                    strokeWidth={30}
                    fill="none"
                  />
                  <Circle
                    cx={140}
                    cy={140}
                    r={125}
                    stroke="url(#grad)"
                    strokeWidth={30}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={785.4}
                    strokeDashoffset={785.4 * (1 - clamp(progress, 0, 1))}
                    transform={`rotate(-90 140 140)`}
                  />
                </Svg>
                
                {/* Center content */}
                <View style={tw`absolute top-0 left-0 right-0 bottom-0 justify-center items-center`}>
                  <Text style={[tw`text-6xl text-white mb-2`, { fontFamily: "Poppins-Bold" }]}>
                    {format(steps)}
                  </Text>
                  <Text style={[tw`text-gray-400 text-lg`, { fontFamily: "Poppins-Medium" }]}>
                    steps completed
                  </Text>
                </View>
              </View>
            </View>

            {/* Goal progress */}
            <View style={tw`bg-[#1A1528] rounded-2xl p-6 mb-6 shadow-sm`}>
              <View style={tw`flex-row justify-between items-center mb-4`}>
                <Text style={[tw`text-gray-300 text-lg`, { fontFamily: "Poppins-SemiBold" }]}>
                  Daily Goal Progress
                </Text>
                <Text style={[tw`text-[#8A4CE6] text-lg`, { fontFamily: "Poppins-Bold" }]}>
                  {Math.round(progress * 100)}%
                </Text>
              </View>
              
              {/* Progress bar */}
              <View style={tw`h-4 bg-[#2D2A3F] rounded-full overflow-hidden mb-2`}>
                <LinearGradient
                  colors={["#6A1B9A", "#8A4CE6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[tw`h-full`, { width: `${Math.min(progress * 100, 100)}%` }]}
                />
              </View>
              
              <View style={tw`flex-row justify-between`}>
                <Text style={[tw`text-gray-500 text-sm`, { fontFamily: "Poppins-Regular" }]}>
                  {format(steps)} steps
                </Text>
                <Text style={[tw`text-gray-500 text-sm`, { fontFamily: "Poppins-Regular" }]}>
                  Goal: {format(goal)} steps
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Stats grid */}
          <View style={tw`flex-row justify-between mb-8`}>
            <LinearGradient
              colors={["#2A1B3D", "#1E0B36"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={tw`p-6 rounded-2xl flex-1 mr-4`}
            >
              <Text style={[tw`text-gray-400 text-sm mb-2`, { fontFamily: "Poppins-Medium" }]}>
                Calories Burned
              </Text>
              <Text style={[tw`text-3xl text-white`, { fontFamily: "Poppins-Bold" }]}>
                {format(calories)}
                <Text style={[tw`text-lg text-gray-400`, { fontFamily: "Poppins-Regular" }]}> kcal</Text>
              </Text>
            </LinearGradient>
            
            <LinearGradient
              colors={["#2A1B3D", "#1E0B36"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={tw`p-6 rounded-2xl flex-1`}
            >
              <Text style={[tw`text-gray-400 text-sm mb-2`, { fontFamily: "Poppins-Medium" }]}>
                Distance Walked
              </Text>
              <Text style={[tw`text-3xl text-white`, { fontFamily: "Poppins-Bold" }]}>
                {distanceKm}
                <Text style={[tw`text-lg text-gray-400`, { fontFamily: "Poppins-Regular" }]}> km</Text>
              </Text>
            </LinearGradient>
          </View>

          {/* Motivation section */}
          <LinearGradient
            colors={["#2A1B3D", "#1E0B36"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={tw`rounded-2xl p-6 mb-8`}
          >
            <Text style={[tw`text-center text-gray-300 text-lg mb-3`, { fontFamily: "Poppins-SemiBold" }]}>
              {progress >= 1 ? "Outstanding Achievement!" : 
              progress >= 0.75 ? "Amazing Progress!" :
              progress >= 0.5 ? "Halfway There!" :
              "Every Step Counts!"}
            </Text>
          </LinearGradient>

          {/* Logo in bottom-left */}
          <View
            style={{
              position: "absolute",
              bottom: 24,
              left: 24,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Image
              source={require("../../assets/images/asiyo-nobg.png")} 
              style={{
                width: 40,
                height: 40,
                marginRight: 8,
                resizeMode: "contain",
              }}
            />
            <Text style={{ color: "#aaa", fontFamily: "Poppins-SemiBold" }}>
              StepWall
            </Text>
          </View>

          {/* Footer */}
          <View style={tw`border-t border-gray-800 pt-6`}>
            <Text style={[tw`text-center text-gray-500 text-sm`, { fontFamily: "Poppins-Regular" }]}>
              Generated with StepWall • Your daily fitness companion
            </Text>
            <Text style={[tw`text-center text-gray-600 text-xs mt-2`, { fontFamily: "Poppins-Regular" }]}>
              {date}
            </Text>
          </View>
        </View>
      </View>

      {/* Export Button */}
      <View style={tw`border-t border-gray-800 p-6 bg-[#0F0B1F]`}>
        <TouchableOpacity 
          onPress={handleExportImage}
        >
          <LinearGradient
            colors={["#6A1B9A", "#8A4CE6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={tw`py-4 rounded-2xl shadow-lg flex-row justify-center items-center`}
          >
            <Download color="#FFF" size={20} style={tw`mr-2`} />
            <Text style={[tw`text-white text-center text-lg`, { fontFamily: "Poppins-SemiBold" }]}>
              Export as Image
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* =====================================================
   PROGRESS RING
===================================================== */
function ProgressRing({ size = 280, stroke = 30, progress, children }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamp(progress, 0, 1));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLG id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#6A1B9A" />
            <Stop offset="100%" stopColor="#8A4CE6" />
          </SvgLG>
        </Defs>

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F0F0F0"
          strokeWidth={stroke}
          fill="none"
        />

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#grad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      
      {/* Center content */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {children}
      </View>
    </View>
  );
}

/* =====================================================
   STAT TILE
===================================================== */
function StatTile({ label, value, unit }) {
  return (
    <View style={tw`flex-1`}>
      <Text style={[tw`text-gray-600 text-sm`, { fontFamily: "Poppins-Regular" }]}>
        {label}
      </Text>

      <View style={tw`flex-row items-end`}>
        <Text style={[tw`text-gray-900 text-3xl`, { fontFamily: "Poppins-SemiBold" }]}>
          {value}
        </Text>

        {unit && (
          <Text style={[tw`text-gray-500 ml-1 mb-1`, { fontFamily: "Poppins-Regular" }]}>
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}

/* =====================================================
   MAIN SCREEN
===================================================== */
export default function WellnessActivityScreen({ onBack, onShare }) {
  // ✅ FIXED: Moved web guard INSIDE component
  if (Platform.OS === "web") {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <Text style={{ fontFamily: "Poppins-SemiBold" }}>
          Step tracking is only available on mobile devices.
        </Text>
      </View>
    );
  }

  const [steps, setSteps] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [motionActive, setMotionActive] = useState(false);
  const shareViewRef = useRef(null);
  const baseRef = useRef(0);
  const accelSub = useRef(null);
  const router = useRouter();

  /* ================================================
     PRODUCTION-GRADE STEP LOADING WITH DATE CHECK
  ================================================= */
  useEffect(() => {
    const loadSavedSteps = async () => {
      try {
        const savedSteps = await SecureStore.getItemAsync("DAILY_STEPS");
        const savedDate = await SecureStore.getItemAsync("DAILY_STEPS_DATE");

        const today = new Date().toDateString();

        if (savedDate !== today) {
          // ✅ NEW DAY → RESET STEPS
          setSteps(0);
          await SecureStore.deleteItemAsync("DAILY_STEPS");
          await SecureStore.setItemAsync("DAILY_STEPS_DATE", today);
          baseRef.current = 0;
        } else if (savedSteps) {
          // ✅ SAME DAY → LOAD SAVED STEPS
          setSteps(Number(savedSteps));
        }
      } catch (e) {
        console.log("SecureStore read failed:", e);
      }
    };

    loadSavedSteps();
  }, []);

  /* ================================================
     REQUEST PERMISSIONS
  ================================================= */
  useEffect(() => {
    const requestSensorPermissions = async () => {
      try {
        if (!Pedometer) return;

        const { status } = await Pedometer.requestPermissionsAsync();

        if (status !== "granted") {
          setPermissionModalVisible(true);
          return;
        }

        setPermissionGranted(true);
      } catch (e) {
        console.log("Permission error:", e);
      }
    };

    requestSensorPermissions();
  }, []);

  /* ================================================
     ACCELEROMETER FALLBACK / MOTION DETECTION
  ================================================= */
  useEffect(() => {
    if (!Accelerometer) return;

    let lastStepTime = 0;
    let accelSteps = 0;

    Accelerometer.setUpdateInterval(300);

    accelSub.current = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      if (magnitude > 1.25 && now - lastStepTime > 350) {
        lastStepTime = now;

        if (!permissionGranted) {
          accelSteps += 1;
          setSteps(accelSteps);
        }

        setMotionActive(true);
      } else {
        setMotionActive(false);
      }
    });

    return () => {
      accelSub.current?.remove();
    };
  }, [permissionGranted]);

  /* ================================================
     SAVE STEPS TO SECURE STORE (WITH DATE)
  ================================================= */
  useEffect(() => {
    const saveStepsAndDate = async () => {
      if (steps === 0) return;
      
      try {
        // ✅ STEP 1: Save current steps
        await SecureStore.setItemAsync("DAILY_STEPS", steps.toString());
        
        // ✅ STEP 2: Always save today's date
        const today = new Date().toDateString();
        await SecureStore.setItemAsync("DAILY_STEPS_DATE", today);
      } catch (e) {
        console.log("Failed to save steps:", e);
      }
    };

    saveStepsAndDate();
  }, [steps]);

  /* ================================================
     TIMER-BASED MIDNIGHT RESET (BACKUP)
  ================================================= */
  useEffect(() => {
    const now = new Date();
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();

    const timer = setTimeout(async () => {
      setSteps(0);
      baseRef.current = 0;

      // ✅ Clear secure storage
      await SecureStore.deleteItemAsync("DAILY_STEPS");
      // ✅ Update date for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await SecureStore.setItemAsync("DAILY_STEPS_DATE", tomorrow.toDateString());
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, []);

  /* ================================================
     REAL SENSOR STEPS (only if permission granted)
  ================================================= */
  useEffect(() => {
    if (!permissionGranted || !Pedometer) return;

    let subscription;
    let interval;

    const initializePedometer = async () => {
      try {
        const isAvailable = await Pedometer.isAvailableAsync();
        if (!isAvailable) {
          console.log('Pedometer not available');
          return;
        }

        if (Platform.OS === 'android') {
          // Android: Watch step count
          subscription = Pedometer.watchStepCount(({ steps }) => {
            if (baseRef.current === 0) baseRef.current = steps;
            const newSteps = Math.max(0, steps - baseRef.current);
            setSteps(newSteps);
          });

        } else {
          // iOS: Get daily step count directly
          const loadDailySteps = async () => {
            const end = new Date();
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            
            try {
              const result = await Pedometer.getStepCountAsync(start, end);
              setSteps(result.steps);
            } catch (error) {
              console.log('Error getting step count on iOS:', error);
            }
          };

          await loadDailySteps();
          interval = setInterval(loadDailySteps, 5000);
        }
      } catch (error) {
        console.log('Error initializing pedometer:', error);
      }
    };

    initializePedometer();

    return () => {
      if (subscription && subscription.remove) {
        subscription.remove();
      }
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [permissionGranted]);

  /* ================================================
     APP STATE CHANGE HANDLER
  ================================================= */
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        const { status } = await Pedometer.getPermissionsAsync();

        if (status === "granted") {
          setPermissionGranted(true);
          setPermissionModalVisible(false);
          
          // ✅ DATE CHECK ON APP RESUME TOO
          const savedDate = await SecureStore.getItemAsync("DAILY_STEPS_DATE");
          const today = new Date().toDateString();
          
          if (savedDate !== today) {
            setSteps(0);
            await SecureStore.deleteItemAsync("DAILY_STEPS");
            await SecureStore.setItemAsync("DAILY_STEPS_DATE", today);
            baseRef.current = 0;
          }
        }
      }
    });

    return () => sub.remove();
  }, []);

  /* ================================================
     OPEN SETTINGS HELPER FUNCTION
  ================================================= */
  const openSettings = () => {
    setPermissionModalVisible(false);
    Linking.openSettings();
  };

  /* ================================================
     DERIVED METRICS
  ================================================= */
  const goal = 8000;
  const progress = Math.min(steps / goal, 1);
  const distanceKm = (steps * 0.00075).toFixed(2);
  const calories = Math.round(steps * 0.04);

  /* ================================================
     UI
  ================================================= */
  return (
    <View style={[tw`flex-1`, { backgroundColor: "#FFFFFF" }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-8`}>

        {/* HEADER */}
        <View style={tw`flex-row justify-between items-center px-5 pt-12`}>
          <TouchableOpacity onPress={() => router.back()} style={tw`bg-gray-100 p-3 rounded-full`}>
            <ChevronLeft color="#666" />
          </TouchableOpacity>

          <Text
            style={[
              tw`text-gray-900 text-lg`,
              { fontFamily: "Poppins-SemiBold" }
            ]}
          >
            Today
          </Text>

          <TouchableOpacity 
            onPress={() => setShowShareModal(true)} 
            style={tw`bg-gray-100 p-3 rounded-full`}
          >
            <Share2 color="#666" />
          </TouchableOpacity>
        </View>

        {/* PERMISSION STATUS */}
        {!permissionGranted && (
          <View style={tw`mx-6 mt-4 p-4 bg-yellow-50 rounded-2xl`}>
            <Text style={[tw`text-yellow-800 text-center`, { fontFamily: "Poppins-Medium" }]}>
              Step tracking permission required. Please grant permission to track your steps.
            </Text>
          </View>
        )}

        {/* BIG RING WITH CENTERED CONTENT */}
        <View style={tw`items-center mt-16`}>
          <ProgressRing progress={progress}>
            <View style={tw`items-center`}>
              <Text style={[tw`text-gray-600 text-base mb-2`, { fontFamily: "Poppins-Regular" }]}>
                Steps
              </Text>

              <Text
                style={[
                  tw`text-gray-900 text-6xl mb-1`,
                  { fontFamily: "Poppins-Bold" }
                ]}
              >
                {format(steps)}
              </Text>

              {motionActive && (
                <Text style={{ fontSize: 12, color: "#6A1B9A", fontFamily: "Poppins-Medium" }}>
                  detecting motion…
                </Text>
              )}

              <View style={tw`flex-row items-center mt-2`}>
                <View style={tw`w-3 h-3 rounded-full bg-green-500 mr-2`} />
                <Text style={[tw`text-gray-500 text-sm`, { fontFamily: "Poppins-Regular" }]}>
                  Goal: <Text style={[tw`text-gray-700`, { fontFamily: "Poppins-SemiBold" }]}>{format(goal)}</Text>
                </Text>
              </View>
              
              <Text style={[tw`text-gray-400 text-xs mt-4`, { fontFamily: "Poppins-Medium" }]}>
                {Math.round(progress * 100)}% Complete
              </Text>
            </View>
          </ProgressRing>
        </View>

        {/* STATS CARD */}
        <LinearGradient
          colors={["#faf5ff", "#fefce8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={tw`mx-6 mt-14 p-6 rounded-3xl shadow-lg`}
        >
          <Text style={[tw`text-gray-700 text-lg mb-4`, { fontFamily: "Poppins-SemiBold" }]}>
            Today's Activity
          </Text>
          
          <View style={tw`flex-row`}>
            <StatTile label="Calories" value={format(calories)} unit="kcal" />
            <View style={tw`w-6`} />
            <StatTile label="Distance" value={distanceKm} unit="km" />
          </View>
        </LinearGradient>

        {/* PROGRESS DETAILS */}
        <View style={tw`mx-6 mt-10 p-5 bg-gray-50 rounded-2xl`}>
          <Text
            style={[
              tw`text-center text-gray-700 text-base mb-4`,
              { fontFamily: "Poppins-Medium" }
            ]}
          >
            {progress >= 1 ? "Goal achieved! Amazing work!" : 
             progress >= 0.75 ? "Almost there! You're doing great!" :
             progress >= 0.5 ? "Halfway to your goal! Keep going!" :
             "Keep moving. Small steps matter."}
          </Text>
        </View>

        {/* MOTIVATIONAL QUOTE */}
        <LinearGradient
          colors={["#eff6ff", "#faf5ff"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={tw`mx-6 mt-8 p-5 rounded-2xl`}
        >
          <Text style={[tw`text-gray-600 text-sm mb-1`, { fontFamily: "Poppins-Italic" }]}>
            "Every step is progress. Every movement matters."
          </Text>
          <Text style={[tw`text-gray-500 text-xs`, { fontFamily: "Poppins-Regular" }]}>
            – Wellness Proverb
          </Text>
        </LinearGradient>

      </ScrollView>

      {/* SHARE MODAL */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <ShareModalContent
          steps={steps}
          goal={goal}
          calories={calories}
          distanceKm={distanceKm}
          progress={progress}
          onClose={() => setShowShareModal(false)}
          viewRef={shareViewRef}
        />
      </Modal>

      {/* PERMISSION MODAL */}
      <PermissionModal
        visible={permissionModalVisible}
        onClose={() => setPermissionModalVisible(false)}
        onOpenSettings={openSettings}
      />
    </View>
  );
}
