// store/slices/savingsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { savingsService } from "../../services/savings";

/* ============================================================
   ASYNC THUNKS
============================================================ */

/* -------------------------------
   PODS
-------------------------------- */

// My pods
export const fetchMyPods = createAsyncThunk(
  "savings/fetchMyPods",
  async (token, { rejectWithValue }) => {
    try {
      const data = await savingsService.getMyPods(token);
      return data.pods || data; // backend returns { pods }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Discover pods (paginated)
export const fetchDiscoverPods = createAsyncThunk(
  "savings/fetchDiscoverPods",
  async ({ token, page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const data = await savingsService.discoverPods(token, page, limit);
      return {
        pods: data.pods || [],
        page: data.page || page,
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Single pod
export const fetchPodById = createAsyncThunk(
  "savings/fetchPodById",
  async ({ podId, token }, { rejectWithValue }) => {
    try {
      return await savingsService.getPodById(podId, token);
      // { pod, isMember }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Join pod
export const joinPod = createAsyncThunk(
  "savings/joinPod",
  async ({ podId, token }, { rejectWithValue }) => {
    try {
      await savingsService.joinPod(podId, token);
      return podId;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/* -------------------------------
   CONTRIBUTIONS
-------------------------------- */

// My contributions
export const fetchMyContributions = createAsyncThunk(
  "savings/fetchMyContributions",
  async (token, { rejectWithValue }) => {
    try {
      const data = await savingsService.getMyContributions(token);
      return data.contributions || data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Create checkout (payment)
export const createContributionCheckout = createAsyncThunk(
  "savings/createContributionCheckout",
  async ({ podId, token }, { rejectWithValue }) => {
    try {
      return await savingsService.createContributionCheckout(podId, token);
      // { intentId, redirectUrl }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState = {
  myPods: [],
  discoverPods: [],
  discoverPage: 1,

  contributions: [],

  activePod: null,     // { pod, isMember }
  checkout: null,      // { intentId, redirectUrl }

  loading: false,
  error: null,
};

/* ============================================================
   SLICE
============================================================ */

const savingsSlice = createSlice({
  name: "savings",
  initialState,
  reducers: {
    clearSavingsError: (state) => {
      state.error = null;
    },

    clearCheckout: (state) => {
      state.checkout = null;
    },

    clearActivePod: (state) => {
      state.activePod = null;
    },
  },

  extraReducers: (builder) => {
    builder

      /* ===============================
         MY PODS
      =============================== */
      .addCase(fetchMyPods.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyPods.fulfilled, (state, action) => {
        state.loading = false;
        state.myPods = action.payload;
      })
      .addCase(fetchMyPods.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ===============================
         DISCOVER PODS
      =============================== */
      .addCase(fetchDiscoverPods.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDiscoverPods.fulfilled, (state, action) => {
        state.loading = false;
        state.discoverPage = action.payload.page;

        // append safely (pagination)
        if (action.payload.page === 1) {
          state.discoverPods = action.payload.pods;
        } else {
          state.discoverPods.push(...action.payload.pods);
        }
      })
      .addCase(fetchDiscoverPods.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ===============================
         SINGLE POD
      =============================== */
      .addCase(fetchPodById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPodById.fulfilled, (state, action) => {
        state.loading = false;
        state.activePod = action.payload;
      })
      .addCase(fetchPodById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ===============================
         JOIN POD
      =============================== */
      .addCase(joinPod.fulfilled, (state, action) => {
        // Optimistic membership update (safe)
        if (state.activePod?.pod?._id === action.payload) {
          state.activePod.isMember = true;
        }
      })

      /* ===============================
         CONTRIBUTIONS
      =============================== */
      .addCase(fetchMyContributions.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyContributions.fulfilled, (state, action) => {
        state.loading = false;
        state.contributions = action.payload;
      })
      .addCase(fetchMyContributions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ===============================
         CHECKOUT
      =============================== */
      .addCase(createContributionCheckout.pending, (state) => {
        state.loading = true;
        state.checkout = null;
      })
      .addCase(createContributionCheckout.fulfilled, (state, action) => {
        state.loading = false;
        state.checkout = action.payload;
      })
      .addCase(createContributionCheckout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

/* ============================================================
   EXPORTS
============================================================ */

export const {
  clearSavingsError,
  clearCheckout,
  clearActivePod,
} = savingsSlice.actions;

export default savingsSlice.reducer;
