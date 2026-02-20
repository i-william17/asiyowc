const express = require("express");
const router = express.Router();

const adminMentorController = require("../controllers/adminMentorController");
const { auth, isAdmin } = require("../middleware/auth");

/* =====================================================
   GLOBAL MIDDLEWARE
   All admin mentor routes require:
   - Authenticated user
   - Admin role
===================================================== */
router.use(auth, isAdmin);

/* =====================================================
   1️⃣ LIST MENTORS
   GET /api/admin/mentors
===================================================== */
router.get("/", adminMentorController.listMentors);

/* =====================================================
   2️⃣ GET SINGLE MENTOR
   GET /api/admin/mentors/:id
===================================================== */
router.get("/:id", adminMentorController.getMentorById);

/* =====================================================
   3️⃣ APPROVE MENTOR
   PATCH /api/admin/mentors/:id/approve
===================================================== */
router.patch("/:id/approve", adminMentorController.approveMentor);

/* =====================================================
   4️⃣ REJECT MENTOR
   PATCH /api/admin/mentors/:id/reject
===================================================== */
router.patch("/:id/reject", adminMentorController.rejectMentor);

/* =====================================================
   5️⃣ ADMIN RATE MENTOR
   PATCH /api/admin/mentors/:id/rate
===================================================== */
router.patch("/:id/rate", adminMentorController.rateMentor);

/* =====================================================
   6️⃣ CREATE MENTOR
   POST /api/admin/mentors
===================================================== */
router.post("/", adminMentorController.createMentor);

/* =====================================================
   7️⃣ UPDATE MENTOR
   PUT /api/admin/mentors/:id
===================================================== */
router.put("/:id", adminMentorController.updateMentor);

/* =====================================================
   8️⃣ DELETE MENTOR
   DELETE /api/admin/mentors/:id
===================================================== */
router.delete("/:id", adminMentorController.deleteMentor);

/* =====================================================
   9️⃣ TOGGLE STATUS (Suspend / Activate)
   PATCH /api/admin/mentors/:id/toggle-status
===================================================== */
router.patch("/:id/toggle-status", adminMentorController.toggleMentorStatus);

module.exports = router;
