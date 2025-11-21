import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { ThemeProvider } from '../context/ThemeContext';
import { AnimationProvider } from '../context/AnimationContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "../styles/global.css";

import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from '../hooks/useFonts';

// Prevent auto-hide of splash
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { fontsLoaded, fontError } = useFonts();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (fontError) {
    console.warn("Font error:", fontError);
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <ThemeProvider>
            <AnimationProvider>
              <AuthProvider>
                <NotificationProvider>

                  <Stack
                    screenOptions={{
                      headerShown: false,
                      animation: "fade",
                      animationDuration: 300,
                    }}
                  />

                </NotificationProvider>
              </AuthProvider>
            </AnimationProvider>
          </ThemeProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
