// src/services/marketplace.js
import axios from "axios";
import { server } from "../server";

/* ============================================================
   ADMIN MARKETPLACE SERVICE
   (same structure style as moderationService)
============================================================ */
export const marketplaceService = {

  /* ============================================================
     OVERVIEW / REPORTS
     GET /admin/marketplace/reports/overview
  ============================================================ */
  getOverview: async (token) => {
    const res = await axios.get(
      `${server}/admin/marketplace/reports/overview`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

  /* ============================================================
     LIST ENTITY
     GET /admin/marketplace/:entity
     entity: products | skills | jobs | funding | orders | intents
     params: { page, limit, search, status, category, sort }
  ============================================================ */
  listEntity: async (entity, params = {}, token) => {
    const res = await axios.get(
      `${server}/admin/marketplace/${entity}`,
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
     GET ENTITY BY ID (DETAIL)
     GET /admin/marketplace/:entity/:id
  ============================================================ */
  getEntityById: async (entity, id, token) => {
    const res = await axios.get(
      `${server}/admin/marketplace/${entity}/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

  /* ============================================================
     CREATE ENTITY (ADMIN)
     POST /admin/marketplace/:entity
     body: entity payload
  ============================================================ */
  createEntity: async (entity, payload, token) => {
    const res = await axios.post(
      `${server}/admin/marketplace/${entity}`,
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
     UPDATE ENTITY (ADMIN)
     PUT /admin/marketplace/:entity/:id
     body: updated fields
  ============================================================ */
  updateEntity: async (entity, id, payload, token) => {
    const res = await axios.put(
      `${server}/admin/marketplace/${entity}/${id}`,
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
     DELETE ENTITY (ADMIN)
     DELETE /admin/marketplace/:entity/:id
     (soft delete for products/jobs/funding/skills)
  ============================================================ */
  deleteEntity: async (entity, id, token) => {
    const res = await axios.delete(
      `${server}/admin/marketplace/${entity}/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res;
  },

};
