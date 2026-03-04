const express = require("express");

const {
  createSupportTicket,
  createFeedback,
} = require("../controllers/supportController");

const { auth } = require("../middleware/auth");

const {
  upload,
  normalizePostPayload,
} = require("../middleware/upload");

const router = express.Router();

/* ==========================================================
   SUPPORT TICKET
   Allows optional media upload
========================================================== */

router.post(
  "/ticket",
  auth,
  upload.single("media"),
  normalizePostPayload,
  createSupportTicket
);

/* ==========================================================
   FEEDBACK
========================================================== */

router.post(
  "/feedback",
  auth,
  createFeedback
);

module.exports = router;