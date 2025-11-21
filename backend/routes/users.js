const express = require('express');
const { 
  getProfile, 
  updateProfile, 
  uploadAvatar, 
  getUserStats,
  addEmergencyContact,
  triggerSOS
} = require('../controllers/userController');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload.js');

const router = express.Router();

router.use(auth);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/avatar', upload.single('avatar'), uploadAvatar);
router.get('/stats', getUserStats);
router.post('/emergency-contacts', addEmergencyContact);
router.post('/sos', triggerSOS);

module.exports = router;