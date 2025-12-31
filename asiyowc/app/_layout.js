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

  /* Restore token ONCE */
  useEffect(() => {
    dispatch(restoreToken()).finally(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, []);

  /* Fetch user when token exists */
  useEffect(() => {
    if (appLoaded && token) {
      dispatch(fetchAuthenticatedUser());
      
    }
  }, [appLoaded, token]);

  /* 🔒 AUTH GUARD */
  useEffect(() => {
    if (!appLoaded) return;

    const inAuth = segments[0] === "(auth)";

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
