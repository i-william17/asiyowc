// services/mentor.js

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
   MENTOR SERVICE (BACKEND-ALIGNED)
============================================================ */

export const mentorService = {

  /* ============================================================
     PUBLIC
  ============================================================ */

  /**
   * GET /api/mentors
   * Returns ONLY verified mentors
   */
  getMentors: async (params = {}) => {
    const res = await api.get("/mentors", { params });

    return res.data;
  },

  /**
   * GET /api/mentors/:id
   */
  getMentorById: async (mentorId) => {
    if (!mentorId) throw new Error("Mentor ID missing");

    const res = await api.get(`/mentors/${mentorId}`);

    return res.data;
  },

  /**
   * GET /api/mentors/:id/stories
   */
  getMentorStories: async (mentorId) => {
    if (!mentorId) throw new Error("Mentor ID missing");

    const res = await api.get(`/mentors/${mentorId}/stories`);

    return res.data;
  },



  /* ============================================================
     APPLY / PROFILE
  ============================================================ */

  /**
   * POST /api/mentors/apply
   */
  applyMentor: async (payload, token) => {
    const res = await api.post(
      "/mentors/apply",
      payload,
      { headers: authHeaders(token) }
    );

    return res.data;
  },

  /**
   * GET /api/mentors/me/profile
   */
  getMyMentorProfile: async (token) => {
    const res = await api.get(
      "/mentors/me/profile",
      { headers: authHeaders(token) }
    );

    return res.data;
  },

  /**
   * PUT /api/mentors/me/profile
   */
  updateMentorProfile: async (payload, token) => {
    const res = await api.put(
      "/mentors/me/profile",
      payload,
      { headers: authHeaders(token) }
    );

    return res.data;
  },



  /* ============================================================
     DOCUMENTS (URL ONLY)
  ============================================================ */

  /**
   * POST /api/mentors/me/docs
   */
  addVerificationDoc: async (payload, token) => {
    const res = await api.post(
      "/mentors/me/docs",
      payload,
      { headers: authHeaders(token) }
    );

    return res.data;
  },

  /**
   * DELETE /api/mentors/me/docs/:index
   */
  removeVerificationDoc: async (index, token) => {
    if (index === undefined) throw new Error("Doc index missing");

    const res = await api.delete(
      `/mentors/me/docs/${index}`,
      { headers: authHeaders(token) }
    );

    return res.data;
  },



  /* ============================================================
     STORIES
  ============================================================ */

  /**
   * POST /api/mentors/me/stories
   */
  addStory: async (payload, token) => {
    const res = await api.post(
      "/mentors/me/stories",
      payload,
      { headers: authHeaders(token) }
    );

    return res.data;
  },

  /**
   * PUT /api/mentors/me/stories/:storyId
   */
  updateStory: async (storyId, payload, token) => {
    if (!storyId) throw new Error("Story ID missing");

    const res = await api.put(
      `/mentors/me/stories/${storyId}`,
      payload,
      { headers: authHeaders(token) }
    );

    return res.data;
  },

  /**
   * DELETE /api/mentors/me/stories/:storyId
   */
  deleteStory: async (storyId, token) => {
    if (!storyId) throw new Error("Story ID missing");

    const res = await api.delete(
      `/mentors/me/stories/${storyId}`,
      { headers: authHeaders(token) }
    );

    return res.data;
  },



  /* ============================================================
     ADMIN
  ============================================================ */

  /**
   * GET /api/mentors/admin/pending
   */
  getPendingMentors: async (token) => {
    const res = await api.get(
      "/mentors/admin/pending",
      { headers: authHeaders(token) }
    );

    return res.data;
  },

  /**
   * PATCH /api/mentors/admin/:id/approve
   */
  approveMentor: async (mentorId, token) => {
    const res = await api.patch(
      `/mentors/admin/${mentorId}/approve`,
      {},
      { headers: authHeaders(token) }
    );

    return res.data;
  },

  /**
   * PATCH /api/mentors/admin/:id/reject
   */
  rejectMentor: async (mentorId, reason, token) => {
    const res = await api.patch(
      `/mentors/admin/${mentorId}/reject`,
      { reason },
      { headers: authHeaders(token) }
    );

    return res.data;
  },

  /**
   * PATCH /api/mentors/admin/:id/suspend
   */
  suspendMentor: async (mentorId, token) => {
    const res = await api.patch(
      `/mentors/admin/${mentorId}/suspend`,
      {},
      { headers: authHeaders(token) }
    );

    return res.data;
  },

  /**
   * PATCH /api/mentors/admin/:id/activate
   */
  activateMentor: async (mentorId, token) => {
    const res = await api.patch(
      `/mentors/admin/${mentorId}/activate`,
      {},
      { headers: authHeaders(token) }
    );

    return res.data;
  },
};
