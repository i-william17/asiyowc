import axios from "axios";
import { server } from "../server";

/* ============================================================
   ADMIN EVENTS SERVICE
   (same structure style as mentorsService)
============================================================ */
export const eventsService = {

  /* ============================================================
     LIST EVENTS (ADMIN)
     GET /admin/events
     params: { page, limit, status, search }
  ============================================================ */
  listEvents: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/events`,
      {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

  /* ============================================================
     GET EVENT BY ID (DETAIL - ADMIN)
     GET /admin/events/:id
  ============================================================ */
  getEventById: async (id, token) => {
    const res = await axios.get(
      `${server}/admin/events/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

  /* ============================================================
     CREATE EVENT
     POST /admin/events
  ============================================================ */
  createEvent: async (data, token) => {
    const res = await axios.post(
      `${server}/admin/events`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

  /* ============================================================
     UPDATE EVENT
     PUT /admin/events/:id
  ============================================================ */
  updateEvent: async (id, data, token) => {
    const res = await axios.put(
      `${server}/admin/events/${id}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

  /* ============================================================
     DELETE EVENT
     DELETE /admin/events/:id
  ============================================================ */
  deleteEvent: async (id, token) => {
    const res = await axios.delete(
      `${server}/admin/events/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

};
