// app/index.js
import { Redirect } from "expo-router";
import { useSelector } from "react-redux";

export default function Index() {

  const { token, hasRegistered, appLoaded } = useSelector(
    (state) => state.auth
  );

  if (!appLoaded) {
    return null;
  }

  // 🟢 Logged in
  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  // 🔴 Registered but not logged in
  if (hasRegistered) {
    return <Redirect href="/(auth)/login" />;
  }

  // 🆕 New user
  return <Redirect href="/(auth)/onboarding" />;
}
