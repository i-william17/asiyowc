// src/services/moderation.js
import axios from "axios";
import { server } from "../server";

/* ============================================================
   MODERATION SERVICE
   (same structure style as your admin authService)
============================================================ */
export const moderationService = {
  /* ============================================================
     LIST REPORTS (QUEUE)
     GET /moderation/reports
     params: { resolved, targetType, search, page, limit, sort }
  ============================================================ */
  listReports: async (params = {}, token) => {
    const res = await axios.get(`${server}/moderation/reports`, {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res;
  },

  /* ============================================================
     GET REPORT BY ID
     GET /moderation/reports/:reportId
  ============================================================ */
  getReportById: async (reportId, token) => {
    const res = await axios.get(`${server}/moderation/reports/${reportId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res;
  },

  /* ============================================================
     RESOLVE / REOPEN REPORT
     PATCH /moderation/reports/:reportId/resolve
     body: { resolved: boolean }
  ============================================================ */
  setResolved: async (reportId, resolved, token) => {
    const res = await axios.patch(
      `${server}/moderation/reports/${reportId}/resolve`,
      { resolved },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

  /* ============================================================
     TAKE MODERATION ACTION
     POST /moderation/reports/:reportId/action
     body: {
       action: "none" | "delete_target" | "disable_target" | "suspend_user" | "ban_user",
       days?: number,
       note?: string
     }
  ============================================================ */
  takeAction: async (reportId, payload, token) => {
    const res = await axios.post(
      `${server}/moderation/reports/${reportId}/action`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

  /* ============================================================
     DELETE REPORT RECORD (OPTIONAL)
     DELETE /moderation/reports/:reportId
  ============================================================ */
  deleteReport: async (reportId, token) => {
    const res = await axios.delete(`${server}/moderation/reports/${reportId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res;
  },
};
