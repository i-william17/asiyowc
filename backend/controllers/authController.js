// controllers/authController.js
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const { sendEmail } = require('../utils/email.js'); // EMAIL ONLY NOW

/* ==========================================================
   JWT GENERATOR
========================================================== */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

/* ==========================================================
   REGISTER USER
========================================================== */
exports.register = async (req, res) => {
  try {
    const { email, password, profile, phone, interests } = req.body;

    console.log('📥 Registration request:', req.body);

    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone',
      });
    }

    // 1️⃣ Create new user (hasRegistered stays default=false)
    const user = await User.create({
      email,
      password,
      profile,
      phone,
      interests: interests || []
    });

    // 2️⃣ Mark as registered
    user.hasRegistered = true;

    // 3️⃣ Generate verification code
    const emailCode = user.generateEmailVerificationCode();

    // 4️⃣ Save user
    await user.save();

    // 5️⃣ Send verification email
    try {
      await sendEmail({
        to: email,
        subject: 'Verify Your Email - Asiyo Global Women Connect',
        html: `
          <h2>Email Verification</h2>
          <p>Your Asiyo verification code is:</p>
          <h1 style="font-size: 32px; letter-spacing: 4px;">${emailCode}</h1>
          <p>This code expires in 10 minutes.</p>
        `,
      });

      console.log("📧 Verification email sent successfully");
    } catch (emailErr) {
      console.error("❌ Email sending FAILED:", emailErr.message);
    }

    // 6️⃣ Send response
    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          hasRegistered: true  // ⭐ Return it to frontend
        }
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



/* ==========================================================
   LOGIN
========================================================== */
exports.login = async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.isVerified?.email) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.',
      });
    }

    if (user.twoFactorAuth?.enabled) {
      if (!twoFactorCode) {
        return res.json({
          success: true,
          requires2FA: true,
          message: 'Two-factor authentication required',
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorAuth.secret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2,
      });

      if (!verified) {
        return res.status(401).json({
          success: false,
          message: 'Invalid 2FA code',
        });
      }
    }

    const token = generateToken(user._id);

    return res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
        },
        token,
      },
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ==========================================================
   GET AUTHENTICATED USER
========================================================== */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      data: user
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/* ==========================================================
   VERIFY EMAIL
========================================================== */
exports.verifyEmail = async (req, res) => {
  try {
    const { token: emailToken } = req.body;

    const user = await User.findOne({
      'verification.emailToken': emailToken,
      'verification.emailTokenExpires': { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
      });
    }

    user.isVerified.email = true;
    user.verification.emailToken = undefined;
    user.verification.emailTokenExpires = undefined;
    await user.save();

    const token = generateToken(user._id);

    return res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
        },
        token,
      },
    });

  } catch (error) {
    console.error('❌ Verify email error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({
      'verification.phoneToken': token,
      'verification.phoneTokenExpires': { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset code"
      });
    }

    return res.json({
      success: true,
      message: "Reset code verified",
      data: { token }
    });

  } catch (error) {
    console.error("❌ verifyResetToken ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/* ==========================================================
   SETUP 2FA
========================================================== */
exports.setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const secret = speakeasy.generateSecret({
      name: `Asiyo App (${user.email})`,
    });

    user.twoFactorAuth.tempSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
      },
    });

  } catch (error) {
    console.error('❌ setup2FA error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ==========================================================
   VERIFY 2FA SETUP
========================================================== */
exports.verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorAuth.tempSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code',
      });
    }

    user.twoFactorAuth.enabled = true;
    user.twoFactorAuth.secret = user.twoFactorAuth.tempSecret;
    user.twoFactorAuth.tempSecret = undefined;
    await user.save();

    return res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully',
    });

  } catch (error) {
    console.error('❌ verify2FA error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ==========================================================
   FORGOT PASSWORD (EMAIL ONLY — Twilio Removed)
========================================================== */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const resetToken = user.generatePhoneVerificationCode();
    await user.save();

    // REPLACEMENT — ALWAYS SEND EMAIL, NEVER SMS
    await sendEmail({
      to: user.email,
      subject: 'Password Reset - Asiyo Global Women Connect',
      html: `
        <h2>Password Reset Code</h2>
        <p>Your reset code is:</p>
        <h1 style="font-size: 32px; letter-spacing: 4px;">${resetToken}</h1>
        <p>This code expires in 10 minutes.</p>
      `,
    });

    return res.json({
      success: true,
      message: 'Password reset code sent successfully',
    });

  } catch (error) {
    console.error('❌ forgotPassword error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ==========================================================
   RESET PASSWORD
========================================================== */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      'verification.phoneToken': token,
      'verification.phoneTokenExpires': { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    user.password = newPassword;
    user.verification.phoneToken = undefined;
    user.verification.phoneTokenExpires = undefined;
    await user.save();

    return res.json({
      success: true,
      message: 'Password reset successfully',
    });

  } catch (error) {
    console.error('❌ resetPassword error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ==========================================================
   ADMIN LOGIN
========================================================== */
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Request body:", req.body);

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // ⭐ ONLY ADMINS
    if (!user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access only',
      });
    }

    if (!user.isVerified?.email) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first',
      });
    }

    const token = generateToken(user._id);

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          isAdmin: true,
        },
      },
    });

  } catch (error) {
    console.error('❌ adminLogin error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ==========================================================
   MAKE ADMIN (PROMOTE USER)
========================================================== */
exports.makeAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isAdmin = true;
    await user.save();

    res.json({
      success: true,
      message: 'User promoted to admin',
    });

  } catch (error) {
    console.error('❌ makeAdmin error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ==========================================================
   REMOVE ADMIN (DEMOTE)
========================================================== */
exports.removeAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isAdmin = false;
    await user.save();

    res.json({
      success: true,
      message: 'Admin privileges removed',
    });

  } catch (error) {
    console.error('❌ removeAdmin error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

