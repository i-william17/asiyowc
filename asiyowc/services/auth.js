import axios from "axios";
import { server } from "../server";

export const authService = {
  async login(data) {
    const res = await axios.post(`${server}/auth/login`, data, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  },

  async register(data) {
    const res = await axios.post(`${server}/auth/register`, data, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  },

  async verifyOTP(data) {
    const res = await axios.post(`${server}/auth/verify-email`, data, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  },

  /** ⭐ Forgot Password */
  async forgotPassword(email) {
    const res = await axios.post(
      `${server}/auth/forgot-password`,
      { email },
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  },

  /** ⭐ Reset Password */
  async resetPassword(token, newPassword) {
    const res = await axios.post(
      `${server}/auth/reset-password`,
      { token, newPassword },
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  }
};
