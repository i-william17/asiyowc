import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { analyticsService } from "../../services/analytics";

/* ============================================================
   INITIAL STATE (FULLY ALIGNED WITH ANALYTICS.JSX)
============================================================ */

const initialState = {
  // Current UI layer
  currentLayerKey: "overview",

  // Date / range controls
  range: {
    from: null,
    to: null,
    tz: "Africa/Nairobi",
    granularity: "day",
  },

  // Realtime config
  realtime: {
    minutes: 15,
  },

  // Feed limit
  limit: 10,

  // Enterprise per-layer cache
  layerDataByKey: {
    overview: null,
    "user-community": null,
    "social-engagement": null,
    "learning-programs": null,
    "financial-transactions": null,
    "marketplace-economy": null,
    realtime: null,
    "moderation-safety": null,
    "growth-retention": null,
  },

  // Loading & error per layer
  loadingByKey: {},
  errorByKey: {},
};

/* ============================================================
   LOAD LAYER (ENTERPRISE + CACHE SUPPORT)
============================================================ */

export const fetchAnalyticsLayer = createAsyncThunk(
  "analytics/fetchAnalyticsLayer",
  async (
    { key, params = {}, force = false },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState();
      const token = state.auth.token;

      const existing = state.analytics.layerDataByKey[key];

      // Skip if cached and not forcing
      if (existing && !force) {
        return { key, data: existing, cached: true };
      }

      const res = await analyticsService.getLayer(
        { key, ...params },
        token
      );

      return {
        key,
        data: res.data.data,
        cached: false,
      };
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || "Failed to load analytics layer"
      );
    }
  }
);

/* ============================================================
   SLICE
============================================================ */

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,

  reducers: {
    /* ================= CURRENT LAYER ================= */
    setCurrentLayerKey: (state, action) => {
      state.currentLayerKey = action.payload;
    },

    /* ================= DATE RANGE ================= */
    setDateRange: (state, action) => {
      const { from, to } = action.payload;
      state.range.from = from;
      state.range.to = to;
    },

    setTimezone: (state, action) => {
      state.range.tz = action.payload;
    },

    setGranularity: (state, action) => {
      state.range.granularity = action.payload;
    },

    /* ================= REALTIME ================= */
    setRealtimeMinutes: (state, action) => {
      state.realtime.minutes = action.payload;
    },

    /* ================= LIMIT ================= */
    setLimit: (state, action) => {
      state.limit = action.payload;
    },

    /* ================= CACHE CONTROLS ================= */
    clearLayerCache: (state, action) => {
      const key = action.payload;
      state.layerDataByKey[key] = null;
    },

    clearAllAnalyticsCache: (state) => {
      Object.keys(state.layerDataByKey).forEach((k) => {
        state.layerDataByKey[k] = null;
      });
    },

    clearAnalyticsError: (state, action) => {
      const key = action.payload;
      if (key) {
        state.errorByKey[key] = null;
      }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalyticsLayer.pending, (state, action) => {
        const key = action.meta.arg.key;
        state.loadingByKey[key] = true;
        state.errorByKey[key] = null;
      })

      .addCase(fetchAnalyticsLayer.fulfilled, (state, action) => {
        const { key, data } = action.payload;
        state.loadingByKey[key] = false;
        state.layerDataByKey[key] = data;
      })

      .addCase(fetchAnalyticsLayer.rejected, (state, action) => {
        const key = action.meta.arg.key;
        state.loadingByKey[key] = false;
        state.errorByKey[key] = action.payload;
      });
  },
});

/* ============================================================
   EXPORTS
============================================================ */

export const {
  setCurrentLayerKey,
  setDateRange,
  setTimezone,
  setGranularity,
  setRealtimeMinutes,
  setLimit,
  clearLayerCache,
  clearAllAnalyticsCache,
  clearAnalyticsError,
} = analyticsSlice.actions;

export default analyticsSlice.reducer;