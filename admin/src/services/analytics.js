import axios from "axios";
import { server } from "../server";

/* ============================================================
   ADMIN ANALYTICS SERVICE
   - Dropdown-ready
   - Layer-based
   - Date-range aware
============================================================ */
export const analyticsService = {

  /* ============================================================
     OVERVIEW SNAPSHOT
     GET /admin/analytics/overview
     params: { from, to, granularity, tz }
  ============================================================ */
  getOverview: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/analytics/overview`,
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
     DROPDOWN LAYER SWITCH
     GET /admin/analytics/layer
     params: { key, from, to, granularity, limit, tz, minutes }
  ============================================================ */
  getLayer: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/analytics/layer`,
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
     👥 USER & COMMUNITY HEALTH
     GET /admin/analytics/user-community
  ============================================================ */
  getUserCommunityHealth: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/analytics/user-community`,
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
     💬 SOCIAL ENGAGEMENT
     GET /admin/analytics/social-engagement
  ============================================================ */
  getSocialEngagement: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/analytics/social-engagement`,
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
     🎓 LEARNING & PROGRAMS
     GET /admin/analytics/learning-programs
  ============================================================ */
  getLearningPrograms: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/analytics/learning-programs`,
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
     💰 FINANCIAL & TRANSACTIONS
     GET /admin/analytics/financial-transactions
  ============================================================ */
  getFinancialTransactions: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/analytics/financial-transactions`,
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
     🛍 MARKETPLACE & ECONOMY
     GET /admin/analytics/marketplace-economy
  ============================================================ */
  getMarketplaceEconomy: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/analytics/marketplace-economy`,
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
     🎤 REAL-TIME / LIVE ACTIVITY
     GET /admin/analytics/realtime
     params: { minutes, limit }
  ============================================================ */
  getRealtimeLiveActivity: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/analytics/realtime`,
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
     🛡 MODERATION & SAFETY
     GET /admin/analytics/moderation-safety
  ============================================================ */
  getModerationSafety: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/analytics/moderation-safety`,
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
     📈 GROWTH & RETENTION
     GET /admin/analytics/growth-retention
  ============================================================ */
  getGrowthRetention: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/analytics/growth-retention`,
      {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

};