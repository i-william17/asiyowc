const express = require('express');
const router = express.Router();

// Controllers
const {
  getAllPrograms,
  getProgram,
  createProgram,
  updateProgram,
  deleteProgram,
  enrollInProgram,
  buyProgram,
  leaveProgram,
  completeModule,
  getMyPrograms,
  getContinuePrograms,
  getCompletedPrograms,
  getProgramStats,
  getProgramParticipants,
  addModule,
  generateCertificate,
  addReview,
  addComment,
  searchAdvancedHandler,
  recommendationsHandler,
  deleteReview,
  deleteComment
} = require('../controllers/programController');

// Middleware
const { auth, isModerator, isAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { programValidation, handleValidationErrors } = require('../middleware/validation');


/* ============================================================
   PUBLIC ROUTES
============================================================ */
router.get('/public', getAllPrograms);
router.get('/public/:id', getProgram);


/* ============================================================
   PROTECTED ROUTES (LOGIN REQUIRED)
============================================================ */
router.use(auth);


/* ============================================================
   USER PROGRAM ROUTES (must come before /:id)
============================================================ */
router.get('/my-programs', getMyPrograms);
router.get('/my-programs/continue', getContinuePrograms);
router.get('/my-programs/completed', getCompletedPrograms);

router.get('/search/advanced', searchAdvancedHandler);
router.get('/recommendations/for-you', recommendationsHandler);


/* ============================================================
   CRUD ROUTES
============================================================ */
router.post(
  '/',
  upload.single('image'),
  programValidation,
  handleValidationErrors,
  createProgram
);

router.put(
  '/:id',
  upload.single('image'),
  programValidation,
  handleValidationErrors,
  updateProgram
);

router.delete('/:id', deleteProgram);


/* ============================================================
   ENROLLMENT, LEAVE, PURCHASE
============================================================ */
router.post('/:id/enroll', enrollInProgram);
router.post('/:id/buy', buyProgram);
router.delete('/:id/leave', leaveProgram);


/* ============================================================
   MODULES (Organizer/Admin)
============================================================ */

// Add a module
router.post('/:id/modules', addModule);

// Mark module as completed
router.post('/:id/modules/:moduleOrder/complete', completeModule);


/* ============================================================
   REVIEWS & COMMENTS
============================================================ */
router.post('/:id/reviews', addReview);
router.post('/:id/comments', addComment);
router.delete("/:id/reviews/:reviewId", deleteReview);
router.delete("/:id/comments/:commentId", deleteComment);



/* ============================================================
   PROGRAM ANALYTICS & CERTIFICATES
============================================================ */
router.get('/:id/stats', getProgramStats);
router.get('/:id/participants', getProgramParticipants);
router.get('/:id/certificate', generateCertificate);


/* ============================================================
   SINGLE PROGRAM LOOKUP (MUST BE LAST)
============================================================ */
router.get('/:id', getProgram);


module.exports = router;
