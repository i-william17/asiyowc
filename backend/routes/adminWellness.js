// routes/adminWellness.js
// ============================================================
// ADMIN WELLNESS ROUTES
// - Uses same structure pattern as adminEvent.js
// - Mounted at: /api/admin/wellness
// ============================================================

const express = require("express");
const router = express.Router();

const adminWellnessController = require("../controllers/adminWellnessController");
const { auth, isAdmin } = require("../middleware/auth");

// 🔐 Protect all routes (admin only)
router.use(auth, isAdmin);

/* ============================================================
   ===================== MOOD ===============================
============================================================ */

/* ================= DASHBOARD ================= */
router.get("/mood/dashboard", adminWellnessController.getMoodDashboard);

/* ================= HEATMAP ================= */
router.get("/mood/heatmap", adminWellnessController.getMoodHeatmap);

/* ================= RISK METRICS ================= */
router.get("/mood/risk", adminWellnessController.getMoodRiskMetrics);

/* ================= CORRELATION ================= */
router.get("/mood/correlation", adminWellnessController.getMoodRetreatCorrelation);

/* ================= GROWTH INDEX ================= */
router.get("/mood/growth", adminWellnessController.getWellnessGrowthIndex);

/* ============================================================
   ===================== RETREAT ANALYTICS ===================
============================================================ */

/* ================= ANALYTICS ================= */
router.get("/retreats/analytics", adminWellnessController.getRetreatAnalytics);

/* ================= DROP-OFF FUNNEL ================= */
router.get("/retreats/funnel", adminWellnessController.getRetreatDropoffFunnel);

/* ============================================================
   ===================== RETREAT CRUD =========================
============================================================ */

/* ================= LIST ================= */
router.get("/retreats", adminWellnessController.listRetreatsAdmin);

/* ================= GET DETAILS ================= */
router.get("/retreats/:id", adminWellnessController.getRetreatAdminById);

/* ================= CREATE ================= */
router.post("/retreats", adminWellnessController.createRetreatAdmin);

/* ================= UPDATE ================= */
router.put("/retreats/:id", adminWellnessController.updateRetreatAdmin);

/* ================= TOGGLE FEATURED ================= */
router.patch("/retreats/:id/feature", adminWellnessController.toggleFeaturedRetreatAdmin);

/* ================= REORDER ================= */
router.patch("/retreats/reorder", adminWellnessController.reorderRetreatsAdmin);

/* ================= RECALCULATE STATS ================= */
router.patch("/retreats/:id/recalculate", adminWellnessController.recalculateRetreatStatsAdmin);

/* ================= DELETE (SOFT) ================= */
router.delete("/retreats/:id", adminWellnessController.softDeleteRetreatAdmin);

/* ============================================================
   ===================== ALERT SYSTEM =========================
============================================================ */

/* ================= EARLY WARNINGS ================= */
router.get("/alerts", adminWellnessController.getWellnessAlerts);

/* ============================================================
   ===================== OVERVIEW =============================
============================================================ */

/* ================= FULL OVERVIEW ================= */
router.get("/overview", adminWellnessController.getWellnessOverview);

module.exports = router;