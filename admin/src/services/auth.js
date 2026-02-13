import axios from "axios";
import { server } from "../server";

/* ============================================================
   AUTH SERVICE
   (same structure style as your mobile app)
============================================================ */
export const authService = {

  /* ============================================================
     ADMIN LOGIN
  ============================================================ */
  adminLogin: async (credentials) => {
    const res = await axios.post(
      `${server}/auth/admin/login`,
      credentials
    );

    return res;
  },


  /* ============================================================
     GET CURRENT USER
     GET /auth/me
  ============================================================ */
  getMe: async (token) => {
    const res = await axios.get(
      `${server}/auth/me`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },


  /* ============================================================
     PROMOTE USER → ADMIN
  ============================================================ */
  makeAdmin: async (userId, token) => {
    const res = await axios.patch(
      `${server}/auth/admin/users/${userId}/make-admin`,
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
     DEMOTE ADMIN → USER
  ============================================================ */
  removeAdmin: async (userId, token) => {
    const res = await axios.patch(
      `${server}/auth/admin/users/${userId}/remove-admin`,
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
