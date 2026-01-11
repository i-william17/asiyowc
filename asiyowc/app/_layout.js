// app/_layout.js
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { Provider, useDispatch, useSelector } from "react-redux";
import { store } from "../store/store";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "../context/ThemeContext";
import { AnimationProvider } from "../context/AnimationContext";
import { AuthProvider } from "../context/AuthContext";

import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "../hooks/useFonts";

import { restoreToken, fetchAuthenticatedUser } from "../store/slices/authSlice";
import useCommunitySocket from "../hooks/useCommunitySocket";

import { Audio } from "expo-av";

SplashScreen.preventAutoHideAsync().catch(() => {});

/* ============================================================
   APP SHELL (SAFE TO USE REDUX HERE)
============================================================ */
function AppShell() {
  const dispatch = useDispatch();
  const router = useRouter();
  const segments = useSegments();

  const { token, appLoaded } = useSelector((state) => state.auth);
  const { fontsLoaded } = useFonts();

  useCommunitySocket();

  /* ================= GLOBAL AUDIO MODE (SET ONCE) ================= */
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    }).catch((e) => {
      console.warn("Global audio mode error:", e);
    });
  }, []);

  /* ================= RESTORE TOKEN ================= */
  useEffect(() => {
    dispatch(restoreToken()).finally(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, []);

  /* ================= FETCH AUTHENTICATED USER ================= */
  useEffect(() => {
    if (appLoaded && token) {
      dispatch(fetchAuthenticatedUser());
    }
  }, [appLoaded, token]);

  /* ================= AUTH GUARD (OPTIONAL) ================= */
  useEffect(() => {
    if (!appLoaded) return;

    const inAuth = segments[0] === "(auth)";

    // Uncomment if you want strict auth routing
    // if (!token && !inAuth) {
    //   router.replace("/(auth)/login");
    // }

    // if (token && inAuth) {
    //   router.replace("/(tabs)");
    // }
  }, [token, appLoaded, segments]);

  if (!fontsLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="modals" />
    </Stack>
  );
}

/* ============================================================
   ROOT LAYOUT
============================================================ */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <ThemeProvider>
            <AnimationProvider>
              <AuthProvider>
                <AppShell />
              </AuthProvider>
            </AnimationProvider>
          </ThemeProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
