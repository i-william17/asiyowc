import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/auth';
import { secureStore } from '../../services/storage';

/* ============================================================
   FETCH AUTHENTICATED USER /auth/me
============================================================ */
export const fetchAuthenticatedUser = createAsyncThunk(
  'auth/fetchMe',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      const response = await authService.getMe(token);

      return response.data;
    } catch (error) {
      console.error("🔴 /me error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchGamification = createAsyncThunk(
  "auth/fetchGamification",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue("No token");

      const response = await authService.getGamification(token);

      // ✅ supports both shapes:
      // 1) { success, data: { xp, level } }
      // 2) { xp, level }
      const payload = response?.data ?? response;

      return payload; // { xp, level }
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

/* ============================================================
   RESTORE TOKEN (App Startup)
============================================================ */
export const restoreToken = createAsyncThunk(
  'auth/restoreToken',
  async () => {
    try {
      console.log("Restoring token...");
      const storedToken = await secureStore.getItem('token');
      console.log("Stored token:", storedToken);

      const storedHasRegistered = await secureStore.getItem('hasRegistered');

      return {
        token: storedToken || null,
        hasRegistered: storedHasRegistered === 'true',
      };
    } catch {
      return {
        token: null,
        onboarding: null,
        hasRegistered: false,
      };
    }
  }
);

/* ============================================================
   REGISTER
============================================================ */
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);

      if (response?.success || response?.data?.user) {
        await secureStore.setItem('hasRegistered', 'true');
      }

      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

/* ============================================================
   LOGIN
============================================================ */
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);

      if (response.data?.token) {
        await secureStore.setItem('token', response.data.token);
        // 🔥 CRITICAL: persist registration state on login
        await secureStore.setItem('hasRegistered', 'true');
      }

      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

/* ============================================================
   VERIFY OTP
============================================================ */
export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async (otpData, { rejectWithValue }) => {
    try {
      const response = await authService.verifyOTP(otpData);

      if (response.data?.token) {
        await secureStore.setItem('token', response.data.token);
      }

      await secureStore.setItem('hasRegistered', 'true');

      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

/* ============================================================
   LOGOUT
============================================================ */
export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await secureStore.removeItem('token');
  await secureStore.removeItem('userId');
  return true;
});

/* ============================================================
   SLICE
============================================================ */
const authSlice = createSlice({
  name: 'auth',

  initialState: {
    user: null,
    token: null,
    onboardingData: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    twoFactorRequired: false,
    appLoaded: false,
    hasRegistered: false,
  },

  reducers: {
    setOnboardingData: (state, action) => {
      state.onboardingData = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    resetAuth: (state) => {
      state.user = null;
      state.token = null;
      state.onboardingData = null;
      state.isAuthenticated = false;
      state.twoFactorRequired = false;
      state.error = null;
      state.hasRegistered = false;

      secureStore.removeItem('token');
      secureStore.removeItem('userId');
      secureStore.removeItem('hasRegistered');
    },

    setToken: (state, action) => {
      state.token = action.payload;
      state.isAuthenticated = true;
    },
  },

  extraReducers: (builder) => {
    builder

      /* ============================================================
         RESTORE TOKEN (RACE-SAFE)
      ============================================================= */
      .addCase(restoreToken.pending, (state) => {
        state.appLoaded = false;
      })

      .addCase(restoreToken.fulfilled, (state, action) => {
        // 🔒 DO NOT overwrite an active token
        if (!state.token) {
          state.token = action.payload.token;
          state.isAuthenticated = !!action.payload.token;
        }

        state.hasRegistered = action.payload.hasRegistered;
        state.appLoaded = true;
      })

      .addCase(restoreToken.rejected, (state) => {
        state.appLoaded = true;
      })

      /* ============================================================
         REGISTER
      ============================================================= */
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload?.data?.user || null;
        state.hasRegistered = true;
        state.isAuthenticated = false;

        // 🔥 Clear onboarding state after successful registration
        state.onboardingData = null;

      })

      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ============================================================
         LOGIN
      ============================================================= */
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;

        if (action.payload.requires2FA) {
          state.twoFactorRequired = true;
          return;
        }

        const user = action.payload.data.user;

        state.user = user;
        state.token = action.payload.data.token;
        state.isAuthenticated = true;
        state.hasRegistered = true;

        if (user?._id) {
          secureStore.setItem('userId', user._id);
        }
      })

      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ============================================================
         VERIFY OTP
      ============================================================= */
      .addCase(verifyOTP.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.loading = false;

        const user = action.payload.data.user;

        state.user = user;
        state.token = action.payload.data.token;
        state.isAuthenticated = true;
        state.hasRegistered = true;

        if (user?._id) {
          secureStore.setItem('userId', user._id);
        }
      })

      .addCase(verifyOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ============================================================
         FETCH AUTHENTICATED USER
      ============================================================= */
      .addCase(fetchAuthenticatedUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;

        if (action.payload?._id) {
          secureStore.setItem('userId', action.payload._id);
        }
      })

      .addCase(fetchAuthenticatedUser.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        // ❌ DO NOT clear token here
      })

      .addCase(fetchGamification.fulfilled, (state, action) => {
        // keep existing user, just patch gamification
        if (!state.user) state.user = {};
        state.user.gamification = {
          ...(state.user.gamification || {}),
          xp: action.payload?.xp ?? 0,
          level: action.payload?.level ?? 1,
        };
      })

      .addCase(fetchGamification.rejected, (state, action) => {
        // Do nothing destructive; no logout
        // optionally set error:
        // state.error = action.payload;
      })
      /* ============================================================
         LOGOUT
      ============================================================= */
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  },
});

export const {
  setOnboardingData,
  clearError,
  resetAuth,
  setToken,
} = authSlice.actions;

export default authSlice.reducer;
