const express = require("express");
const router = express.Router();

const adminAnalyticsController = require("../controllers/adminAnalyticsController");
const { auth, isAdmin } = require("../middleware/auth");

// ============================================================
// GLOBAL ADMIN PROTECTION
// ============================================================
router.use(auth, isAdmin);

/* ============================================================
   =================== OVERVIEW ===============================
============================================================ */

/**
 * GET /admin/analytics/overview
 * Query:
 * - from=YYYY-MM-DD
 * - to=YYYY-MM-DD
 * - granularity=day|week|month
 */
router.get("/overview", adminAnalyticsController.getOverview);


/* ============================================================
   =================== DROPDOWN LAYER =========================
============================================================ */

/**
 * GET /admin/analytics/layer?key=user-community
 *
 * key:
 * - overview
 * - user-community
 * - social-engagement
 * - learning-programs
 * - financial-transactions
 * - marketplace-economy
 * - realtime
 * - moderation-safety
 * - growth-retention
 */
router.get("/layer", adminAnalyticsController.getAnalyticsLayer);


/* ============================================================
   =================== INDIVIDUAL LAYERS ======================
   (Optional direct routes if needed)
============================================================ */

/* 👥 USER & COMMUNITY HEALTH */
router.get("/user-community", adminAnalyticsController.getUserCommunityHealth);

/* 💬 SOCIAL ENGAGEMENT */
router.get("/social-engagement", adminAnalyticsController.getSocialEngagement);

/* 🎓 LEARNING & PROGRAMS */
router.get("/learning-programs", adminAnalyticsController.getLearningPrograms);

/* 💰 FINANCIAL & TRANSACTIONS */
router.get("/financial-transactions", adminAnalyticsController.getFinancialTransactions);

/* 🛍 MARKETPLACE & ECONOMY */
router.get("/marketplace-economy", adminAnalyticsController.getMarketplaceEconomy);

/* 🎤 REAL-TIME / LIVE ACTIVITY */
router.get("/realtime", adminAnalyticsController.getRealtimeLiveActivity);

/* 🛡 MODERATION & SAFETY */
router.get("/moderation-safety", adminAnalyticsController.getModerationSafety);

/* 📈 GROWTH & RETENTION */
router.get("/growth-retention", adminAnalyticsController.getGrowthRetention);


module.exports = router;