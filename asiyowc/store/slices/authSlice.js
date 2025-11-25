import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/auth';
import { secureStore } from '../../services/storage';

/* ============================================================
   RESTORE TOKEN + ONBOARDING + REGISTRATION FLAG
============================================================ */
export const restoreToken = createAsyncThunk(
  'auth/restoreToken',
  async () => {
    try {
      const storedToken = await secureStore.getItem('token');
      const storedOnboarding = await secureStore.getItem('onboarding');
      const storedHasRegistered = await secureStore.getItem('hasRegistered');

      return {
        token: storedToken || null,
        onboarding: storedOnboarding ? JSON.parse(storedOnboarding) : null,
        hasRegistered: storedHasRegistered === 'true'
      };
    } catch (e) {
      return { token: null, onboarding: null, hasRegistered: false };
    }
  }
);

/* ============================================================
   REGISTER USER — Save hasRegistered **only on success**
============================================================ */
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);

      // ⭐ Save flag ONLY after backend confirms success
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
      }

      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

/* ============================================================
   VERIFY OTP (after registration)
============================================================ */
export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async (otpData, { rejectWithValue }) => {
    try {
      const response = await authService.verifyOTP(otpData);

      if (response.data?.token) {
        await secureStore.setItem('token', response.data.token);
      }

      // ⭐ Verified = registered
      await secureStore.setItem('hasRegistered', 'true');

      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

/* ============================================================
   LOGOUT (does NOT remove hasRegistered)
============================================================ */
export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await secureStore.removeItem('token');
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
    hasRegistered: false,   // ⭐ NEW
  },

  reducers: {
    /* SAVE ONBOARDING */
    setOnboardingData: (state, action) => {
      state.onboardingData = action.payload;
      secureStore.setItem('onboarding', JSON.stringify(action.payload));
    },

    clearError: (state) => {
      state.error = null;
    },

    /* FULL RESET — used for delete account */
    resetAuth: (state) => {
      state.user = null;
      state.token = null;
      state.onboardingData = null;
      state.isAuthenticated = false;
      state.twoFactorRequired = false;
      state.error = null;
      state.hasRegistered = false; // ⭐ reset on delete account

      secureStore.removeItem('token');
      secureStore.removeItem('onboarding');
      secureStore.removeItem('hasRegistered');
    },

    /* MANUAL TOKEN SET */
    setToken: (state, action) => {
      state.token = action.payload;
      state.isAuthenticated = true;
    },
  },

  extraReducers: (builder) => {
    builder

      /* ============================================================
         RESTORE TOKEN
      ============================================================= */
      .addCase(restoreToken.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.onboardingData = action.payload.onboarding;
        state.hasRegistered = action.payload.hasRegistered; // ⭐ RESTORE
        state.isAuthenticated = !!action.payload.token;
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
        state.user = action.payload.data.user;
        state.hasRegistered = true; // ⭐ confirmed by backend
        state.isAuthenticated = false; // must verify email
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

        state.user = action.payload.data.user;
        state.token = action.payload.data.token;
        state.isAuthenticated = true;
        state.hasRegistered = true; // ⭐ LOGIN CONFIRMS REGISTERED
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
        state.user = action.payload.data.user;
        state.token = action.payload.data.token;
        state.isAuthenticated = true;
        state.hasRegistered = true; // ⭐ VERIFIED = REGISTERED
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ============================================================
         LOGOUT
      ============================================================= */
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;

        // ⭐ KEEP hasRegistered TRUE so onboarding never shows again
      });
  },
});

export const { 
  setOnboardingData, 
  clearError, 
  resetAuth, 
  setToken 
} = authSlice.actions;

export default authSlice.reducer;
