// app/_layout.js
import React, { useEffect, useState } from "react";
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

import { server } from "../server";

import InAppNotificationBanner from "../components/ui/InAppNotificationBanner";

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

  /* ================= BANNER STATE ================= */
  const [banner, setBanner] = useState({
    visible: false,
    title: "",
    body: "",
    avatar: null,
    data: null,
  });

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
      } catch (e) { }
    })();
  }, []);

  /* ================= RESTORE TOKEN ================= */
  useEffect(() => {
    (async () => {
      try {
        await dispatch(restoreToken()).unwrap();
      } catch (e) {
        console.warn("Token restore failed:", e);
      } finally {
        SplashScreen.hideAsync().catch(() => { });
      }
    })();
  }, []);

  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const result = await dispatch(restoreToken()).unwrap();
  //       const { token } = result;

  //       if (!token) {
  //         router.replace("/onboarding");
  //         return;
  //       }

  //       router.replace("/(tabs)");
  //     } catch (e) {
  //       router.replace("/onboarding");
  //     } finally {
  //       SplashScreen.hideAsync().catch(() => {});
  //     }
  //   })();
  // }, []);

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
        if (status !== "granted") return;

        let pushToken = null;

        try {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId;

          if (projectId) {
            pushToken = (
              await Notifications.getExpoPushTokenAsync({ projectId })
            ).data;
          } else {
            pushToken = (await Notifications.getExpoPushTokenAsync()).data;
          }
        } catch (err) {
          return;
        }

        if (!pushToken) return;

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
      } catch (e) { }
    };

    registerForPush();
  }, [token]);

  /* ================= FOREGROUND NOTIFICATIONS ================= */
  useEffect(() => {
    if (Platform.OS === "web") return;

    const sub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { title, body, data } = notification.request.content;

        setBanner({
          visible: true,
          title: title || "Notification",
          body: body || "",
          avatar: data?.avatar || null,
          data: data || null,
        });
      }
    );

    return () => sub.remove();
  }, []);

  /* ================= BANNER PRESS NAVIGATION ================= */
  const handleBannerPress = () => {
    const data = banner.data || {};

    if (data?.type === "program" && data?.programId) {
      router.push(`/programs/${data.programId}`);
    }

    else if (data?.type === "post" && data?.postId) {
      router.push(`/feed/${data.postId}`);
    }

    else if (data?.type === "savings" && data?.podId) {
      router.push(`/savings/${data.podId}`);
    }

    else if (data?.type === "community") {
      if (data?.chatId) {
        router.push(`/community/chat/${data.chatId}`);
      } else if (data?.groupId) {
        router.push(`/community/groups/${data.groupId}`);
      } else if (data?.voiceId) {
        router.push(`/community/voices/${data.voiceId}`);
      } else if (data?.hubId) {
        router.push(`/community/hubs/${data.hubId}`);
      } else {
        router.push("/(tabs)/community");
      }
    }

    setBanner((b) => ({ ...b, visible: false }));
  };

  /* ================= HANDLE NOTIFICATION TAP ================= */
  useEffect(() => {
    const handleNotification = (response) => {
      const data = response?.notification?.request?.content?.data || {};
      if (!data) return;

      if (data?.type === "program" && data?.programId) {
        router.push(`/programs/${data.programId}`);
        return;
      }

      if (data?.type === "post" && data?.postId) {
        router.push(`/feed/${data.postId}`);
        return;
      }

      if (data?.type === "savings" && data?.podId) {
        router.push(`/savings/${data.podId}`);
        return;
      }

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

    if (Platform.OS !== "web") {
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response) handleNotification(response);
        })
        .catch(() => { });

      const sub = Notifications.addNotificationResponseReceivedListener(
        handleNotification
      );

      return () => sub.remove();
    }

    return undefined;
  }, []);

  if (!fontsLoaded) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="modals" />
      </Stack>

      {/* ================= IN APP BANNER ================= */}
      <InAppNotificationBanner
        visible={banner.visible}
        title={banner.title}
        body={banner.body}
        avatar={banner.avatar}
        data={banner.data}
        onPress={handleBannerPress}
        onHide={() =>
          setBanner((b) => ({ ...b, visible: false }))
        }
      />
    </>
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