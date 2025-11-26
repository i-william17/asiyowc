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
      console.log("👤 USER:", response.data);
      return response.data; 
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
  },

  reducers: {
    triggerRefetch(state) {
      state.refetchTrigger = !state.refetchTrigger;
    },
    clearUser(state) {
      state.user = null;
    }
  },

  extraReducers: (builder) => {
    builder

      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload; // now full user object
      })

      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { triggerRefetch, clearUser } = userSlice.actions;
export default userSlice.reducer;
