// services/savings.js
import axios from "axios";
import { server } from "../server";

/* ============================================================
   AXIOS INSTANCE
============================================================ */

const api = axios.create({
  baseURL: server, // e.g. http://192.168.1.112:5000/api
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
   SAVINGS SERVICE (BACKEND-ALIGNED)
============================================================ */

export const savingsService = {
  /* ============================================================
     PODS
  ============================================================ */

  /* =========================
     CREATE POD
  ========================= */

  // POST /pods
  createPod: async (payload, token) => {
    const res = await api.post(
      "/savings/pods",
      payload,
      { headers: authHeaders(token) }
    );

    return res.data; // { pod }
  },

  /**
   * GET /api/savings/pods/my
   * Returns pods where user is creator or active member
   */
  getMyPods: async (token) => {
    const res = await api.get("/savings/pods/my", {
      headers: authHeaders(token),
    });
    return res.data; // { pods }
  },

  /**
   * GET /api/savings/pods/discover?page=&limit=
   * Returns public pods only
   */
  discoverPods: async (token, page = 1, limit = 10) => {
    const res = await api.get("/savings/pods/discover", {
      headers: authHeaders(token),
      params: { page, limit },
    });
    return res.data; // { pods, page }
  },

  /**
   * GET /api/savings/pods/:podId
   * Fully populated pod
   */
  getPodById: async (podId, token) => {
    if (!podId) throw new Error("Pod ID missing");

    const res = await api.get(`/savings/pods/${podId}`, {
      headers: authHeaders(token),
    });

    return res.data; // { pod, isMember }
  },

  /**
   * POST /api/savings/pods/:podId/join
   */
  joinPod: async (podId, token) => {
    if (!podId) throw new Error("Pod ID missing");

    const res = await api.post(
      `/savings/pods/${podId}/join`,
      {},
      { headers: authHeaders(token) }
    );

    return res.data;
  },

  /**
   * POST /api/savings/pods/:podId/leave
   */
  leavePod: async (podId, token) => {
    if (!podId) throw new Error("Pod ID missing");

    const res = await api.post(
      `/savings/pods/${podId}/leave`,
      {},
      { headers: authHeaders(token) }
    );

    return res.data;
  },

  /* ============================================================
     CONTRIBUTIONS
  ============================================================ */

  /**
   * GET /api/savings/contributions/my
   * Returns user contribution statement
   */
  getMyContributions: async (token) => {
    const res = await api.get("/savings/contributions/my", {
      headers: authHeaders(token),
    });
    return res.data; // { contributions }
  },

  /**
   * POST /api/savings/pods/:podId/contribute/checkout
   * Creates M-Pesa payment intent
   */
  createContributionCheckout: async (podId, token) => {
    if (!podId) throw new Error("Pod ID missing");

    const res = await api.post(
      `/savings/pods/${podId}/contribute/checkout`,
      {},
      { headers: authHeaders(token) }
    );

    return res.data; // { intentId, redirectUrl }
  },

  /* ============================================================
     WITHDRAWALS
  ============================================================ */

  /**
   * POST /api/savings/pods/:podId/withdraw
   */
  requestWithdrawal: async (podId, payload, token) => {
    if (!podId) throw new Error("Pod ID missing");

    const res = await api.post(
      `/savings/pods/${podId}/withdraw`,
      payload,
      { headers: authHeaders(token) }
    );

    return res.data;
  },

  /**
   * GET /api/savings/pods/:podId/withdrawals
   */
  getPodWithdrawals: async (podId, token) => {
    if (!podId) throw new Error("Pod ID missing");

    const res = await api.get(
      `/savings/pods/${podId}/withdrawals`,
      { headers: authHeaders(token) }
    );

    return res.data; // { withdrawals }
  },
};
