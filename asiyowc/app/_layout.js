// app/_layout.js
import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { Provider, useDispatch, useSelector } from "react-redux";
import { store, persistor } from "../store/store";
import { PersistGate } from "redux-persist/integration/react";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform } from "react-native";

import { ThemeProvider } from "../context/ThemeContext";
import { AnimationProvider } from "../context/AnimationContext";
import { AuthProvider } from "../context/AuthContext";

import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import { useFonts } from "../hooks/useFonts";

import {
  restoreToken,
  fetchAuthenticatedUser,
} from "../store/slices/authSlice";

import useCommunitySocket from "../hooks/useCommunitySocket";
import { Audio } from "expo-av";

import { server } from "../server"; // ✅ IMPORT YOUR BACKEND URL

SplashScreen.preventAutoHideAsync().catch(() => { });

/* ================= GLOBAL NOTIFICATION BEHAVIOR ================= */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/* ============================================================
   APP SHELL
============================================================ */
function AppShell() {
  const dispatch = useDispatch();
  const router = useRouter();

  const { token, appLoaded } = useSelector((state) => state.auth);
  const { fontsLoaded } = useFonts();

  useCommunitySocket();

  /* ================= GLOBAL AUDIO MODE ================= */
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn("Global audio mode error:", e);
      }
    })();
  }, []);

  /* ================= RESTORE TOKEN ================= */
  useEffect(() => {
    (async () => {
      try {
        const result = await dispatch(restoreToken()).unwrap();
        const { token } = result;

        if (!token) {
          router.replace("/onboarding");
          return;
        }

        router.replace("/(tabs)");
      } catch (e) {
        router.replace("/onboarding");
      } finally {
        SplashScreen.hideAsync().catch(() => { });
      }
    })();
  }, []);

  /* ================= FETCH AUTHENTICATED USER ================= */
  useEffect(() => {
    if (appLoaded && token) {
      dispatch(fetchAuthenticatedUser());
    }
  }, [appLoaded, token]);

  /* ================= REGISTER FOR PUSH ================= */
  useEffect(() => {
    if (!token) return;

    const registerForPush = async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          console.log("❌ Push permission not granted");
          return;
        }

        // ✅ Expo Go + Build safe token retrieval (fallback)
        let pushToken = null;

        try {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId;

          if (projectId) {
            pushToken = (
              await Notifications.getExpoPushTokenAsync({ projectId })
            ).data;
          } else {
            // Expo Go fallback
            pushToken = (await Notifications.getExpoPushTokenAsync()).data;
          }
        } catch (err) {
          console.warn("❌ Push token generation failed:", err);
          return;
        }

        if (!pushToken) return;

        console.log("📱 Expo Push Token:", pushToken);

        // ✅ Send token to backend
        await fetch(`${server}/auth/save-push-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            token: pushToken,
            platform: Platform.OS,
          }),
        });
      } catch (e) {
        console.warn("Push registration error:", e);
      }
    };

    registerForPush();
  }, [token]);

  /* ================= HANDLE NOTIFICATION TAP ================= */
  useEffect(() => {
    const handleNotification = (response) => {
      const data = response?.notification?.request?.content?.data || {};
      if (!data) return;

      // PROGRAM
      if (data?.type === "program" && data?.programId) {
        router.push(`/programs/${data.programId}`);
        return;
      }

      // POST
      if (data?.type === "post" && data?.postId) {
        router.push(`/feed/${data.postId}`);
        return;
      }

      // SAVINGS
      if (data?.type === "savings" && data?.podId) {
        router.push(`/savings/${data.podId}`);
        return;
      }

      // COMMUNITY
      if (data?.type === "community") {
        if (data?.chatId) {
          router.push(`/community/chat/${data.chatId}`);
          return;
        }
        if (data?.groupId) {
          router.push(`/community/groups/${data.groupId}`);
          return;
        }
        if (data?.voiceId) {
          router.push(`/community/voices/${data.voiceId}`);
          return;
        }
        if (data?.hubId) {
          router.push(`/community/hubs/${data.hubId}`);
          return;
        }

        router.push("/(tabs)/community");
        return;
      }

      router.push("/(tabs)");
    };

    // ✅ Web guard (expo-notifications tap APIs are native-only)
    if (Platform.OS !== "web") {
      // Cold start (native only)
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response) handleNotification(response);
        })
        .catch(() => { });

      // Foreground/background taps (native only)
      const sub = Notifications.addNotificationResponseReceivedListener(
        handleNotification
      );

      return () => sub.remove();
    }

    // ✅ Web: do nothing
    return undefined;
  }, []);

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
          <PersistGate loading={null} persistor={persistor}>
            <ThemeProvider>
              <AnimationProvider>
                <AuthProvider>
                  <AppShell />
                </AuthProvider>
              </AnimationProvider>
            </ThemeProvider>
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}