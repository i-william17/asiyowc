const express = require('express');

const {
  register,
  login,
  verifyEmail,
  setup2FA,
  verify2FA,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  getMe // ⭐ Added
} = require('../controllers/authController');

const { auth } = require('../middleware/auth');

const {
  registerValidation,
  loginValidation,
  handleValidationErrors
} = require('../middleware/validation');

const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authLimiter, registerValidation, handleValidationErrors, register);
router.post('/login', authLimiter, loginValidation, handleValidationErrors, login);

// Fetch authenticated user
router.get('/me', auth, getMe);

router.post('/verify-email', verifyEmail);
router.post('/verify-reset', verifyResetToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// 2FA routes
router.post('/2fa/setup', auth, setup2FA);
router.post('/2fa/verify', auth, verify2FA);

module.exports = router;
