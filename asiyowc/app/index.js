import { Redirect } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { restoreToken } from "../store/slices/authSlice";

export default function Index() {
  const dispatch = useDispatch();

  const { token, onboardingData, hasRegistered, appLoaded } = useSelector(
    (state) => state.auth
  );

  // Restore token + onboarding + hasRegistered
  useEffect(() => {
    dispatch(restoreToken());
    console.log("Registered status:", hasRegistered);
  }, []);

  // Wait for async restore to finish
  if (!appLoaded) {
    return null; // Or a splash screen
  }

  // ==========================================
  //   🚀 NEW ROUTING LOGIC WITH hasRegistered
  // ==========================================

  // 1️⃣ Logged in users → Go to main tabs
  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  // 2️⃣ User has ever registered → ALWAYS skip onboarding
  if (hasRegistered) {
    return <Redirect href="/(auth)/login" />;
  }

  // 3️⃣ Brand new user → show onboarding flow
  return <Redirect href="/(auth)/onboarding" />;
}
