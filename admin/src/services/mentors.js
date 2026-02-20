// src/services/mentors.js
import axios from "axios";
import { server } from "../server";

/* ============================================================
   ADMIN MENTORS SERVICE
   (same structure style as savingsService)
============================================================ */
export const mentorsService = {

  /* ============================================================
     LIST MENTORS (ADMIN)
     GET /admin/mentors
     params: { page, limit, status, verified, search }
  ============================================================ */
  listMentors: async (params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/mentors`,
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
     GET MENTOR BY ID (DETAIL - ADMIN)
     GET /admin/mentors/:id
  ============================================================ */
  getMentorById: async (id, token) => {
    const res = await axios.get(
      `${server}/admin/mentors/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

  /* ============================================================
     APPROVE MENTOR
     PATCH /admin/mentors/:id/approve
  ============================================================ */
  approveMentor: async (id, token) => {
    const res = await axios.patch(
      `${server}/admin/mentors/${id}/approve`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

  /* ============================================================
     REJECT MENTOR
     PATCH /admin/mentors/:id/reject
     body: { reason }
  ============================================================ */
  rejectMentor: async (id, reason, token) => {
    const res = await axios.patch(
      `${server}/admin/mentors/${id}/reject`,
      { reason },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

  /* ============================================================
     RATE MENTOR
     PATCH /admin/mentors/:id/rate
     body: { rating }
  ============================================================ */
  rateMentor: async (id, rating, token) => {
    const res = await axios.patch(
      `${server}/admin/mentors/${id}/rate`,
      { rating },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

  /* ============================================================
     CREATE MENTOR
     POST /admin/mentors
  ============================================================ */
  createMentor: async (data, token) => {
    const res = await axios.post(
      `${server}/admin/mentors`,
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
     UPDATE MENTOR
     PUT /admin/mentors/:id
  ============================================================ */
  updateMentor: async (id, data, token) => {
    const res = await axios.put(
      `${server}/admin/mentors/${id}`,
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
     DELETE MENTOR
     DELETE /admin/mentors/:id
  ============================================================ */
  deleteMentor: async (id, token) => {
    const res = await axios.delete(
      `${server}/admin/mentors/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

  /* ============================================================
     TOGGLE MENTOR ACTIVE STATUS
     PATCH /admin/mentors/:id/toggle-status
  ============================================================ */
  toggleMentorStatus: async (id, token) => {
    const res = await axios.patch(
      `${server}/admin/mentors/${id}/toggle-status`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

};
