const express = require("express");
const router = express.Router();

const adminEventController = require("../controllers/adminEventController");
const { auth, isAdmin } = require("../middleware/auth");

router.use(auth, isAdmin);

/* ================= LIST ================= */
router.get("/", adminEventController.listEvents);

/* ================= GET DETAILS ================= */
router.get("/:id", adminEventController.getEventById);

/* ================= CREATE ================= */
router.post("/", adminEventController.createEvent);

/* ================= UPDATE ================= */
router.put("/:id", adminEventController.updateEvent);

/* ================= DELETE ================= */
router.delete("/:id", adminEventController.deleteEvent);

module.exports = router;
