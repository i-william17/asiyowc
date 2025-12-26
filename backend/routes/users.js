const express = require('express');

/* ================= CONTROLLERS ================= */
const {
  // profile
  getProfile,
  updateProfile,

  // stats
  getUserStats,

  // avatar
  uploadAvatar,
  deleteAvatar,

  // cover photo
  uploadCoverPhoto,
  deleteCoverPhoto,

  // programs
  getEnrolledPrograms,
  getCompletedPrograms,

  // password
  changePassword,
  resetPassword,

  // safety / sos
  addEmergencyContact,
  triggerSOS
} = require('../controllers/userController');

/* ================= MIDDLEWARE ================= */
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

/* =====================================================
   🔐 AUTH (ALL ROUTES PROTECTED)
===================================================== */
router.use(auth);

/* =====================================================
   👤 PROFILE
===================================================== */
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

/* =====================================================
   📊 USER STATS
===================================================== */
router.get('/stats', getUserStats);

/* =====================================================
   🖼️ AVATAR
===================================================== */
router.post(
  '/avatar',
  upload.single('avatar'),   // expects FormData key: avatar
  uploadAvatar
);

router.delete('/avatar', deleteAvatar);

/* =====================================================
   🖼️ COVER PHOTO
===================================================== */
router.post(
  '/cover-photo',
  upload.single('cover'),    // expects FormData key: cover
  uploadCoverPhoto
);

router.delete('/cover-photo', deleteCoverPhoto);

/* =====================================================
   🎓 PROGRAMS
===================================================== */
router.get('/programs/enrolled', getEnrolledPrograms);
router.get('/programs/completed', getCompletedPrograms);

/* =====================================================
   🔐 PASSWORD
===================================================== */
router.post('/change-password', changePassword);

/**
 * NOTE:
 * reset-password is usually PUBLIC (email token based),
 * but keeping it protected ONLY IF your logic requires auth.
 * Otherwise, move it to /auth routes.
 */
router.post('/reset-password', resetPassword);

/* =====================================================
   🚨 SAFETY / SOS
===================================================== */
router.post('/emergency-contacts', addEmergencyContact);
router.post('/sos', triggerSOS);

module.exports = router;
