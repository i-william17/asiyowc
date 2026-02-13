import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authService } from "../../services/auth";

/* ============================================================
   LOGIN ADMIN
============================================================ */
export const loginAdmin = createAsyncThunk(
  "auth/loginAdmin",
  async (credentials, { rejectWithValue }) => {
    try {
      const res = await authService.adminLogin(credentials);
      return res.data.data; // { user, token }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Login failed"
      );
    }
  }
);


/* ============================================================
   FETCH CURRENT USER (/auth/me)
   → restore session after refresh
============================================================ */
export const fetchAuthenticatedUser = createAsyncThunk(
  "auth/fetchMe",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      const res = await authService.getMe(token);

      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Session expired"
      );
    }
  }
);


/* ============================================================
   PROMOTE USER → ADMIN
============================================================ */
export const promoteUser = createAsyncThunk(
  "auth/promoteUser",
  async (userId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      const res = await authService.makeAdmin(userId, token);

      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to promote"
      );
    }
  }
);


/* ============================================================
   DEMOTE ADMIN → USER
============================================================ */
export const demoteUser = createAsyncThunk(
  "auth/demoteUser",
  async (userId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      const res = await authService.removeAdmin(userId, token);

      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to demote"
      );
    }
  }
);

export const restoreSession = createAsyncThunk(
  "auth/restoreSession",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;

      const res = await authService.getMe(token);

      return {
        user: res.data.data,
        token,
      };
    } catch (err) {
      localStorage.removeItem("token");
      return rejectWithValue(null);
    }
  }
);

/* ============================================================
   LOGOUT
============================================================ */
export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async () => {
    localStorage.removeItem("token");
    return true;
  }
);


/* ============================================================
   SLICE
============================================================ */
const authSlice = createSlice({
  name: "auth",

  initialState: {
    user: null,
    token: localStorage.getItem("token") || null,
    isAuthenticated: !!localStorage.getItem("token"),
    loading: false,
    error: null,
    appLoaded: false,   // ⭐ ADD THIS
  },

  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder

      /* ============================================================
         LOGIN
      ============================================================= */
      .addCase(loginAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.loading = false;

        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;

        localStorage.setItem("token", action.payload.token);
      })

      .addCase(loginAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })


      /* ============================================================
         FETCH AUTHENTICATED USER
      ============================================================= */
      .addCase(fetchAuthenticatedUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })

      .addCase(fetchAuthenticatedUser.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      })


      /* ============================================================
         PROMOTE
      ============================================================= */
      .addCase(promoteUser.pending, (state) => {
        state.loading = true;
      })

      .addCase(promoteUser.fulfilled, (state) => {
        state.loading = false;
      })

      .addCase(promoteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })


      /* ============================================================
         DEMOTE
      ============================================================= */
      .addCase(demoteUser.pending, (state) => {
        state.loading = true;
      })

      .addCase(demoteUser.fulfilled, (state) => {
        state.loading = false;
      })

      .addCase(demoteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(restoreSession.pending, (state) => {
        state.appLoaded = false;
      })

      .addCase(restoreSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
        }

        state.appLoaded = true;
      })

      .addCase(restoreSession.rejected, (state) => {
        state.appLoaded = true;
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

export const { clearError } = authSlice.actions;

export default authSlice.reducer;
