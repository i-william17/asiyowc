// app/index.js
import { Redirect } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { restoreToken } from "../store/slices/authSlice";
import { secureStore } from "../services/storage";

const DEV_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MjVhNDFmM2M4ODMxOTI3OTBlOTcxMCIsImlhdCI6MTc2NzUyNTMyNiwiZXhwIjoxNzcwMTE3MzI2fQ.q8LI_C6OSNOBGb5M-MSogiFCFYPJfSotvDa41cxk1OQ";

export default function Index() {
  const dispatch = useDispatch();

  const { token, hasRegistered, appLoaded } = useSelector(
    (state) => state.auth
  );

  // 🔥 DEV-ONLY TOKEN INJECTION (SAFE)
  useEffect(() => {
    (async () => {
      console.log("🔥 Injecting DEV token into SecureStore");
      await secureStore.setItem("token", DEV_TOKEN);
      await secureStore.setItem("hasRegistered", "true");
      dispatch(restoreToken());
    })();
  }, []);

  // ⏳ Wait for restore
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
