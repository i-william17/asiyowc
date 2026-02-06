// store/slices/eventSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { eventService } from "../../services/event";

/* ============================================================
   THUNKS
============================================================ */

/* =========================
   FETCH EVENTS (PUBLIC)
========================= */
export const fetchEvents = createAsyncThunk(
  "events/fetchEvents",
  async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const res = await eventService.getEvents(page, limit);
      return res; // { events, page, pages }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);


/* =========================
   FETCH SINGLE
========================= */
export const fetchEventById = createAsyncThunk(
  "events/fetchEventById",
  async (eventId, { rejectWithValue }) => {
    try {
      return await eventService.getEventById(eventId);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);


/* =========================
   RSVP
========================= */
export const rsvpEvent = createAsyncThunk(
  "events/rsvpEvent",
  async ({ eventId, token }, { rejectWithValue }) => {
    try {
      await eventService.rsvp(eventId, token);
      return eventId;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);


/* =========================
   CANCEL RSVP
========================= */
export const cancelRsvpEvent = createAsyncThunk(
  "events/cancelRsvpEvent",
  async ({ eventId, token }, { rejectWithValue }) => {
    try {
      await eventService.cancelRsvp(eventId, token);
      return eventId;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);


/* =========================
   MY EVENTS
========================= */
export const fetchMyRegisteredEvents = createAsyncThunk(
  "events/fetchMyRegisteredEvents",
  async (token, { rejectWithValue }) => {
    try {
      return await eventService.getMyRegisteredEvents(token);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);


/* ============================================================
   INITIAL STATE
============================================================ */

const initialState = {
  events: [],
  myEvents: [],
  currentEvent: null,

  loading: false,
  actionLoading: false,
  error: null,

  page: 1,
  pages: 1
};


/* ============================================================
   SLICE
============================================================ */

const eventSlice = createSlice({
  name: "events",
  initialState,

  reducers: {
    clearEventError: (state) => {
      state.error = null;
    },

    clearCurrentEvent: (state) => {
      state.currentEvent = null;
    }
  },

  extraReducers: (builder) => {

    /* ================= FETCH EVENTS ================= */
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload.events;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });


    /* ================= FETCH SINGLE ================= */
    builder
      .addCase(fetchEventById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchEventById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentEvent = action.payload;
      })
      .addCase(fetchEventById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });


    /* ================= RSVP (optimistic) ================= */
    builder
      .addCase(rsvpEvent.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(rsvpEvent.fulfilled, (state, action) => {
        state.actionLoading = false;

        const event = state.events.find(e => e._id === action.payload);
        if (event) {
          event.isRegistered = true;
          event.attendeeCount = (event.attendeeCount || 0) + 1;
        }

        if (state.currentEvent?._id === action.payload) {
          state.currentEvent.isRegistered = true;
        }
      })
      .addCase(rsvpEvent.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });


    /* ================= CANCEL RSVP ================= */
    builder
      .addCase(cancelRsvpEvent.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(cancelRsvpEvent.fulfilled, (state, action) => {
        state.actionLoading = false;

        const event = state.events.find(e => e._id === action.payload);
        if (event) {
          event.isRegistered = false;
          event.attendeeCount = Math.max((event.attendeeCount || 1) - 1, 0);
        }

        if (state.currentEvent?._id === action.payload) {
          state.currentEvent.isRegistered = false;
        }
      })
      .addCase(cancelRsvpEvent.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });


    /* ================= MY EVENTS ================= */
    builder
      .addCase(fetchMyRegisteredEvents.fulfilled, (state, action) => {
        state.myEvents = action.payload;
      });
  }
});


/* ============================================================
   EXPORTS
============================================================ */

export const {
  clearEventError,
  clearCurrentEvent
} = eventSlice.actions;

export default eventSlice.reducer;
