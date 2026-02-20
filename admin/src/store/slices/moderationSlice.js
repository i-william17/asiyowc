// src/store/slices/moderationSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { moderationService } from "../../services/moderation";

/* ============================================================
   LIST REPORTS (QUEUE)
============================================================ */
export const fetchReports = createAsyncThunk(
  "moderation/fetchReports",
  async (
    { resolved, targetType, search, page = 1, limit = 20, sort = "newest" } = {},
    { getState, rejectWithValue }
  ) => {
    try {
      const { token } = getState().auth;

      const res = await moderationService.listReports(
        { resolved, targetType, search, page, limit, sort },
        token
      );

      // Backend returns: { success, message, data, page, limit, total, pages }
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch reports"
      );
    }
  }
);

/* ============================================================
   GET SINGLE REPORT
============================================================ */
export const fetchReportById = createAsyncThunk(
  "moderation/fetchReportById",
  async (reportId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      const res = await moderationService.getReportById(reportId, token);

      return res.data; // { success, data }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch report"
      );
    }
  }
);

/* ============================================================
   RESOLVE / REOPEN REPORT
============================================================ */
export const setReportResolved = createAsyncThunk(
  "moderation/setReportResolved",
  async ({ reportId, resolved }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      const res = await moderationService.setResolved(reportId, resolved, token);

      return { reportId, resolved, payload: res.data };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update report"
      );
    }
  }
);

/* ============================================================
   TAKE MODERATION ACTION
============================================================ */
export const takeModerationAction = createAsyncThunk(
  "moderation/takeModerationAction",
  async ({ reportId, action, days = 7, note = "" }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      const res = await moderationService.takeAction(
        reportId,
        { action, days, note },
        token
      );

      // backend returns: { success, data: { report, enforcement } }
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to apply moderation action"
      );
    }
  }
);

/* ============================================================
   DELETE REPORT (OPTIONAL)
============================================================ */
export const deleteReport = createAsyncThunk(
  "moderation/deleteReport",
  async (reportId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      const res = await moderationService.deleteReport(reportId, token);

      return { reportId, payload: res.data };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete report"
      );
    }
  }
);

/* ============================================================
   SLICE
============================================================ */
const moderationSlice = createSlice({
  name: "moderation",

  initialState: {
    reports: [],
    reportsLoading: false,

    // pagination/meta from backend
    total: 0,
    pages: 0,
    page: 1,
    limit: 20,

    // filters (store UI state here so your page can persist)
    filters: {
      resolved: "false",   // "true" | "false" | undefined
      targetType: "",      // "post"|"hub"|"group"|"chat"|"user"|"voice"| ""
      search: "",
      sort: "newest",
    },

    selectedReport: null,
    selectedLoading: false,

    actionLoading: false,

    error: null,
  },

  reducers: {
    clearModerationError: (state) => {
      state.error = null;
    },

    setModerationFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    clearSelectedReport: (state) => {
      state.selectedReport = null;
      state.selectedLoading = false;
    },
  },

  extraReducers: (builder) => {
    builder

      /* ============================================================
         FETCH REPORTS
      ============================================================= */
      .addCase(fetchReports.pending, (state) => {
        state.reportsLoading = true;
        state.error = null;
      })

      .addCase(fetchReports.fulfilled, (state, action) => {
        state.reportsLoading = false;

        // full payload
        // { success, message, data, page, limit, total, pages }
        const payload = action.payload;

        state.reports = payload?.data || [];
        state.page = payload?.page ?? state.page;
        state.limit = payload?.limit ?? state.limit;
        state.total = payload?.total ?? 0;
        state.pages = payload?.pages ?? 0;
      })

      .addCase(fetchReports.rejected, (state, action) => {
        state.reportsLoading = false;
        state.error = action.payload;
      })

      /* ============================================================
         FETCH SINGLE REPORT
      ============================================================= */
      .addCase(fetchReportById.pending, (state) => {
        state.selectedLoading = true;
        state.error = null;
      })

      .addCase(fetchReportById.fulfilled, (state, action) => {
        state.selectedLoading = false;
        state.selectedReport = action.payload?.data || null;
      })

      .addCase(fetchReportById.rejected, (state, action) => {
        state.selectedLoading = false;
        state.error = action.payload;
      })

      /* ============================================================
         RESOLVE / REOPEN
      ============================================================= */
      .addCase(setReportResolved.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })

      .addCase(setReportResolved.fulfilled, (state, action) => {
        state.actionLoading = false;

        const { reportId, resolved, payload } = action.payload;

        // backend returns updated report doc in payload.data (your controller uses ok(res, report,...))
        const updatedReport = payload?.data || null;

        // update in list
        state.reports = state.reports.map((r) =>
          String(r._id) === String(reportId)
            ? {
                ...r,
                ...(updatedReport || {}),
                resolved,
                status: resolved ? "resolved" : "pending",
              }
            : r
        );

        // update selected
        if (state.selectedReport && String(state.selectedReport._id) === String(reportId)) {
          state.selectedReport = {
            ...state.selectedReport,
            ...(updatedReport || {}),
            resolved,
            status: resolved ? "resolved" : "pending",
          };
        }
      })

      .addCase(setReportResolved.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      /* ============================================================
         TAKE ACTION
      ============================================================= */
      .addCase(takeModerationAction.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })

      .addCase(takeModerationAction.fulfilled, (state, action) => {
        state.actionLoading = false;

        // backend returns: { success, data: { report, enforcement } }
        const report = action.payload?.data?.report || null;

        if (report) {
          // update list
          state.reports = state.reports.map((r) =>
            String(r._id) === String(report._id) ? { ...r, ...report } : r
          );

          // update selected
          if (state.selectedReport && String(state.selectedReport._id) === String(report._id)) {
            state.selectedReport = { ...state.selectedReport, ...report };
          }
        }
      })

      .addCase(takeModerationAction.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      /* ============================================================
         DELETE REPORT
      ============================================================= */
      .addCase(deleteReport.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })

      .addCase(deleteReport.fulfilled, (state, action) => {
        state.actionLoading = false;

        const { reportId } = action.payload;

        state.reports = state.reports.filter(
          (r) => String(r._id) !== String(reportId)
        );

        if (state.selectedReport && String(state.selectedReport._id) === String(reportId)) {
          state.selectedReport = null;
        }

        // adjust totals optimistically
        state.total = Math.max(0, (state.total || 0) - 1);
      })

      .addCase(deleteReport.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearModerationError,
  setModerationFilters,
  clearSelectedReport,
} = moderationSlice.actions;

export default moderationSlice.reducer;
