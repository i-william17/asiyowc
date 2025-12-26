import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/auth';
import { secureStore } from '../../services/storage';

/* ============================================================
   FETCH USER PROFILE (/users/profile)
============================================================ */
export const fetchUserProfile = createAsyncThunk(
  'user/fetchUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      const token = await secureStore.getItem('token');

      if (!token) {
        return rejectWithValue({ message: 'AUTH_REQUIRED' });
      }

      const res = await authService.getProfile(token);
      // EXPECTED: { success, data: { user, stats } }
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
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
      return res.data; // { user }
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
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
      await authService.updatePassword(payload, token);
      return true;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

/* ============================================================
   UPDATE AVATAR
============================================================ */
export const updateAvatar = createAsyncThunk(
  'user/updateAvatar',
  async (formData, { rejectWithValue }) => {
    try {
      const token = await secureStore.getItem('token');
      const res = await authService.updateAvatar(formData, token);
      return res.data; // { avatar }
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
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
      await authService.deleteAvatar(token);
      return true;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

/* ============================================================
   UPDATE COVER PHOTO
============================================================ */
export const updateCoverPhoto = createAsyncThunk(
  'user/updateCoverPhoto',
  async (formData, { rejectWithValue }) => {
    try {
      const token = await secureStore.getItem('token');
      const res = await authService.updateCoverPhoto(formData, token);
      return res.data; // { coverPhoto }
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

/* ============================================================
   DELETE COVER PHOTO
============================================================ */
export const deleteCoverPhoto = createAsyncThunk(
  'user/deleteCoverPhoto',
  async (_, { rejectWithValue }) => {
    try {
      const token = await secureStore.getItem('token');
      await authService.deleteCoverPhoto(token);
      return true;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

/* ============================================================
   FETCH ENROLLED PROGRAMS
============================================================ */
export const fetchEnrolledPrograms = createAsyncThunk(
  'user/fetchEnrolledPrograms',
  async (_, { rejectWithValue }) => {
    try {
      const token = await secureStore.getItem('token');
      const res = await authService.getEnrolledPrograms(token);
      return res.data; // { programs }
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

/* ============================================================
   FETCH COMPLETED PROGRAMS
============================================================ */
export const fetchCompletedPrograms = createAsyncThunk(
  'user/fetchCompletedPrograms',
  async (_, { rejectWithValue }) => {
    try {
      const token = await secureStore.getItem('token');
      const res = await authService.getCompletedPrograms(token);
      return res.data; // { programs }
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
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
    stats: null,
    enrolledPrograms: [],
    completedPrograms: [],
    loading: false,
    error: null,
    message: null
  },

  reducers: {
    clearUser(state) {
      state.user = null;
      state.stats = null;
      state.enrolledPrograms = [];
      state.completedPrograms = [];
      state.loading = false;
      state.error = null;
      state.message = null;
    },

    updateProfileOptimistic(state, action) {
      if (!state.user) return;

      if (action.payload.fullName !== undefined) {
        state.user.profile.fullName = action.payload.fullName;
      }

      if (action.payload.email !== undefined) {
        state.user.email = action.payload.email;
      }
    }
  },

  extraReducers: (builder) => {
    const thunks = [
      fetchUserProfile,
      updateProfile,
      updatePassword,
      updateAvatar,
      deleteAvatar,
      updateCoverPhoto,
      deleteCoverPhoto,
      fetchEnrolledPrograms,
      fetchCompletedPrograms
    ];

    /* ================= GENERIC HANDLERS ================= */
    thunks.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.loading = true;
          state.error = null;
          state.message = null;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload?.message || 'Something went wrong';
        });
    });

    /* ================= SUCCESS ================= */

    builder
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.stats = action.payload.stats;
      })

      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.message = 'Profile updated successfully';
      })

      .addCase(updateAvatar.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user) {
          state.user.profile.avatar = action.payload.avatar;
        }
        state.message = 'Avatar updated';
      })

      .addCase(deleteAvatar.fulfilled, (state) => {
        state.loading = false;
        if (state.user) {
          state.user.profile.avatar = { url: null, publicId: null };
        }
        state.message = 'Avatar deleted';
      })

      .addCase(updateCoverPhoto.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user) {
          state.user.profile.coverPhoto = action.payload.coverPhoto;
        }
        state.message = 'Cover photo updated';
      })

      .addCase(deleteCoverPhoto.fulfilled, (state) => {
        state.loading = false;
        if (state.user) {
          state.user.profile.coverPhoto = { url: null, publicId: null };
        }
        state.message = 'Cover photo deleted';
      })

      .addCase(fetchEnrolledPrograms.fulfilled, (state, action) => {
        state.loading = false;
        state.enrolledPrograms = action.payload.programs;
      })

      .addCase(fetchCompletedPrograms.fulfilled, (state, action) => {
        state.loading = false;
        state.completedPrograms = action.payload.programs;
      })

      .addCase(updatePassword.fulfilled, (state) => {
        state.loading = false;
        state.message = 'Password updated successfully';
      });
  }
});

export const {
  clearUser,
  updateProfileOptimistic
} = userSlice.actions;

export default userSlice.reducer;
