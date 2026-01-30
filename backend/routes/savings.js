const express = require("express");
const router = express.Router();

const { auth } = require("../middleware/auth");
const savingsController = require("../controllers/savingsController");

/* =====================================================
   PODS
===================================================== */

// Create savings pod
router.post("/pods", auth, savingsController.createPod);

// Get pods where user is creator or member
router.get("/pods/my", auth, savingsController.getMyPods);

// Discover public pods (paginated)
router.get("/pods/discover", auth, savingsController.discoverPods);

// Get single pod details
router.get("/pods/:podId", auth, savingsController.getPodById);

// Join pod
router.post("/pods/:podId/join", auth, savingsController.joinPod);

// Leave pod
router.post("/pods/:podId/leave", auth, savingsController.leavePod);

// Delete pod (creator only)
router.delete("/pods/:podId", auth, savingsController.deletePod);

/* =====================================================
   CONTRIBUTIONS
===================================================== */

// Contribute to a pod
router.post(
  "/pods/:podId/contribute",
  auth,
  savingsController.contributeToPod
);

// Get logged-in user's contribution statement
router.get(
  "/contributions/my",
  auth,
  savingsController.getMyContributions
);

// Create contribution checkout session
router.post("/pods/:podId/contribute/checkout", auth, savingsController.createContributionCheckout);

/* =====================================================
   WITHDRAWALS
===================================================== */

// Request withdrawal (member)
router.post(
  "/pods/:podId/withdraw",
  auth,
  savingsController.requestWithdrawal
);

// Get withdrawals for a pod
// - Admin: sees all
// - Member: sees own only
router.get(
  "/pods/:podId/withdrawals",
  auth,
  savingsController.getPodWithdrawals
);

module.exports = router;
