// app/index.js
import { Redirect } from "expo-router";
import { useSelector } from "react-redux";

const DEV_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MjVhNDFmM2M4ODMxOTI3OTBlOTcxMCIsImlhdCI6MTc2NzUyNTMyNiwiZXhwIjoxNzcwMTE3MzI2fQ.q8LI_C6OSNOBGb5M-MSogiFCFYPJfSotvDa41cxk1OQ";

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
