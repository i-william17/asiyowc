// controllers/authController.js
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { sendEmail } = require('../utils/email.js'); // EMAIL ONLY NOW
const { redisClient } = require('../config/redis');

/* ==========================================================
   JWT GENERATOR (HARDENED with tokenVersion)
========================================================== */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      version: user.tokenVersion || 0
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

/* ==========================================================
   HELPER: Normalize Email
========================================================== */
const normalizeEmail = (email) => {
  return email.toLowerCase().trim();
};

/* ==========================================================
   REGISTER USER (UPDATED - Redis First)
========================================================== */
exports.register = async (req, res) => {
  try {
    const { email, password, profile, phone, interests } = req.body;

    console.log('📥 Registration request:', req.body);

    // 🔹 FIX 2 - Basic input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // 🔹 FIX 1 - Normalize email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    // 🔹 Block ONLY if verified user exists
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser && existingUser.isVerified?.email) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // 🔹 Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 🔹 Hash OTP before storing
    const hashedOtp = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const redisKey = `register:${normalizedEmail}`;

    // 🔹 Overwrite allowed (retry safe)
    await redisClient.set(
      redisKey,
      JSON.stringify({
        email: normalizedEmail,
        password: password,
        profile,
        phone,
        interests: interests || [],
        otp: hashedOtp,
      }),
      {
        EX: 600, // 10 min TTL
      }
    );

    // 🔹 Send email
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: "Verify Your Email - Asiyo Global Women Connect",
        html: `
          <h2>Email Verification</h2>
          <h1 style="font-size: 32px; letter-spacing: 4px;">${otp}</h1>
          <p>Expires in 10 minutes</p>
        `,
      });
      console.log("📧 Verification email sent successfully");
    } catch (emailErr) {
      console.error("❌ Email sending FAILED:", emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Verification code sent",
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
   VERIFY EMAIL (UPDATED - Creates Mongo User)
========================================================== */
exports.verifyEmail = async (req, res) => {
  try {
    const { email, token } = req.body;

    // 🔹 FIX 1 - Normalize email
    const normalizedEmail = normalizeEmail(email);

    // 🔹 FIX 3 - OTP Brute Force Protection
    const attemptsKey = `register_attempts:${normalizedEmail}`;
    const attempts = await redisClient.incr(attemptsKey);

    if (attempts === 1) {
      await redisClient.expire(attemptsKey, 600); // 10 minutes
    }

    if (attempts > 5) {
      return res.status(429).json({
        success: false,
        message: "Too many attempts. Please register again.",
      });
    }

    const redisKey = `register:${normalizedEmail}`;
    const tempData = await redisClient.get(redisKey);

    if (!tempData) {
      return res.status(400).json({
        success: false,
        message: "Registration expired. Please register again.",
      });
    }

    const parsed = JSON.parse(tempData);

    const hashedInputOtp = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    if (hashedInputOtp !== parsed.otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    // 🔹 Check for existing user one more time (race condition protection)
    let user = await User.findOne({ email: normalizedEmail });

    if (user && user.isVerified?.email) {
      await redisClient.del(redisKey);
      await redisClient.del(attemptsKey);
      return res.status(400).json({
        success: false,
        message: "User already verified",
      });
    }

    if (user) {
      // Update existing unverified user
      user.password = parsed.password;
      user.profile = parsed.profile;
      user.phone = parsed.phone;
      user.interests = parsed.interests;
      user.isVerified = { email: true };
      user.hasRegistered = true;
      user.tokenVersion = 0;
      await user.save();
    } else {
      // 🔹 Create verified user in MongoDB
      user = await User.create({
        email: normalizedEmail,
        password: parsed.password,
        profile: parsed.profile,
        phone: parsed.phone,
        interests: parsed.interests,
        isVerified: { email: true },
        hasRegistered: true,
        tokenVersion: 0,
      });
    }

    // 🔹 Delete Redis records
    await redisClient.del(redisKey);
    await redisClient.del(attemptsKey);

    const jwtToken = generateToken(user);

    return res.json({
      success: true,
      message: "Email verified successfully",
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          hasRegistered: true
        },
        token: jwtToken,
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

/* ==========================================================
   RESEND EMAIL OTP (REGISTRATION)
========================================================== */
exports.resendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const redisKey = `register:${normalizedEmail}`;
    const cooldownKey = `register_resend:${normalizedEmail}`;

    // 🔒 Cooldown protection (60 seconds)
    const cooldown = await redisClient.get(cooldownKey);
    if (cooldown) {
      return res.status(429).json({
        success: false,
        message: "Please wait before requesting another code.",
      });
    }

    const tempData = await redisClient.get(redisKey);

    if (!tempData) {
      return res.status(400).json({
        success: false,
        message: "Registration expired. Please register again.",
      });
    }

    const parsed = JSON.parse(tempData);

    // 🔹 Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedOtp = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    // 🔹 Update Redis with new OTP and reset TTL
    await redisClient.set(
      redisKey,
      JSON.stringify({
        ...parsed,
        otp: hashedOtp,
      }),
      { EX: 600 } // reset 10 min
    );

    // 🔹 Set cooldown key
    await redisClient.set(cooldownKey, "1", { EX: 60 });

    // 🔹 Send new email
    await sendEmail({
      to: normalizedEmail,
      subject: "Verify Your Email - Asiyo Global Women Connect",
      html: `
        <h2>Email Verification</h2>
        <h1 style="font-size: 32px; letter-spacing: 4px;">${otp}</h1>
        <p>Expires in 10 minutes</p>
      `,
    });

    return res.json({
      success: true,
      message: "Verification code resent successfully",
    });

  } catch (error) {
    console.error("❌ resendEmailOTP error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ==========================================================
   LOGIN (HARDENED)
========================================================== */
exports.login = async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;

    // 🔹 FIX 2 - Basic input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // 🔹 FIX 1 - Normalize email
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail }).select('+password');

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

    // 🔹 Check if account is active
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
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

    // 🔥 Update last login timestamp (with validation disabled for performance)
    user.lastLoginAt = Date.now();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user);

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
   SAVE PUSH TOKEN
========================================================== */
exports.savePushToken = async (req, res) => {
  try {
    const { token, platform } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Push token is required",
      });
    }

    // ✅ 1) Remove any previous record of this token
    await User.updateOne(
      { _id: req.user.id },
      { $pull: { pushTokens: { token } } }
    );

    // ✅ 2) Add fresh record
    await User.updateOne(
      { _id: req.user.id },
      {
        $push: {
          pushTokens: {
            token,
            platform: platform || "unknown",
            createdAt: new Date(),
          },
        },
      }
    );

    return res.json({
      success: true,
      message: "Push token saved",
    });
  } catch (error) {
    console.error("SAVE PUSH TOKEN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save push token",
    });
  }
};

/* ==========================================================
   VERIFY RESET TOKEN
========================================================== */
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
   FORGOT PASSWORD (HARDENED - No Email Enumeration)
========================================================== */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 🔹 FIX 2 - Basic input validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // 🔹 FIX 1 - Normalize email
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail });

    // 🔥 Block email enumeration
    if (user) {
      const resetToken = user.generatePhoneVerificationCode();
      await user.save();

      await sendEmail({
        to: user.email,
        subject: 'Password Reset - Asiyo Global Women Connect',
        html: `
          <h2>Password Reset Code</h2>
          <h1 style="font-size: 32px; letter-spacing: 4px;">${resetToken}</h1>
          <p>This code expires in 10 minutes.</p>
        `,
      });
    }

    // Always return same message regardless of whether user exists
    return res.json({
      success: true,
      message: "If an account with that email exists, a reset code has been sent.",
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
   RESET PASSWORD (HARDENED - Invalidates Sessions)
========================================================== */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // 🔹 FIX 2 - Basic input validation
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

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

    // 🔥 Invalidate all old sessions
    user.password = newPassword;
    user.tokenVersion += 1; // tokenVersion must have default:0 in schema
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

// controllers/userController.js
exports.getMyGamification = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .select("gamification.xp gamification.level")
      .lean();

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.json({
      success: true,
      data: {
        xp: user?.gamification?.xp ?? 0,
        level: user?.gamification?.level ?? 1,
      },
    });
  } catch (err) {
    console.error("getMyGamification error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch gamification" });
  }
};

/* ==========================================================
   ADMIN LOGIN (HARDENED)
========================================================== */
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔹 FIX 2 - Basic input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    console.log("Request body:", req.body);

    // 🔹 FIX 1 - Normalize email
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail }).select('+password');

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

    // 🔹 Check if account is active
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // 🔥 Update last login timestamp (with validation disabled for performance)
    user.lastLoginAt = Date.now();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user);

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