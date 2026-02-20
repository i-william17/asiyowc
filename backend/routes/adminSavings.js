const express = require("express");
const router = express.Router();

const adminSavingsController = require("../controllers/adminSavingsController");
const { auth, isAdmin } = require("../middleware/auth");

/* =====================================================
   GLOBAL MIDDLEWARE
   All admin savings routes require:
   - Authenticated user
   - Admin role
===================================================== */
router.use(auth, isAdmin);

/* =====================================================
   1️⃣ LIST SAVINGS PODS
   GET /api/admin/savings/pods
===================================================== */
router.get("/pods", adminSavingsController.listPods);

/* =====================================================
   2️⃣ GET SAVINGS POD DETAILS
   GET /api/admin/savings/pods/:id
===================================================== */
router.get("/pods/:id", adminSavingsController.getPodById);

module.exports = router;
