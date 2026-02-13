const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { auth, isAdmin } = require("../middleware/auth");

/* ======================================================
   USERS MANAGEMENT
====================================================== */
router.get("/users", auth, isAdmin, adminController.getAllUsersAdmin);
router.get("/users/:id", auth, isAdmin, adminController.getUserByIdAdmin);
router.delete("/users/:id", auth, isAdmin, adminController.deleteUserAdmin);

/* ============================================================
   GROUPS
============================================================ */
router.get("/groups", auth, isAdmin, adminController.getAllGroupsAdmin);
router.get("/groups/:id", auth, isAdmin, adminController.getGroupByIdAdmin);
router.delete("/groups/:id", auth, isAdmin, adminController.deleteGroupAdmin);
router.patch("/groups/:id/toggle", auth, isAdmin, adminController.toggleGroupStatusAdmin);


/* ============================================================
   PROGRAMS
============================================================ */
router.get("/programs", auth, isAdmin, adminController.getAllProgramsAdmin);
router.get("/programs/:id", auth, isAdmin, adminController.getProgramByIdAdmin);
router.delete("/programs/:id", auth, isAdmin, adminController.deleteProgramAdmin);
router.patch("/programs/:id/toggle", auth, isAdmin, adminController.toggleProgramPublishAdmin);
router.get("/programs/:id/participants", auth, isAdmin, adminController.getProgramParticipantsAdmin);

/* ======================================================
   DASHBOARD ANALYTICS
   GET /admin/dashboard/metrics
====================================================== */
router.get(
  "/dashboard/metrics",
  auth,
  isAdmin,
  (req, res, next) => {
    console.log("✅ Admin metrics route hit");
    next();
  },
  adminController.getDashboardMetrics
);



module.exports = router;
