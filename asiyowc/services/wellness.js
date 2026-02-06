// services/wellness.js

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
   WELLNESS SERVICE (BACKEND-ALIGNED)
============================================================ */

export const wellnessService = {

  /* ============================================================
     ================= JOURNAL ===============================
  ============================================================ */

  /**
   * GET /api/wellness/journal/today
   */
  getTodayJournal: async (token) => {
    const res = await api.get(
      "/wellness/journal/today",
      { headers: authHeaders(token) }
    );

    return res.data;
  },


  /**
   * POST /api/wellness/journal/save
   */
  saveJournal: async (payload, token) => {
    const res = await api.post(
      "/wellness/journal/save",
      payload,
      { headers: authHeaders(token) }
    );

    return res.data;
  },


  /**
   * GET /api/wellness/journal/history
   */
  getJournalHistory: async (token) => {
    const res = await api.get(
      "/wellness/journal/history",
      { headers: authHeaders(token) }
    );

    return res.data;
  },





  /* ============================================================
     ================= RETREATS ===============================
  ============================================================ */

  /**
   * GET /api/wellness/retreats
   */
  getRetreats: async (token) => {
    const res = await api.get(
      "/wellness/retreats",
      { headers: authHeaders(token) }
    );

    return res.data;
  },


  /**
   * GET /api/wellness/retreat/:id
   */
  getRetreatById: async (id, token) => {
    if (!id) throw new Error("Retreat ID missing");

    const res = await api.get(
      `/wellness/retreat/${id}`,
      { headers: authHeaders(token) }
    );

    return res.data;
  },


  /**
   * POST /api/wellness/retreat/:id/join
   */
  joinRetreat: async (id, token) => {
    if (!id) throw new Error("Retreat ID missing");

    const res = await api.post(
      `/wellness/retreat/${id}/join`,
      {},
      { headers: authHeaders(token) }
    );

    return res.data;
  },


  /**
   * POST /api/wellness/retreat/:id/progress
   * body: { progress, minutesWatched }
   */
  updateRetreatProgress: async (id, payload, token) => {
    if (!id) throw new Error("Retreat ID missing");

    const res = await api.post(
      `/wellness/retreat/${id}/progress`,
      payload,
      { headers: authHeaders(token) }
    );

    return res.data;
  },


  /**
   * GET /api/wellness/retreat/progress/me
   */
  getMyRetreatProgress: async (token) => {
    const res = await api.get(
      "/wellness/retreat/progress/me",
      { headers: authHeaders(token) }
    );

    return res.data;
  },
};
