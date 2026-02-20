import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { savingsService } from "../../services/savings";

/* ============================================================
   INITIAL STATE
============================================================ */
const initialState = {
  /* ================= LIST ================= */
  pods: [],
  podsLoading: false,

  /* ================= SELECTED POD ================= */
  selectedPod: null,
  selectedLoading: false,

  /* ================= PAGINATION ================= */
  pagination: {
    page: 1,
    pages: 1,
    total: 0,
    limit: 20,
  },

  /* ================= FILTERS ================= */
  filters: {
    page: 1,
    limit: 20,
    search: "",
    status: "",
    category: "",
  },

  /* ================= ERROR ================= */
  error: null,
};

/* ============================================================
   ASYNC THUNKS
============================================================ */

/* ================= FETCH PODS ================= */
export const fetchAdminPods = createAsyncThunk(
  "adminSavings/fetchPods",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { filters } = getState().savings;
      const token = getState().auth.token;

      const res = await savingsService.listPods(filters, token);

      return res.data;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || "Failed to fetch savings pods"
      );
    }
  }
);

/* ================= FETCH POD BY ID ================= */
export const fetchAdminPodById = createAsyncThunk(
  "adminSavings/fetchPodById",
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      const res = await savingsService.getPodById(id, token);

      return res.data.data; // unwrap actual pod
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || "Failed to fetch pod details"
      );
    }
  }
);

/* ============================================================
   SLICE
============================================================ */
const adminSavingsSlice = createSlice({
  name: "adminSavings",
  initialState,
  reducers: {
    /* ================= SET FILTERS ================= */
    setAdminSavingsFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    /* ================= CLEAR SELECTED ================= */
    clearSelectedPod: (state) => {
      state.selectedPod = null;
    },

    /* ================= CLEAR ERROR ================= */
    clearAdminSavingsError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    /* ================= FETCH PODS ================= */
    builder
      .addCase(fetchAdminPods.pending, (state) => {
        state.podsLoading = true;
      })
      .addCase(fetchAdminPods.fulfilled, (state, action) => {
        state.podsLoading = false;

        const { data, page, pages, total, limit } = action.payload || {};

        state.pods = data || [];

        state.pagination = {
          page: page || 1,
          pages: pages || 1,
          total: total || 0,
          limit: limit || 20,
        };
      })
      .addCase(fetchAdminPods.rejected, (state, action) => {
        state.podsLoading = false;
        state.error = action.payload;
      });

    /* ================= FETCH POD DETAIL ================= */
    builder
      .addCase(fetchAdminPodById.pending, (state) => {
        state.selectedLoading = true;
      })
      .addCase(fetchAdminPodById.fulfilled, (state, action) => {
        state.selectedLoading = false;
        state.selectedPod = action.payload;
      })
      .addCase(fetchAdminPodById.rejected, (state, action) => {
        state.selectedLoading = false;
        state.error = action.payload;
      });
  },
});

/* ============================================================
   EXPORTS
============================================================ */
export const {
  setAdminSavingsFilters,
  clearSelectedPod,
  clearAdminSavingsError,
} = adminSavingsSlice.actions;

export default adminSavingsSlice.reducer;
