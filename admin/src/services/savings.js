// src/services/savings.js
import axios from "axios";
import { server } from "../server";

/* ============================================================
   ADMIN SAVINGS SERVICE
   (same structure style as marketplaceService)
============================================================ */
export const savingsService = {

  /* ============================================================
     LIST SAVINGS PODS (ADMIN)
     GET /admin/savings/pods
     params: { page, limit, search, status, category }
  ============================================================ */
  listPods: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/savings/pods`,
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
     GET POD BY ID (DETAIL - ADMIN)
     GET /admin/savings/pods/:id
  ============================================================ */
  getPodById: async (id, token) => {
    const res = await axios.get(
      `${server}/admin/savings/pods/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

};
