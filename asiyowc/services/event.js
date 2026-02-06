// services/events.js
import axios from "axios";
import { server } from "../server";

/* ============================================================
   AXIOS INSTANCE
============================================================ */

const api = axios.create({
  baseURL: server, // http://xxx/api
  timeout: 20000,
});


/* ============================================================
   AUTH HEADERS
============================================================ */

const authHeaders = (token) => {
  if (!token) throw new Error("Auth token missing");

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};


/* ============================================================
   EVENTS SERVICE (BACKEND-ALIGNED)
============================================================ */

export const eventService = {

  /* ============================================================
     PUBLIC EVENTS
  ============================================================ */

  /**
   * GET /api/events?page=&limit=
   * Returns published events (paginated)
   */
  getEvents: async (page = 1, limit = 10) => {
    const res = await api.get("/events", {
      params: { page, limit },
    });

    return res.data; // { events, page, pages }
  },

  /**
   * GET /api/events/:id
   */
  getEventById: async (eventId) => {
    if (!eventId) throw new Error("Event ID missing");

    const res = await api.get(`/events/${eventId}`);

    return res.data;
  },


  /* ============================================================
     REGISTRATION
  ============================================================ */

  /**
   * POST /api/events/:id/rsvp
   */
  rsvp: async (eventId, token) => {
    if (!eventId) throw new Error("Event ID missing");

    const res = await api.post(
      `/events/${eventId}/rsvp`,
      {},
      { headers: authHeaders(token) }
    );

    return res.data;
  },

  /**
   * DELETE /api/events/:id/rsvp
   */
  cancelRsvp: async (eventId, token) => {
    if (!eventId) throw new Error("Event ID missing");

    const res = await api.delete(
      `/events/${eventId}/rsvp`,
      { headers: authHeaders(token) }
    );

    return res.data;
  },

  /**
   * POST /api/events/:id/checkin
   */
  checkIn: async (eventId, token) => {
    if (!eventId) throw new Error("Event ID missing");

    const res = await api.post(
      `/events/${eventId}/checkin`,
      {},
      { headers: authHeaders(token) }
    );

    return res.data;
  },


  /* ============================================================
     USER EVENTS
  ============================================================ */

  /**
   * GET /api/events/me/registered
   */
  getMyRegisteredEvents: async (token) => {
    const res = await api.get("/events/me/registered", {
      headers: authHeaders(token),
    });

    return res.data;
  },

  /**
   * GET /api/events/me/organized
   */
  getMyOrganizedEvents: async (token) => {
    const res = await api.get("/events/me/organized", {
      headers: authHeaders(token),
    });

    return res.data;
  },


  /* ============================================================
     ORGANIZER
  ============================================================ */

  /**
   * POST /api/events
   */
  createEvent: async (payload, token) => {
    const res = await api.post(
      "/events",
      payload,
      { headers: authHeaders(token) }
    );

    return res.data;
  },

  /**
   * PUT /api/events/:id
   */
  updateEvent: async (eventId, payload, token) => {
    if (!eventId) throw new Error("Event ID missing");

    const res = await api.put(
      `/events/${eventId}`,
      payload,
      { headers: authHeaders(token) }
    );

    return res.data;
  },

  /**
   * DELETE /api/events/:id
   */
  deleteEvent: async (eventId, token) => {
    if (!eventId) throw new Error("Event ID missing");

    const res = await api.delete(
      `/events/${eventId}`,
      { headers: authHeaders(token) }
    );

    return res.data;
  },
};
