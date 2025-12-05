import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/auth';
import { secureStore } from '../../services/storage';

/* ============================================================
   FETCH USER PROFILE (/auth/me)
============================================================ */
export const fetchUserProfile = createAsyncThunk(
  'user/fetchUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      const token = await secureStore.getItem('token');
      if (!token) return rejectWithValue("No token found");

      const response = await authService.getMe(token);
      return response.data; 
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

/* ============================================================
   UPDATE PROFILE
============================================================ */
export const updateProfile = createAsyncThunk(
  'user/updateProfile',
  async (payload, { rejectWithValue }) => {
    try {
      const token = await secureStore.getItem('token');
      const res = await authService.updateProfile(payload, token);
      return res.data; // updated user object
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

/* ============================================================
   UPDATE PASSWORD
============================================================ */
export const updatePassword = createAsyncThunk(
  'user/updatePassword',
  async (payload, { rejectWithValue }) => {
    try {
      const token = await secureStore.getItem('token');
      const res = await authService.updatePassword(payload, token);
      return res;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

/* ============================================================
   UPDATE AVATAR (form-data)
============================================================ */
export const updateAvatar = createAsyncThunk(
  'user/updateAvatar',
  async (formData, { rejectWithValue }) => {
    try {
      const token = await secureStore.getItem('token');
      const res = await authService.updateAvatar(formData, token);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

/* ============================================================
   DELETE AVATAR
============================================================ */
export const deleteAvatar = createAsyncThunk(
  'user/deleteAvatar',
  async (_, { rejectWithValue }) => {
    try {
      const token = await secureStore.getItem('token');
      const res = await authService.deleteAvatar(token);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

/* ============================================================
   DEACTIVATE ACCOUNT
============================================================ */
export const deactivateAccount = createAsyncThunk(
  'user/deactivateAccount',
  async (_, { rejectWithValue }) => {
    try {
      const token = await secureStore.getItem('token');
      const res = await authService.deactivateAccount(token);
      return res;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

/* ============================================================
   REACTIVATE ACCOUNT
============================================================ */
export const reactivateAccount = createAsyncThunk(
  'user/reactivateAccount',
  async (tokenParam, { rejectWithValue }) => {
    try {
      const res = await authService.reactivateAccount(tokenParam);
      return res;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

/* ============================================================
   ENABLE 2FA
============================================================ */
export const enable2FA = createAsyncThunk(
  'user/enable2FA',
  async (_, { rejectWithValue }) => {
    try {
      const token = await secureStore.getItem('token');
      return await authService.enable2FA(token);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

/* ============================================================
   DISABLE 2FA
============================================================ */
export const disable2FA = createAsyncThunk(
  'user/disable2FA',
  async (_, { rejectWithValue }) => {
    try {
      const token = await secureStore.getItem('token');
      return await authService.disable2FA(token);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);


/* ============================================================
   SLICE
============================================================ */
const userSlice = createSlice({
  name: 'user',

  initialState: {
    user: null,
    loading: false,
    error: null,
    refetchTrigger: false,
    message: null,
  },

  reducers: {
    triggerRefetch(state) {
      state.refetchTrigger = !state.refetchTrigger;
    },
    clearUser(state) {
      state.user = null;
      state.error = null;
      state.message = null;
    }
  },

  extraReducers: (builder) => {
    const thunks = [
      fetchUserProfile,
      updateProfile,
      updatePassword,
      updateAvatar,
      deleteAvatar,
      deactivateAccount,
      reactivateAccount,
      enable2FA,
      disable2FA,
    ];

    thunks.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.loading = true;
          state.error = null;
          state.message = null;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload;
        });
    });

    /* SUCCESS CASES ------------------------- */
    builder
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })

      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.message = "Profile updated successfully";
      })

      .addCase(updatePassword.fulfilled, (state) => {
        state.loading = false;
        state.message = "Password updated successfully";
      })

      .addCase(updateAvatar.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.message = "Avatar updated";
      })

      .addCase(deleteAvatar.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.message = "Avatar deleted";
      })

      .addCase(deactivateAccount.fulfilled, (state) => {
        state.loading = false;
        state.message = "Account deactivated";
      })

      .addCase(reactivateAccount.fulfilled, (state) => {
        state.loading = false;
        state.message = "Account reactivated";
      })

      .addCase(enable2FA.fulfilled, (state) => {
        state.loading = false;
        state.message = "2FA enabled";
      })

      .addCase(disable2FA.fulfilled, (state) => {
        state.loading = false;
        state.message = "2FA disabled";
      });
  },
});

export const { triggerRefetch, clearUser } = userSlice.actions;
export default userSlice.reducer;
