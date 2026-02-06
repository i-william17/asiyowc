const express = require("express");
const router = express.Router();

const { auth, isAdmin } = require("../middleware/auth.js");

const mentorController = require("../controllers/mentorController");

/* =====================================================
   PUBLIC ROUTES
===================================================== */

/*
GET    /api/mentors
List verified mentors only
*/
router.get("/", mentorController.getMentors);

/*
GET    /api/mentors/:id
Get single mentor profile
*/
router.get("/:id", mentorController.getMentorById);

/*
GET    /api/mentors/:id/stories
Get mentor stories
*/
router.get("/:id/stories", mentorController.getMentorStories);



/* =====================================================
   AUTHENTICATED (MENTOR SELF)
===================================================== */

/*
POST   /api/mentors/apply
Become mentor (create profile)
*/
router.post("/apply", auth, mentorController.applyMentor);

/*
GET    /api/mentors/me
Get my mentor profile
*/
router.get("/me/profile", auth, mentorController.getMyMentorProfile);

/*
PUT    /api/mentors/me
Update my mentor profile
*/
router.put("/me/profile", auth, mentorController.updateMentorProfile);

/*
POST   /api/mentors/me/docs
Add verification document (URL only)
*/
router.post("/me/docs", auth, mentorController.addVerificationDoc);

/*
DELETE /api/mentors/me/docs/:index
Remove document
*/
router.delete("/me/docs/:index", auth, mentorController.removeVerificationDoc);

/*
POST   /api/mentors/me/stories
Add spotlight story (max 10)
*/
router.post("/me/stories", auth, mentorController.addStory);

/*
PUT    /api/mentors/me/stories/:storyId
Update story
*/
router.put("/me/stories/:storyId", auth, mentorController.updateStory);

/*
DELETE /api/mentors/me/stories/:storyId
Delete story
*/
router.delete("/me/stories/:storyId", auth, mentorController.deleteStory);



/* =====================================================
   ADMIN ROUTES (MODERATION)
===================================================== */

/*
GET    /api/mentors/admin/pending
List pending mentors
*/
router.get(
  "/admin/pending",
  auth,
  isAdmin,
  mentorController.getPendingMentors
);

/*
PATCH  /api/mentors/admin/:id/approve
Approve mentor
*/
router.patch(
  "/admin/:id/approve",
  auth,
  isAdmin,
  mentorController.approveMentor
);

/*
PATCH  /api/mentors/admin/:id/reject
Reject mentor
*/
router.patch(
  "/admin/:id/reject",
  auth,
  isAdmin,
  mentorController.rejectMentor
);

/*
PATCH  /api/mentors/admin/:id/suspend
Suspend mentor
*/
router.patch(
  "/admin/:id/suspend",
  auth,
  isAdmin,
  mentorController.suspendMentor
);

/*
PATCH  /api/mentors/admin/:id/activate
Reactivate mentor
*/
router.patch(
  "/admin/:id/activate",
  auth,
  isAdmin,
  mentorController.activateMentor
);



/* =====================================================
   EXPORT
===================================================== */
module.exports = router;
