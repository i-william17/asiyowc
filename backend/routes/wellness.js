const router = require("express").Router();

const wellness = require("../controllers/wellnessController");
const { auth } = require("../middleware/auth");


/* =====================================================
   ================= JOURNAL ===========================
===================================================== */

/*
   GET today's journal
   Auto creates if missing
*/
router.get("/journal/today", auth, wellness.getTodayJournal);


/*
   Save / update journal
*/
router.post("/journal/save", auth, wellness.saveJournal);


/*
   Get history (last 30 days)
*/
router.get("/journal/history", auth, wellness.getJournalHistory);





/* =====================================================
   ================= RETREATS ==========================
===================================================== */

/*
   List all active retreats
*/
router.get("/retreats", auth, wellness.getRetreats);


/*
   Get single retreat (details + participants populated)
*/
router.get("/retreat/:id", auth, wellness.getRetreatById);


/*
   Join retreat
*/
router.post("/retreat/:id/join", auth, wellness.joinRetreat);


/*
   Update progress
   Automatically completes at 100%
*/
router.post("/retreat/:id/progress", auth, wellness.updateRetreatProgress);


/*
   Get my progress across all retreats
*/
router.get("/retreat/progress/me", auth, wellness.getMyRetreatProgress);




module.exports = router;
