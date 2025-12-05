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
   * VERIFY EMAIL OTP
   ========================================= */
  async verifyOTP(data) {
    const res = await axios.post(`${server}/auth/verify-email`, data, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  },

  /** ========================================
   * RESEND EMAIL OTP
   ========================================= */
  async resendEmailOTP(email) {
    const res = await axios.post(
      `${server}/auth/resend-email-otp`,
      { email },
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  },

  /** ========================================
   * VERIFY PHONE OTP
   ========================================= */
  async verifyPhone(data, token) {
    const res = await axios.post(`${server}/auth/verify-phone`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    return res.data;
  },

  /** ========================================
   * RESEND PHONE OTP
   ========================================= */
  async resendPhoneOTP(token) {
    const res = await axios.post(
      `${server}/auth/resend-phone-otp`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );
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
   * UPDATE PASSWORD (AUTH REQUIRED)
   ========================================= */
  async updatePassword(data, token) {
    const res = await axios.put(`${server}/auth/update-password`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    return res.data;
  },

  /** ========================================
   * UPDATE PROFILE
   ========================================= */
  async updateProfile(data, token) {
    const res = await axios.put(`${server}/users/update-profile`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    return res.data;
  },

  /** ========================================
   * UPDATE AVATAR (MULTIPART)
   ========================================= */
  async updateAvatar(formData, token) {
    const res = await axios.put(`${server}/users/update-avatar`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data"
      }
    });
    return res.data;
  },

  /** ========================================
   * DELETE AVATAR
   ========================================= */
  async deleteAvatar(token) {
    const res = await axios.delete(`${server}/users/delete-avatar`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  },

  /** ========================================
   * DEACTIVATE ACCOUNT
   ========================================= */
  async deactivateAccount(token) {
    const res = await axios.put(
      `${server}/users/deactivate`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return res.data;
  },

  /** ========================================
   * REACTIVATE ACCOUNT
   ========================================= */
  async reactivateAccount(token) {
    const res = await axios.post(
      `${server}/users/reactivate`,
      { token },
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  },

  /** ========================================
   * ENABLE 2FA
   ========================================= */
  async enable2FA(token) {
    const res = await axios.post(
      `${server}/auth/2fa/enable`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return res.data;
  },

  /** ========================================
   * DISABLE 2FA
   ========================================= */
  async disable2FA(token) {
    const res = await axios.post(
      `${server}/auth/2fa/disable`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
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

    return res.data;
  }
};
