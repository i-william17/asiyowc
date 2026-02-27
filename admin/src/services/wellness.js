import axios from "axios";
import { server } from "../server";

/* ============================================================
   ADMIN WELLNESS SERVICE
   - Connects to /admin/wellness endpoints
   - Follows same structure as eventsService
============================================================ */

export const adminWellnessService = {

  /* ============================================================
     ===================== MOOD ===============================
  ============================================================ */

  /* ================= DASHBOARD =================
     GET /admin/wellness/mood/dashboard
     params: { days, from, to }
  ============================================================ */
  getMoodDashboard: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/wellness/mood/dashboard`,
      {
        params,
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

  /* ================= HEATMAP =================
     GET /admin/wellness/mood/heatmap
     params: { days, from, to, tzOffsetMin }
  ============================================================ */
  getMoodHeatmap: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/wellness/mood/heatmap`,
      {
        params,
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

  /* ================= RISK METRICS =================
     GET /admin/wellness/mood/risk
     params: { days, from, to, lowMoodCutoff }
  ============================================================ */
  getMoodRisk: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/wellness/mood/risk`,
      {
        params,
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

  /* ================= CORRELATION =================
     GET /admin/wellness/mood/correlation
     params: { days, beforeDays, afterDays, minSamples }
  ============================================================ */
  getMoodCorrelation: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/wellness/mood/correlation`,
      {
        params,
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

  /* ================= GROWTH INDEX =================
     GET /admin/wellness/mood/growth
     params: { windowDays, edgeDays, minSamples }
  ============================================================ */
  getGrowthIndex: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/wellness/mood/growth`,
      {
        params,
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

  /* ============================================================
     ================= RETREAT ANALYTICS =======================
  ============================================================ */

  /* ================= ANALYTICS =================
     GET /admin/wellness/retreats/analytics
     params: { includeInactive }
  ============================================================ */
  getRetreatAnalytics: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/wellness/retreats/analytics`,
      {
        params,
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

  /* ================= DROP-OFF FUNNEL =================
     GET /admin/wellness/retreats/funnel
     params: { retreatId }
  ============================================================ */
  getRetreatFunnel: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/wellness/retreats/funnel`,
      {
        params,
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

  /* ============================================================
     ================= RETREAT CRUD ============================
  ============================================================ */

  /* ================= LIST RETREATS =================
     GET /admin/wellness/retreats
  ============================================================ */
  listRetreats: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/wellness/retreats`,
      {
        params,
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

  /* ================= GET RETREAT BY ID =================
     GET /admin/wellness/retreats/:id
  ============================================================ */
  getRetreatById: async (id, token) => {
    const res = await axios.get(
      `${server}/admin/wellness/retreats/${id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

  /* ================= CREATE RETREAT =================
     POST /admin/wellness/retreats
  ============================================================ */
  createRetreat: async (data, token) => {
    const res = await axios.post(
      `${server}/admin/wellness/retreats`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

  /* ================= UPDATE RETREAT =================
     PUT /admin/wellness/retreats/:id
  ============================================================ */
  updateRetreat: async (id, data, token) => {
    const res = await axios.put(
      `${server}/admin/wellness/retreats/${id}`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

  /* ================= TOGGLE FEATURED =================
     PATCH /admin/wellness/retreats/:id/feature
  ============================================================ */
  toggleFeatured: async (id, token) => {
    const res = await axios.patch(
      `${server}/admin/wellness/retreats/${id}/feature`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

  /* ================= REORDER RETREATS =================
     PATCH /admin/wellness/retreats/reorder
  ============================================================ */
  reorderRetreats: async (data, token) => {
    const res = await axios.patch(
      `${server}/admin/wellness/retreats/reorder`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

  /* ================= RECALCULATE STATS =================
     PATCH /admin/wellness/retreats/:id/recalculate
  ============================================================ */
  recalculateRetreatStats: async (id, token) => {
    const res = await axios.patch(
      `${server}/admin/wellness/retreats/${id}/recalculate`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

  /* ================= DELETE RETREAT =================
     DELETE /admin/wellness/retreats/:id
  ============================================================ */
  deleteRetreat: async (id, token) => {
    const res = await axios.delete(
      `${server}/admin/wellness/retreats/${id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

  /* ============================================================
     ================= ALERT SYSTEM ============================
  ============================================================ */

  /* ================= GET ALERTS =================
     GET /admin/wellness/alerts
     params: { windowDays, baselineDays, ... }
  ============================================================ */
  getWellnessAlerts: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/wellness/alerts`,
      {
        params,
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

  /* ============================================================
     ================= FULL OVERVIEW ===========================
  ============================================================ */

  /* ================= OVERVIEW =================
     GET /admin/wellness/overview
     params: { days, from, to }
  ============================================================ */
  getWellnessOverview: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/wellness/overview`,
      {
        params,
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res;
  },

};