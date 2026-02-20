import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { eventsService } from "../../services/events";

/* ============================================================
   INITIAL STATE
============================================================ */
const initialState = {
  /* ================= LIST ================= */
  events: [],
  eventsLoading: false,

  /* ================= SELECTED ================= */
  selectedEvent: null,
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
  },

  /* ================= ERROR ================= */
  error: null,
};

/* ============================================================
   ASYNC THUNKS
============================================================ */

/* ================= FETCH EVENTS ================= */
export const fetchAdminEvents = createAsyncThunk(
  "adminEvents/fetchEvents",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { filters } = getState().events;
      const token = getState().auth.token;

      const res = await eventsService.listEvents(filters, token);
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || "Failed to fetch events"
      );
    }
  }
);

/* ================= FETCH EVENT BY ID ================= */
export const fetchAdminEventById = createAsyncThunk(
  "adminEvents/fetchEventById",
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const res = await eventsService.getEventById(id, token);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || "Failed to fetch event"
      );
    }
  }
);

/* ================= CREATE EVENT ================= */
export const createEvent = createAsyncThunk(
  "adminEvents/create",
  async (data, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const res = await eventsService.createEvent(data, token);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || "Failed to create event"
      );
    }
  }
);

/* ================= UPDATE EVENT ================= */
export const updateEvent = createAsyncThunk(
  "adminEvents/update",
  async ({ id, data }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const res = await eventsService.updateEvent(id, data, token);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || "Failed to update event"
      );
    }
  }
);

/* ================= DELETE EVENT ================= */
export const deleteEvent = createAsyncThunk(
  "adminEvents/delete",
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      await eventsService.deleteEvent(id, token);
      return id;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || "Failed to delete event"
      );
    }
  }
);

/* ============================================================
   SLICE
============================================================ */
const eventsSlice = createSlice({
  name: "events",
  initialState,
  reducers: {
    setEventFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearSelectedEvent: (state) => {
      state.selectedEvent = null;
    },
    clearEventError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {

    /* ================= LIST ================= */
    builder
      .addCase(fetchAdminEvents.pending, (state) => {
        state.eventsLoading = true;
      })
      .addCase(fetchAdminEvents.fulfilled, (state, action) => {
        state.eventsLoading = false;

        const { data, page, pages, total, limit } = action.payload;

        state.events = data || [];
        state.pagination = { page, pages, total, limit };
      })
      .addCase(fetchAdminEvents.rejected, (state, action) => {
        state.eventsLoading = false;
        state.error = action.payload;
      });

    /* ================= FETCH ONE ================= */
    builder
      .addCase(fetchAdminEventById.pending, (state) => {
        state.selectedLoading = true;
      })
      .addCase(fetchAdminEventById.fulfilled, (state, action) => {
        state.selectedLoading = false;
        state.selectedEvent = action.payload;
      })
      .addCase(fetchAdminEventById.rejected, (state, action) => {
        state.selectedLoading = false;
        state.error = action.payload;
      });

    /* ================= CREATE ================= */
    builder.addCase(createEvent.fulfilled, (state, action) => {
      state.events.unshift(action.payload);
    });

    /* ================= UPDATE ================= */
    builder.addCase(updateEvent.fulfilled, (state, action) => {
      state.selectedEvent = action.payload;

      const index = state.events.findIndex(
        (e) => e._id === action.payload._id
      );

      if (index !== -1) {
        state.events[index] = action.payload;
      }
    });

    /* ================= DELETE ================= */
    builder.addCase(deleteEvent.fulfilled, (state, action) => {
      state.events = state.events.filter(
        (e) => e._id !== action.payload
      );
    });

  },
});

export const {
  setEventFilters,
  clearSelectedEvent,
  clearEventError,
} = eventsSlice.actions;

export default eventsSlice.reducer;
