const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendEmail } = require('../utils/email.js');
const { sendSMS } = require('../utils/twilio.js');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.register = async (req, res) => {
  try {
    const { email, password, profile, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phone }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone'
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      profile,
      phone
    });

    // Generate verification token
    const emailToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationToken = emailToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    // Send verification email
    await sendEmail({
      to: email,
      subject: 'Verify Your Email - Asiyo Global Women Connect',
      html: `Your email verification code is: <strong>${emailToken}</strong>`
    });

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if 2FA is enabled
    if (user.auth.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(200).json({
          success: true,
          requires2FA: true,
          message: 'Two-factor authentication required'
        });
      }

      // Verify 2FA code
      const verified = speakeasy.totp.verify({
        secret: user.auth.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2
      });

      if (!verified) {
        return res.status(401).json({
          success: false,
          message: 'Invalid two-factor authentication code'
        });
      }
    }

    // Update device session
    const deviceId = req.headers['device-id'] || req.ip;
    user.auth.deviceSessions.push({
      deviceId,
      lastActive: new Date(),
      ipAddress: req.ip
    });
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    user.auth.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const secret = speakeasy.generateSecret({
      name: `Asiyo App (${user.email})`
    });

    user.auth.tempSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);

    const verified = speakeasy.totp.verify({
      secret: user.auth.tempSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    user.auth.twoFactorEnabled = true;
    user.auth.twoFactorSecret = user.auth.tempSecret;
    user.auth.tempSecret = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send SMS if phone exists, otherwise email
    if (user.phone) {
      await sendSMS({
        to: user.phone,
        body: `Your password reset code is: ${resetToken}. It expires in 10 minutes.`
      });
    } else {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset - Asiyo Global Women Connect',
        html: `Your password reset code is: <strong>${resetToken}</strong>. It expires in 10 minutes.`
      });
    }

    res.json({
      success: true,
      message: 'Password reset code sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};