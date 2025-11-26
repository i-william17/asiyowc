import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from '../store/store';

import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { AnimationProvider } from '../context/AnimationContext';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import "../styles/global.css";

import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from '../hooks/useFonts';

import { restoreToken, fetchAuthenticatedUser } from '../store/slices/authSlice';

/* Prevent splash from auto-hiding */
SplashScreen.preventAutoHideAsync().catch(() => {});

/* ================================================================
   APP INITIALIZER
   - Restores token
   - Fetches authenticated user
   - Hides splash ONLY when ready
================================================================ */
function AppInitializer({ children }) {
  const dispatch = useDispatch();
  const { appLoaded, token } = useSelector((state) => state.auth);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        // 1️⃣ Restore token from secure store
        const result = await dispatch(restoreToken());

        const restoredToken = result.payload?.token;

        // 2️⃣ Fetch user only if token exists
        if (restoredToken) {
          await dispatch(fetchAuthenticatedUser());
        }
      } catch (err) {
        console.error("❌ INIT ERROR:", err);
      } finally {
        // 3️⃣ Hide splash once all auth loading is complete
        await SplashScreen.hideAsync().catch(() => {});
      }
    };

    bootstrap();
  }, []);

  // Prevent app rendering before initialization is complete
  if (!appLoaded) return null;

  return children;
}

/* ================================================================
   MAIN ROOT LAYOUT
================================================================ */
export default function RootLayout() {
  const { fontsLoaded, fontError } = useFonts();

  useEffect(() => {
    if (fontsLoaded) {
      // Splash will hide from AppInitializer, not twice here.
      // Do NOT hide splash screen here.
    }
  }, [fontsLoaded]);

  if (fontError) {
    console.warn("Font loading error:", fontError);
  }

  if (!fontsLoaded) {
    return null; // Wait for fonts before rendering
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <ThemeProvider>
            <AnimationProvider>
              <AuthProvider>

                {/* ⭐ Initialize auth BEFORE rendering navigation */}
                <AppInitializer>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      animation: "fade",
                      animationDuration: 300,
                    }}
                  />
                </AppInitializer>

              </AuthProvider>
            </AnimationProvider>
          </ThemeProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
