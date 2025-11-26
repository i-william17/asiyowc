import axios from "axios";
import { server } from "../server";

export const authService = {
  /** ========================================
   * LOGIN
   ========================================= */
  async login(data) {
    const res = await axios.post(`${server}/auth/login`, data, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  },

  /** ========================================
   * REGISTER
   ========================================= */
  async register(data) {
    const res = await axios.post(`${server}/auth/register`, data, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  },

  /** ========================================
   * VERIFY OTP
   ========================================= */
  async verifyOTP(data) {
    const res = await axios.post(`${server}/auth/verify-email`, data, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  },

  /** ========================================
   * FORGOT PASSWORD
   ========================================= */
  async forgotPassword(email) {
    const res = await axios.post(
      `${server}/auth/forgot-password`,
      { email },
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  },

  /** ========================================
   * RESET PASSWORD
   ========================================= */
  async resetPassword(token, newPassword) {
    const res = await axios.post(
      `${server}/auth/reset-password`,
      { token, newPassword },
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  },

  /** ========================================
   * ⭐ GET AUTHENTICATED USER (/auth/me)
   ========================================= */
  async getMe(token) {
    const res = await axios.get(`${server}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    return res.data; // returns { success, data: user }
  }
};
