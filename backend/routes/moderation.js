const express = require("express");
const router = express.Router();

const moderationController = require("../controllers/moderationController");
const { auth, isAdmin } = require("../middleware/auth");

// all admin routes require auth + admin
router.use(auth, isAdmin);

// reports queue
router.get("/reports", moderationController.listReports);
router.get("/reports/:reportId", moderationController.getReportById);

// resolve / reopen
router.patch("/reports/:reportId/resolve", moderationController.setResolved);

// enforce moderation action
router.post("/reports/:reportId/action", moderationController.takeAction);

// optional delete report record
router.delete("/reports/:reportId", moderationController.deleteReport);

module.exports = router;
