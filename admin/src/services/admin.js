import axios from "axios";
import { server } from "../server";

/* ============================================================
   AUTH HELPER
============================================================ */
const withAuth = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export const adminService = {

  /* ============================================================
     USERS
  ============================================================ */
  getUsers: async ({ page = 1, limit = 20, token }) => {
    return axios.get(
      `${server}/admin/users?page=${page}&limit=${limit}`,
      withAuth(token)
    );
  },

  getUserById: async (userId, token) => {
    return axios.get(
      `${server}/admin/users/${userId}`,
      withAuth(token)
    );
  },

  deleteUser: async (userId, token) => {
    return axios.delete(
      `${server}/admin/users/${userId}`,
      withAuth(token)
    );
  },

  searchUsers: async ({ query, token }) => {
    return axios.get(
      `${server}/admin/users?search=${query}`,
      withAuth(token)
    );
  },

  suspendUser: async (userId, token) => {
    return axios.patch(
      `${server}/admin/users/${userId}/suspend`,
      {},
      withAuth(token)
    );
  },

  activateUser: async (userId, token) => {
    return axios.patch(
      `${server}/admin/users/${userId}/activate`,
      {},
      withAuth(token)
    );
  },

  bulkDeleteUsers: async (ids, token) => {
    return axios.post(
      `${server}/admin/users/bulk-delete`,
      { ids },
      withAuth(token)
    );
  },


  /* ============================================================
     DASHBOARD
  ============================================================ */
  getDashboardMetrics: async (token) => {
    return axios.get(
      `${server}/admin/dashboard/metrics`,
      withAuth(token)
    );
  },


  /* ============================================================
     GROUPS (NEW)
  ============================================================ */

  /* GET ALL GROUPS */
  getGroups: async ({ page = 1, limit = 20, token }) => {
    return axios.get(
      `${server}/admin/groups?page=${page}&limit=${limit}`,
      withAuth(token)
    );
  },

  /* GET GROUP DETAILS */
  getGroupById: async (groupId, token) => {
    return axios.get(
      `${server}/admin/groups/${groupId}`,
      withAuth(token)
    );
  },

  /* DELETE GROUP */
  deleteGroup: async (groupId, token) => {
    return axios.delete(
      `${server}/admin/groups/${groupId}`,
      withAuth(token)
    );
  },

  /* TOGGLE ACTIVE */
  toggleGroup: async (groupId, token) => {
    return axios.patch(
      `${server}/admin/groups/${groupId}/toggle`,
      {},
      withAuth(token)
    );
  },


  /* ============================================================
     PROGRAMS (NEW)
  ============================================================ */

  /* GET ALL PROGRAMS */
  getPrograms: async ({ page = 1, limit = 20, token }) => {
    return axios.get(
      `${server}/admin/programs?page=${page}&limit=${limit}`,
      withAuth(token)
    );
  },

  /* GET PROGRAM DETAILS */
  getProgramById: async (programId, token) => {
    return axios.get(
      `${server}/admin/programs/${programId}`,
      withAuth(token)
    );
  },

  /* DELETE PROGRAM */
  deleteProgram: async (programId, token) => {
    return axios.delete(
      `${server}/admin/programs/${programId}`,
      withAuth(token)
    );
  },

  /* TOGGLE PUBLISH */
  toggleProgram: async (programId, token) => {
    return axios.patch(
      `${server}/admin/programs/${programId}/toggle`,
      {},
      withAuth(token)
    );
  },

  /* GET PARTICIPANTS */
  getProgramParticipants: async (programId, token) => {
    return axios.get(
      `${server}/admin/programs/${programId}/participants`,
      withAuth(token)
    );
  },
};
