const express = require("express");
const { auth } = require("../middleware/auth.js");

const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,

  rsvpEvent,
  cancelRsvp,
  checkIn,

  getMyEvents,
  getOrganizerEvents
} = require("../controllers/eventController.js");

const router = express.Router();

/* =====================================================
   PUBLIC
===================================================== */

// list all published events
router.get("/", getEvents);


/* =====================================================
   AUTHENTICATED USER (SPECIFIC PATHS FIRST)
===================================================== */

// my registered events
router.get("/me/registered", auth, getMyEvents);

// events I organize
router.get("/me/organized", auth, getOrganizerEvents);

// RSVP
router.post("/:id/rsvp", auth, rsvpEvent);

// cancel RSVP
router.delete("/:id/rsvp", auth, cancelRsvp);

// check-in
router.post("/:id/checkin", auth, checkIn);


/* =====================================================
   ORGANIZER
===================================================== */

// create event
router.post("/", auth, createEvent);

// update
router.put("/:id", auth, updateEvent);

// delete
router.delete("/:id", auth, deleteEvent);


/* =====================================================
   GENERIC LAST (IMPORTANT)
===================================================== */

// single event (MUST BE LAST)
router.get("/:id", getEventById);


module.exports = router;
