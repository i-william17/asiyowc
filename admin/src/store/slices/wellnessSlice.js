// store/slices/wellnessSlice.js
// ============================================================
// ADMIN WELLNESS SLICE (Enterprise / Comprehensive)
// File: wellnessSlice.js
//
// ✅ Uses services/wellness.js  (export const adminWellnessService = { ... })
// ✅ Handles:
//    - Mood Dashboard / Heatmap / Risk / Correlation / Growth Index
//    - Retreat Analytics / Funnel
//    - Retreat CRUD (list, detail, create, update, delete)
//    - Retreat Ops (toggle featured, reorder, recalc stats)
//    - Alerts
//    - Overview (all-in-one dashboard)
//
// ✅ Enterprise extras:
//    - Per-section loading flags (granular UX)
//    - Per-section errors (not global-only)
//    - Cache-by-query-key (avoid refetching same range)
//    - Stale-while-revalidate pattern (optional background refresh)
//    - Request dedupe (ignore outdated responses)
//    - Normalized retreats store (byId + ids) + optimistic updates
//    - UI filters persisted in slice (date window, includeInactive, funnelRetreatId)
//    - Selectors (simple, usable)
//
// NOTE:
// - This is intentionally verbose + comprehensive.
// - If you already have a "uiSlice" for filters, you can move filters there.
// ============================================================

import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import { adminWellnessService } from "../../services/wellness";

/* ============================================================
   Helpers
============================================================ */

const nowTs = () => Date.now();

const buildKey = (base, params = {}) => {
  // stable stringify (sorted keys)
  const keys = Object.keys(params || {}).sort();
  const stable = {};
  for (const k of keys) {
    const v = params[k];
    stable[k] = v === undefined ? null : v;
  }
  return `${base}:${JSON.stringify(stable)}`;
};

const extractErrorMessage = (err) =>
  err?.response?.data?.message || err?.message || "Request failed";

const upsertEntity = (state, entity) => {
  if (!entity || !entity._id) return;
  const id = entity._id;
  state.retreats.byId[id] = entity;
  if (!state.retreats.ids.includes(id)) state.retreats.ids.unshift(id);
};

const removeEntity = (state, id) => {
  delete state.retreats.byId[id];
  state.retreats.ids = state.retreats.ids.filter((x) => x !== id);
  if (state.retreats.selectedId === id) state.retreats.selectedId = null;
};

const sortRetreatIdsByOrder = (state) => {
  state.retreats.ids.sort((a, b) => {
    const ra = state.retreats.byId[a];
    const rb = state.retreats.byId[b];
    const oa = typeof ra?.order === "number" ? ra.order : 0;
    const ob = typeof rb?.order === "number" ? rb.order : 0;
    // If same order, newest first
    if (oa === ob) {
      const ta = new Date(ra?.createdAt || 0).getTime();
      const tb = new Date(rb?.createdAt || 0).getTime();
      return tb - ta;
    }
    return oa - ob;
  });
};

const isCacheFresh = (entry, ttlMs) => {
  if (!entry) return false;
  return nowTs() - (entry.fetchedAt || 0) < ttlMs;
};

/* ============================================================
   Cache TTLs (tune for your admin experience)
============================================================ */
const TTL = {
  moodDashboard: 60 * 1000, // 1 min
  heatmap: 5 * 60 * 1000, // 5 min
  risk: 60 * 1000,
  correlation: 5 * 60 * 1000,
  growth: 5 * 60 * 1000,
  retreatAnalytics: 60 * 1000,
  retreatFunnel: 60 * 1000,
  retreats: 60 * 1000,
  alerts: 30 * 1000,
  overview: 60 * 1000,
};

/* ============================================================
   Initial State
============================================================ */

const initialState = {
  // ----------------------------
  // Filters / Controls (persisted)
  // ----------------------------
  filters: {
    days: 30,
    from: null,
    to: null,
    tzOffsetMin: 180, // Nairobi default
    includeInactive: true,
    funnelRetreatId: null, // null means platform-wide
    correlation: {
      days: 90,
      beforeDays: 7,
      afterDays: 7,
      minSamples: 3,
    },
    growth: {
      windowDays: 30,
      edgeDays: 7,
      minSamples: 3,
    },
    alerts: {
      windowDays: 7,
      baselineDays: 30,
      lowMoodCutoff: 30,
      lowMoodThreshold: 35,
      volatilitySpikeMultiplier: 2.0,
    },
  },

  // ----------------------------
  // Cache store for analytics
  // Each section caches by key (params -> payload)
  // ----------------------------
  cache: {
    moodDashboard: {}, // key -> { data, fetchedAt }
    heatmap: {},
    risk: {},
    correlation: {},
    growth: {},
    retreatAnalytics: {},
    retreatFunnel: {},
    alerts: {},
    overview: {},
    retreatsList: {},
  },

  // ----------------------------
  // Active data (latest used by UI)
  // ----------------------------
  moodDashboard: null,
  heatmap: null,
  riskMetrics: null,
  correlation: null,
  growthIndex: null,
  retreatAnalytics: null,
  retreatFunnel: null,
  alerts: null,
  overview: null,

  // ----------------------------
  // Retreats (normalized store)
  // ----------------------------
  retreats: {
    byId: {},
    ids: [],
    selectedId: null,
  },

  // ----------------------------
  // UI state per section
  // ----------------------------
  loading: {
    moodDashboard: false,
    heatmap: false,
    risk: false,
    correlation: false,
    growth: false,
    retreatAnalytics: false,
    retreatFunnel: false,
    retreatsList: false,
    retreatDetail: false,
    retreatCreate: false,
    retreatUpdate: false,
    retreatDelete: false,
    retreatFeature: false,
    retreatReorder: false,
    retreatRecalculate: false,
    alerts: false,
    overview: false,
  },

  // request ids per section (ignore outdated async responses)
  requestId: {
    moodDashboard: null,
    heatmap: null,
    risk: null,
    correlation: null,
    growth: null,
    retreatAnalytics: null,
    retreatFunnel: null,
    retreatsList: null,
    retreatDetail: null,
    retreatCreate: null,
    retreatUpdate: null,
    retreatDelete: null,
    retreatFeature: null,
    retreatReorder: null,
    retreatRecalculate: null,
    alerts: null,
    overview: null,
  },

  // errors per section
  error: {
    moodDashboard: null,
    heatmap: null,
    risk: null,
    correlation: null,
    growth: null,
    retreatAnalytics: null,
    retreatFunnel: null,
    retreatsList: null,
    retreatDetail: null,
    retreatCreate: null,
    retreatUpdate: null,
    retreatDelete: null,
    retreatFeature: null,
    retreatReorder: null,
    retreatRecalculate: null,
    alerts: null,
    overview: null,
  },

  // global info
  lastUpdatedAt: null,
};

/* ============================================================
   Thunk options
   - You can use `condition` to dedupe requests if cache is fresh
============================================================ */

const makeCondition = (section, ttl) => {
  return ({ params }, { getState }) => {
    const state = getState().wellness;
    const key = buildKey(section, params || {});
    const entry = state.cache[section]?.[key];
    // If already loading same section, allow but we will ignore outdated via requestId.
    // If cache fresh, skip network to reduce load.
    if (isCacheFresh(entry, ttl)) return false;
    return true;
  };
};

/* ============================================================
   ===================== MOOD THUNKS ==========================
============================================================ */

// Mood Dashboard
export const fetchMoodDashboard = createAsyncThunk(
  "wellness/fetchMoodDashboard",
  async ({ params = {}, token }, thunkAPI) => {
    try {
      const res = await adminWellnessService.getMoodDashboard(params, token);
      return { params, data: res.data };
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  },
  { condition: makeCondition("moodDashboard", TTL.moodDashboard) }
);

// Heatmap
export const fetchHeatmap = createAsyncThunk(
  "wellness/fetchHeatmap",
  async ({ params = {}, token }, thunkAPI) => {
    try {
      const res = await adminWellnessService.getMoodHeatmap(params, token);
      return { params, data: res.data };
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  },
  { condition: makeCondition("heatmap", TTL.heatmap) }
);

// Risk Metrics
export const fetchRiskMetrics = createAsyncThunk(
  "wellness/fetchRiskMetrics",
  async ({ params = {}, token }, thunkAPI) => {
    try {
      const res = await adminWellnessService.getMoodRisk(params, token);
      return { params, data: res.data };
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  },
  { condition: makeCondition("risk", TTL.risk) }
);

// Correlation
export const fetchCorrelation = createAsyncThunk(
  "wellness/fetchCorrelation",
  async ({ params = {}, token }, thunkAPI) => {
    try {
      const res = await adminWellnessService.getMoodCorrelation(params, token);
      return { params, data: res.data };
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  },
  { condition: makeCondition("correlation", TTL.correlation) }
);

// Growth Index
export const fetchGrowthIndex = createAsyncThunk(
  "wellness/fetchGrowthIndex",
  async ({ params = {}, token }, thunkAPI) => {
    try {
      const res = await adminWellnessService.getGrowthIndex(params, token);
      return { params, data: res.data };
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  },
  { condition: makeCondition("growth", TTL.growth) }
);

/* ============================================================
   ================= RETREAT ANALYTICS THUNKS =================
============================================================ */

// Retreat Analytics
export const fetchRetreatAnalytics = createAsyncThunk(
  "wellness/fetchRetreatAnalytics",
  async ({ params = {}, token }, thunkAPI) => {
    try {
      const res = await adminWellnessService.getRetreatAnalytics(params, token);
      return { params, data: res.data };
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  },
  { condition: makeCondition("retreatAnalytics", TTL.retreatAnalytics) }
);

// Retreat Funnel
export const fetchRetreatFunnel = createAsyncThunk(
  "wellness/fetchRetreatFunnel",
  async ({ params = {}, token }, thunkAPI) => {
    try {
      const res = await adminWellnessService.getRetreatFunnel(params, token);
      return { params, data: res.data };
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  },
  { condition: makeCondition("retreatFunnel", TTL.retreatFunnel) }
);

/* ============================================================
   ===================== RETREAT CRUD THUNKS ==================
============================================================ */

// List Retreats
export const fetchRetreats = createAsyncThunk(
  "wellness/fetchRetreats",
  async ({ params = {}, token }, thunkAPI) => {
    try {
      const res = await adminWellnessService.listRetreats(params, token);
      return { params, data: res.data };
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  },
  { condition: makeCondition("retreatsList", TTL.retreats) }
);

// Get Retreat by ID
export const fetchRetreatById = createAsyncThunk(
  "wellness/fetchRetreatById",
  async ({ id, token }, thunkAPI) => {
    try {
      const res = await adminWellnessService.getRetreatById(id, token);
      return { id, data: res.data };
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Create Retreat
export const createRetreat = createAsyncThunk(
  "wellness/createRetreat",
  async ({ data, token }, thunkAPI) => {
    try {
      const res = await adminWellnessService.createRetreat(data, token);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Update Retreat
export const updateRetreat = createAsyncThunk(
  "wellness/updateRetreat",
  async ({ id, data, token }, thunkAPI) => {
    try {
      const res = await adminWellnessService.updateRetreat(id, data, token);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Delete Retreat
export const deleteRetreat = createAsyncThunk(
  "wellness/deleteRetreat",
  async ({ id, token }, thunkAPI) => {
    try {
      await adminWellnessService.deleteRetreat(id, token);
      return { id };
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Toggle Featured
export const toggleFeaturedRetreat = createAsyncThunk(
  "wellness/toggleFeaturedRetreat",
  async ({ id, token }, thunkAPI) => {
    try {
      const res = await adminWellnessService.toggleFeatured(id, token);
      // backend returns updated retreat in many patterns; if not, we refetch by id later.
      return { id, data: res.data };
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Reorder Retreats
export const reorderRetreats = createAsyncThunk(
  "wellness/reorderRetreats",
  async ({ items, token }, thunkAPI) => {
    try {
      // items: [{ id, order }]
      const res = await adminWellnessService.reorderRetreats(items, token);
      return { items, data: res.data };
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Recalculate Stats
export const recalculateRetreatStats = createAsyncThunk(
  "wellness/recalculateRetreatStats",
  async ({ id, token }, thunkAPI) => {
    try {
      const res = await adminWellnessService.recalculateRetreatStats(id, token);
      return { id, data: res.data };
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   ===================== ALERTS & OVERVIEW ====================
============================================================ */

export const fetchAlerts = createAsyncThunk(
  "wellness/fetchAlerts",
  async ({ params = {}, token }, thunkAPI) => {
    try {
      const res = await adminWellnessService.getWellnessAlerts(params, token);
      return { params, data: res.data };
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  },
  { condition: makeCondition("alerts", TTL.alerts) }
);

export const fetchOverview = createAsyncThunk(
  "wellness/fetchOverview",
  async ({ params = {}, token }, thunkAPI) => {
    try {
      const res = await adminWellnessService.getWellnessOverview(params, token);
      return { params, data: res.data };
    } catch (err) {
      return thunkAPI.rejectWithValue(extractErrorMessage(err));
    }
  },
  { condition: makeCondition("overview", TTL.overview) }
);

/* ============================================================
   Optional: "Smart load" for Wellness Page
   - Loads overview first (fast)
   - Then loads extra charts in parallel if needed
============================================================ */

export const loadWellnessPage = createAsyncThunk(
  "wellness/loadWellnessPage",
  async ({ token }, thunkAPI) => {
    const state = thunkAPI.getState().wellness;

    const paramsOverview = {
      days: state.filters.days,
      from: state.filters.from,
      to: state.filters.to,
    };

    // 1) Overview first
    await thunkAPI.dispatch(fetchOverview({ params: paramsOverview, token }));

    // 2) Then advanced pieces in parallel (no await ordering needed)
    const moodParams = {
      days: state.filters.days,
      from: state.filters.from,
      to: state.filters.to,
    };

    const heatmapParams = {
      days: state.filters.days,
      from: state.filters.from,
      to: state.filters.to,
      tzOffsetMin: state.filters.tzOffsetMin,
    };

    const riskParams = {
      days: state.filters.days,
      from: state.filters.from,
      to: state.filters.to,
      lowMoodCutoff: state.filters.alerts.lowMoodCutoff,
    };

    const correlationParams = {
      ...state.filters.correlation,
    };

    const growthParams = {
      ...state.filters.growth,
    };

    const retreatAnalyticsParams = {
      includeInactive: state.filters.includeInactive,
    };

    const funnelParams = {
      retreatId: state.filters.funnelRetreatId,
    };

    const alertsParams = {
      ...state.filters.alerts,
    };

    // Fire off without blocking
    thunkAPI.dispatch(fetchMoodDashboard({ params: moodParams, token }));
    thunkAPI.dispatch(fetchHeatmap({ params: heatmapParams, token }));
    thunkAPI.dispatch(fetchRiskMetrics({ params: riskParams, token }));
    thunkAPI.dispatch(fetchCorrelation({ params: correlationParams, token }));
    thunkAPI.dispatch(fetchGrowthIndex({ params: growthParams, token }));
    thunkAPI.dispatch(fetchRetreatAnalytics({ params: retreatAnalyticsParams, token }));
    thunkAPI.dispatch(fetchRetreatFunnel({ params: funnelParams, token }));
    thunkAPI.dispatch(fetchAlerts({ params: alertsParams, token }));

    return true;
  }
);

/* ============================================================
   Slice
============================================================ */

const wellnessSlice = createSlice({
  name: "wellness",
  initialState,
  reducers: {
    // ----------------------------
    // Global resets / errors
    // ----------------------------
    resetWellnessState: () => initialState,

    clearWellnessError: (state) => {
      for (const k of Object.keys(state.error)) state.error[k] = null;
    },

    clearSectionError: (state, action) => {
      const section = action.payload;
      if (section in state.error) state.error[section] = null;
    },

    // ----------------------------
    // Filters
    // ----------------------------
    setWellnessFilters: (state, action) => {
      state.filters = { ...state.filters, ...(action.payload || {}) };
    },

    setWellnessDateRange: (state, action) => {
      const { days, from, to } = action.payload || {};
      if (days !== undefined) state.filters.days = days;
      if (from !== undefined) state.filters.from = from;
      if (to !== undefined) state.filters.to = to;
    },

    setWellnessTimezoneOffset: (state, action) => {
      state.filters.tzOffsetMin = action.payload;
    },

    setIncludeInactive: (state, action) => {
      state.filters.includeInactive = !!action.payload;
    },

    setFunnelRetreatId: (state, action) => {
      state.filters.funnelRetreatId = action.payload || null;
    },

    setCorrelationFilters: (state, action) => {
      state.filters.correlation = {
        ...state.filters.correlation,
        ...(action.payload || {}),
      };
    },

    setGrowthFilters: (state, action) => {
      state.filters.growth = {
        ...state.filters.growth,
        ...(action.payload || {}),
      };
    },

    setAlertFilters: (state, action) => {
      state.filters.alerts = {
        ...state.filters.alerts,
        ...(action.payload || {}),
      };
    },

    // ----------------------------
    // Retreat UI helpers
    // ----------------------------
    setSelectedRetreatId: (state, action) => {
      state.retreats.selectedId = action.payload || null;
    },

    // Optimistic update: used when toggling featured locally
    optimisticToggleFeatured: (state, action) => {
      const id = action.payload;
      const r = state.retreats.byId[id];
      if (r) r.isFeatured = !r.isFeatured;
    },

    // Optimistic reorder: update orders locally before server confirms
    optimisticReorderRetreats: (state, action) => {
      const items = Array.isArray(action.payload) ? action.payload : [];
      for (const it of items) {
        const r = state.retreats.byId[it.id];
        if (r && typeof it.order === "number") r.order = it.order;
      }
      sortRetreatIdsByOrder(state);
    },

    // Clear caches (useful after large operations)
    invalidateWellnessCache: (state, action) => {
      const section = action.payload;
      if (!section) {
        // clear everything
        for (const key of Object.keys(state.cache)) state.cache[key] = {};
        return;
      }
      if (state.cache[section]) state.cache[section] = {};
    },
  },

  extraReducers: (builder) => {
    /* ============================================================
       Generic pending/rejected helpers (per section)
    ============================================================ */

    const setPending = (state, section, requestId) => {
      state.loading[section] = true;
      state.error[section] = null;
      state.requestId[section] = requestId;
    };

    const setRejected = (state, section, action) => {
      // ignore outdated errors
      if (state.requestId[section] && action.meta.requestId !== state.requestId[section]) return;
      state.loading[section] = false;
      state.error[section] = action.payload || action.error?.message || "Request failed";
    };

    const acceptIfLatest = (state, section, action) => {
      if (state.requestId[section] && action.meta.requestId !== state.requestId[section]) return false;
      return true;
    };

    const cacheSet = (state, section, params, data) => {
      const key = buildKey(section, params || {});
      state.cache[section][key] = { data, fetchedAt: nowTs() };
    };

    // ----------------------------
    // Mood Dashboard
    // ----------------------------
    builder
      .addCase(fetchMoodDashboard.pending, (state, action) => {
        setPending(state, "moodDashboard", action.meta.requestId);
      })
      .addCase(fetchMoodDashboard.rejected, (state, action) => {
        setRejected(state, "moodDashboard", action);
      })
      .addCase(fetchMoodDashboard.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "moodDashboard", action)) return;
        state.loading.moodDashboard = false;
        state.moodDashboard = action.payload.data;
        cacheSet(state, "moodDashboard", action.payload.params, action.payload.data);
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Heatmap
    // ----------------------------
    builder
      .addCase(fetchHeatmap.pending, (state, action) => {
        setPending(state, "heatmap", action.meta.requestId);
      })
      .addCase(fetchHeatmap.rejected, (state, action) => {
        setRejected(state, "heatmap", action);
      })
      .addCase(fetchHeatmap.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "heatmap", action)) return;
        state.loading.heatmap = false;
        state.heatmap = action.payload.data;
        cacheSet(state, "heatmap", action.payload.params, action.payload.data);
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Risk Metrics
    // ----------------------------
    builder
      .addCase(fetchRiskMetrics.pending, (state, action) => {
        setPending(state, "risk", action.meta.requestId);
      })
      .addCase(fetchRiskMetrics.rejected, (state, action) => {
        setRejected(state, "risk", action);
      })
      .addCase(fetchRiskMetrics.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "risk", action)) return;
        state.loading.risk = false;
        state.riskMetrics = action.payload.data;
        cacheSet(state, "risk", action.payload.params, action.payload.data);
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Correlation
    // ----------------------------
    builder
      .addCase(fetchCorrelation.pending, (state, action) => {
        setPending(state, "correlation", action.meta.requestId);
      })
      .addCase(fetchCorrelation.rejected, (state, action) => {
        setRejected(state, "correlation", action);
      })
      .addCase(fetchCorrelation.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "correlation", action)) return;
        state.loading.correlation = false;
        state.correlation = action.payload.data;
        cacheSet(state, "correlation", action.payload.params, action.payload.data);
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Growth Index
    // ----------------------------
    builder
      .addCase(fetchGrowthIndex.pending, (state, action) => {
        setPending(state, "growth", action.meta.requestId);
      })
      .addCase(fetchGrowthIndex.rejected, (state, action) => {
        setRejected(state, "growth", action);
      })
      .addCase(fetchGrowthIndex.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "growth", action)) return;
        state.loading.growth = false;
        state.growthIndex = action.payload.data;
        cacheSet(state, "growth", action.payload.params, action.payload.data);
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Retreat Analytics
    // ----------------------------
    builder
      .addCase(fetchRetreatAnalytics.pending, (state, action) => {
        setPending(state, "retreatAnalytics", action.meta.requestId);
      })
      .addCase(fetchRetreatAnalytics.rejected, (state, action) => {
        setRejected(state, "retreatAnalytics", action);
      })
      .addCase(fetchRetreatAnalytics.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "retreatAnalytics", action)) return;
        state.loading.retreatAnalytics = false;
        state.retreatAnalytics = action.payload.data;
        cacheSet(state, "retreatAnalytics", action.payload.params, action.payload.data);
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Retreat Funnel
    // ----------------------------
    builder
      .addCase(fetchRetreatFunnel.pending, (state, action) => {
        setPending(state, "retreatFunnel", action.meta.requestId);
      })
      .addCase(fetchRetreatFunnel.rejected, (state, action) => {
        setRejected(state, "retreatFunnel", action);
      })
      .addCase(fetchRetreatFunnel.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "retreatFunnel", action)) return;
        state.loading.retreatFunnel = false;
        state.retreatFunnel = action.payload.data;
        cacheSet(state, "retreatFunnel", action.payload.params, action.payload.data);
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Retreats List
    // ----------------------------
    builder
      .addCase(fetchRetreats.pending, (state, action) => {
        setPending(state, "retreatsList", action.meta.requestId);
      })
      .addCase(fetchRetreats.rejected, (state, action) => {
        setRejected(state, "retreatsList", action);
      })
      .addCase(fetchRetreats.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "retreatsList", action)) return;
        state.loading.retreatsList = false;

        const rows = Array.isArray(action.payload.data) ? action.payload.data : [];
        // normalize
        for (const r of rows) upsertEntity(state, r);
        sortRetreatIdsByOrder(state);

        cacheSet(state, "retreatsList", action.payload.params, rows);
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Retreat Detail
    // ----------------------------
    builder
      .addCase(fetchRetreatById.pending, (state, action) => {
        setPending(state, "retreatDetail", action.meta.requestId);
      })
      .addCase(fetchRetreatById.rejected, (state, action) => {
        setRejected(state, "retreatDetail", action);
      })
      .addCase(fetchRetreatById.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "retreatDetail", action)) return;
        state.loading.retreatDetail = false;
        upsertEntity(state, action.payload.data);
        state.retreats.selectedId = action.payload.data?._id || null;
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Create Retreat
    // ----------------------------
    builder
      .addCase(createRetreat.pending, (state, action) => {
        setPending(state, "retreatCreate", action.meta.requestId);
      })
      .addCase(createRetreat.rejected, (state, action) => {
        setRejected(state, "retreatCreate", action);
      })
      .addCase(createRetreat.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "retreatCreate", action)) return;
        state.loading.retreatCreate = false;

        upsertEntity(state, action.payload);
        sortRetreatIdsByOrder(state);

        // invalidate caches that depend on retreats
        state.cache.retreatAnalytics = {};
        state.cache.retreatFunnel = {};
        state.cache.retreatsList = {};
        state.cache.overview = {};
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Update Retreat
    // ----------------------------
    builder
      .addCase(updateRetreat.pending, (state, action) => {
        setPending(state, "retreatUpdate", action.meta.requestId);
      })
      .addCase(updateRetreat.rejected, (state, action) => {
        setRejected(state, "retreatUpdate", action);
      })
      .addCase(updateRetreat.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "retreatUpdate", action)) return;
        state.loading.retreatUpdate = false;

        upsertEntity(state, action.payload);
        sortRetreatIdsByOrder(state);

        // invalidate dependent caches
        state.cache.retreatAnalytics = {};
        state.cache.retreatFunnel = {};
        state.cache.retreatsList = {};
        state.cache.overview = {};
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Delete Retreat (soft delete on backend)
    // ----------------------------
    builder
      .addCase(deleteRetreat.pending, (state, action) => {
        setPending(state, "retreatDelete", action.meta.requestId);
      })
      .addCase(deleteRetreat.rejected, (state, action) => {
        setRejected(state, "retreatDelete", action);
      })
      .addCase(deleteRetreat.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "retreatDelete", action)) return;
        state.loading.retreatDelete = false;

        const id = action.payload.id;
        // Keep it in store but mark inactive (best for audit + UI)
        const r = state.retreats.byId[id];
        if (r) r.isActive = false;

        // invalidate dependent caches
        state.cache.retreatAnalytics = {};
        state.cache.retreatFunnel = {};
        state.cache.retreatsList = {};
        state.cache.overview = {};
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Toggle Featured
    // ----------------------------
    builder
      .addCase(toggleFeaturedRetreat.pending, (state, action) => {
        setPending(state, "retreatFeature", action.meta.requestId);
      })
      .addCase(toggleFeaturedRetreat.rejected, (state, action) => {
        setRejected(state, "retreatFeature", action);
      })
      .addCase(toggleFeaturedRetreat.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "retreatFeature", action)) return;
        state.loading.retreatFeature = false;

        // If backend returns updated retreat, merge it.
        // Some controllers return { message, retreat } or just retreat.
        const payload = action.payload?.data;
        const updated =
          payload?.retreat ||
          payload?.data?.retreat ||
          payload?.retreatDoc ||
          (payload && payload._id ? payload : null);

        if (updated) upsertEntity(state, updated);

        // invalidate overview / analytics caches
        state.cache.retreatAnalytics = {};
        state.cache.overview = {};
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Reorder Retreats
    // ----------------------------
    builder
      .addCase(reorderRetreats.pending, (state, action) => {
        setPending(state, "retreatReorder", action.meta.requestId);
      })
      .addCase(reorderRetreats.rejected, (state, action) => {
        setRejected(state, "retreatReorder", action);
      })
      .addCase(reorderRetreats.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "retreatReorder", action)) return;
        state.loading.retreatReorder = false;

        // Apply ordering locally (server success confirmed)
        const items = Array.isArray(action.payload.items) ? action.payload.items : [];
        for (const it of items) {
          const r = state.retreats.byId[it.id];
          if (r && typeof it.order === "number") r.order = it.order;
        }
        sortRetreatIdsByOrder(state);

        // invalidate list cache (ordering changed)
        state.cache.retreatsList = {};
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Recalculate Stats
    // ----------------------------
    builder
      .addCase(recalculateRetreatStats.pending, (state, action) => {
        setPending(state, "retreatRecalculate", action.meta.requestId);
      })
      .addCase(recalculateRetreatStats.rejected, (state, action) => {
        setRejected(state, "retreatRecalculate", action);
      })
      .addCase(recalculateRetreatStats.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "retreatRecalculate", action)) return;
        state.loading.retreatRecalculate = false;

        // Try to merge returned computed stats into retreat
        const id = action.payload.id;
        const payload = action.payload.data;
        const stats =
          payload?.retreat ||
          payload?.retreatDoc ||
          payload?.data?.retreat ||
          payload?.retreatStats ||
          payload?.retreat_stats ||
          null;

        const r = state.retreats.byId[id];
        if (r && stats) {
          // If stats is full retreat doc
          if (stats._id) {
            upsertEntity(state, stats);
          } else {
            // If stats is partial fields
            Object.assign(r, stats);
          }
        }

        state.cache.retreatAnalytics = {};
        state.cache.overview = {};
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Alerts
    // ----------------------------
    builder
      .addCase(fetchAlerts.pending, (state, action) => {
        setPending(state, "alerts", action.meta.requestId);
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        setRejected(state, "alerts", action);
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "alerts", action)) return;
        state.loading.alerts = false;
        state.alerts = action.payload.data;
        cacheSet(state, "alerts", action.payload.params, action.payload.data);
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Overview
    // ----------------------------
    builder
      .addCase(fetchOverview.pending, (state, action) => {
        setPending(state, "overview", action.meta.requestId);
      })
      .addCase(fetchOverview.rejected, (state, action) => {
        setRejected(state, "overview", action);
      })
      .addCase(fetchOverview.fulfilled, (state, action) => {
        if (!acceptIfLatest(state, "overview", action)) return;
        state.loading.overview = false;
        state.overview = action.payload.data;
        cacheSet(state, "overview", action.payload.params, action.payload.data);
        state.lastUpdatedAt = nowTs();
      });

    // ----------------------------
    // Composite loader
    // ----------------------------
    builder
      .addCase(loadWellnessPage.pending, (state) => {
        // not a real section; avoid blocking UI; you can track separately if you want
        state.error.overview = null;
      })
      .addCase(loadWellnessPage.rejected, (state, action) => {
        // show something if overview fails
        state.error.overview = action.payload || action.error?.message || "Failed to load wellness page";
      })
      .addCase(loadWellnessPage.fulfilled, (state) => {
        state.lastUpdatedAt = nowTs();
      });
  },
});

/* ============================================================
   Actions
============================================================ */

export const {
  resetWellnessState,
  clearWellnessError,
  clearSectionError,
  setWellnessFilters,
  setWellnessDateRange,
  setWellnessTimezoneOffset,
  setIncludeInactive,
  setFunnelRetreatId,
  setCorrelationFilters,
  setGrowthFilters,
  setAlertFilters,
  setSelectedRetreatId,
  optimisticToggleFeatured,
  optimisticReorderRetreats,
  invalidateWellnessCache,
} = wellnessSlice.actions;

/* ============================================================
   Selectors
============================================================ */

const selectWellness = (state) => state.wellness;

// Filters
export const selectWellnessFilters = (state) => selectWellness(state).filters;

// Mood
export const selectMoodDashboard = (state) => selectWellness(state).moodDashboard;
export const selectHeatmap = (state) => selectWellness(state).heatmap;
export const selectRiskMetrics = (state) => selectWellness(state).riskMetrics;
export const selectCorrelation = (state) => selectWellness(state).correlation;
export const selectGrowthIndex = (state) => selectWellness(state).growthIndex;

// Retreat analytics
export const selectRetreatAnalytics = (state) => selectWellness(state).retreatAnalytics;
export const selectRetreatFunnel = (state) => selectWellness(state).retreatFunnel;

// Alerts & overview
export const selectWellnessAlerts = (state) => selectWellness(state).alerts;
export const selectWellnessOverview = (state) => selectWellness(state).overview;

// Loading and errors
export const selectWellnessLoading = (state) => selectWellness(state).loading;
export const selectWellnessErrors = (state) => selectWellness(state).error;

// Retreats normalized
export const selectRetreatById = (state, id) => selectWellness(state).retreats.byId[id] || null;
export const selectSelectedRetreatId = (state) => selectWellness(state).retreats.selectedId;

export const selectSelectedRetreat = createSelector(
  [selectWellness, selectSelectedRetreatId],
  (wellness, selectedId) => {
    if (!selectedId) return null;
    return wellness.retreats.byId[selectedId] || null;
  }
);

export const selectAllRetreats = createSelector([selectWellness], (wellness) => {
  return wellness.retreats.ids.map((id) => wellness.retreats.byId[id]).filter(Boolean);
});

export const selectActiveRetreats = createSelector([selectAllRetreats], (retreats) =>
  retreats.filter((r) => r.isActive !== false)
);

export const selectFeaturedRetreats = createSelector([selectAllRetreats], (retreats) =>
  retreats.filter((r) => r.isFeatured)
);

/* ============================================================
   Cache selectors (optional)
   Useful if you want to show last cached data while revalidating
============================================================ */

export const selectCachedMoodDashboard = (state, params = {}) => {
  const key = buildKey("moodDashboard", params);
  return selectWellness(state).cache.moodDashboard[key]?.data || null;
};

export const selectCachedOverview = (state, params = {}) => {
  const key = buildKey("overview", params);
  return selectWellness(state).cache.overview[key]?.data || null;
};

/* ============================================================
   Export reducer
============================================================ */

export default wellnessSlice.reducer;