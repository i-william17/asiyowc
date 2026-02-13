import axios from "axios";
import { server } from "../server";

/* =====================================================
   MARKETPLACE SERVICE
   ✅ ALL ROUTES REQUIRE AUTH TOKEN
   ✅ Consistent with protected backend
   ✅ Cleaner using auth() helper
===================================================== */

const auth = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const marketplaceService = {
  /* =====================================================
     PRODUCTS
  ===================================================== */

  getAllProducts: async (token, params = {}) => {
    const res = await axios.get(
      `${server}/marketplace/products`,
      { ...auth(token), params }
    );
    return res.data;
  },

  getMyProducts: async (token, params = {}) => {
    const res = await axios.get(
      `${server}/marketplace/products/me`,
      { ...auth(token), params }
    );
    return res.data;
  },

  getProductById: async (productId, token) => {
    const res = await axios.get(
      `${server}/marketplace/products/${productId}`,
      auth(token)
    );
    return res.data;
  },

  createProduct: async (payload, token) => {
    const res = await axios.post(
      `${server}/marketplace/products`,
      payload,
      auth(token)
    );
    return res.data;
  },

  updateProduct: async (productId, payload, token) => {
    const res = await axios.put(
      `${server}/marketplace/products/${productId}`,
      payload,
      auth(token)
    );
    return res.data;
  },

  deleteProduct: async (productId, token) => {
    const res = await axios.delete(
      `${server}/marketplace/products/${productId}`,
      auth(token)
    );
    return res.data;
  },

  toggleFavoriteProduct: async (productId, token) => {
    const res = await axios.post(
      `${server}/marketplace/products/${productId}/favorite`,
      {},
      auth(token)
    );
    return res.data;
  },

  /* =====================================================
     CHECKOUT
  ===================================================== */

  createCartCheckout: async (items, token) => {
    const res = await axios.post(
      `${server}/marketplace/products/checkout`,
      { items },
      auth(token)
    );
    return res.data;
  },

  completeCheckout: async (payload, token) => {
    const res = await axios.post(
      `${server}/marketplace/products/checkout/complete`,
      payload,
      auth(token)
    );
    return res.data;
  },

  /* =====================================================
     ORDERS
  ===================================================== */

  getMyOrders: async (token, params = {}) => {
    const res = await axios.get(
      `${server}/marketplace/orders/me`,
      { ...auth(token), params }
    );
    return res.data;
  },

  /* =====================================================
     JOBS
  ===================================================== */

  getAllJobs: async (token, params = {}) => {
    const res = await axios.get(
      `${server}/marketplace/jobs`,
      { ...auth(token), params }
    );
    return res.data;
  },

  getJobById: async (jobId, token) => {
    const res = await axios.get(
      `${server}/marketplace/jobs/${jobId}`,
      auth(token)
    );
    return res.data;
  },

  createJob: async (payload, token) => {
    const res = await axios.post(
      `${server}/marketplace/jobs`,
      payload,
      auth(token)
    );
    return res.data;
  },

  applyForJob: async (jobId, payload, token) => {
    const res = await axios.post(
      `${server}/marketplace/jobs/${jobId}/apply`,
      payload,
      auth(token)
    );
    return res.data;
  },

  /* =====================================================
     FUNDING
  ===================================================== */

  getAllFunding: async (token, params = {}) => {
    const res = await axios.get(
      `${server}/marketplace/funding`,
      { ...auth(token), params }
    );
    return res.data;
  },

  createFunding: async (payload, token) => {
    const res = await axios.post(
      `${server}/marketplace/funding`,
      payload,
      auth(token)
    );
    return res.data;
  },

  applyForFunding: async (fundingId, payload, token) => {
    const res = await axios.post(
      `${server}/marketplace/funding/${fundingId}/apply`,
      payload,
      auth(token)
    );
    return res.data;
  },

  /* =====================================================
     SKILLS
  ===================================================== */

  getAllSkills: async (token, params = {}) => {
    const res = await axios.get(
      `${server}/marketplace/skills`,
      { ...auth(token), params }
    );
    return res.data;
  },

  createSkill: async (payload, token) => {
    const res = await axios.post(
      `${server}/marketplace/skills`,
      payload,
      auth(token)
    );
    return res.data;
  },

  requestSkillExchange: async (skillId, payload, token) => {
    const res = await axios.post(
      `${server}/marketplace/skills/${skillId}/request`,
      payload,
      auth(token)
    );
    return res.data;
  },

  respondToSkillRequest: async (skillId, requestId, payload, token) => {
    const res = await axios.post(
      `${server}/marketplace/skills/${skillId}/request/${requestId}/respond`,
      payload,
      auth(token)
    );
    return res.data;
  },

  /* =====================================================
     GLOBAL
  ===================================================== */

  searchMarketplace: async (token, params = {}) => {
    const res = await axios.get(
      `${server}/marketplace/search`,
      { ...auth(token), params }
    );
    return res.data;
  },

  getMarketplaceStats: async (token) => {
    const res = await axios.get(
      `${server}/marketplace/stats`,
      auth(token)
    );
    return res.data;
  },
};
