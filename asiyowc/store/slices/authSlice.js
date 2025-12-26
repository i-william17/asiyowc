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
      console.log("Token:", token);

      if (!token) {
        return rejectWithValue("No token in state");
      }

      const response = await authService.getMe(token);
      return response.data.data;
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
      secureStore.setItem('onboarding', JSON.stringify(action.payload));
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
      secureStore.removeItem('onboarding');
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
         RESTORE TOKEN
      ============================================================= */
      .addCase(restoreToken.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.onboardingData = action.payload.onboarding;
        state.hasRegistered = action.payload.hasRegistered;
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
        state.hasRegistered = true;
        state.isAuthenticated = false; // must verify email
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ============================================================
         LOGIN (PATCHED)
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

        // ⭐ STORE USER ID PERSISTENTLY
        if (user?._id) {
          secureStore.setItem("userId", user._id);
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ============================================================
         VERIFY OTP (PATCHED)
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

        // ⭐ STORE USER ID
        if (user?._id) {
          secureStore.setItem("userId", user._id);
        }
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ============================================================
         FETCH AUTHENTICATED USER (PATCHED)
      ============================================================= */
      .addCase(fetchAuthenticatedUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;

        // ⭐ STORE USER ID ON APP RELOAD
        if (action.payload?._id) {
          secureStore.setItem("userId", action.payload._id);
        }
      })

      .addCase(fetchAuthenticatedUser.rejected, (state) => {
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;

        secureStore.removeItem("token");
        secureStore.removeItem("userId");
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
  setToken
} = authSlice.actions;

export default authSlice.reducer;
