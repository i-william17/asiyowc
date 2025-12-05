const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
    index: true
  },

  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    validate: {
      validator: function (v) {
        return /^\+?[0-9\s-()]{7,20}$/.test(v);
      },
      message: 'Please provide a valid phone number'
    }
  },

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false
  },

  /* ✅ Profile data */
  profile: {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: 100
    },
    role: {
      type: String,
      enum: ['mentor', 'entrepreneur', 'advocate', 'changemaker', 'professional', 'student'],
      default: 'professional'
    },
    bio: {
      type: String,
      maxlength: 500,
      default: ''
    },
    avatar: {
      url: { type: String, default: null },
      publicId: { type: String, default: null }
    }
  },

  /* Interests */
  interests: [{
    type: String,
    enum: [
      'leadership', 'finance', 'health', 'advocacy',
      'entrepreneurship', 'education', 'technology',
      'arts', 'mentorship', 'community', 'wellness'
    ]
  }],

  badges: [{
    type: String
  }],

  /* Verification */
  verification: {
    emailToken: String,
    emailTokenExpires: Date,
    phoneToken: String,
    phoneTokenExpires: Date
  },

  isVerified: {
    email: { type: Boolean, default: false },
    phone: { type: Boolean, default: false }
  },

  /* 2FA */
  twoFactorAuth: {
    enabled: { type: Boolean, default: false },
    secret: String
  },

  /* Activity */
  lastActive: {
    type: Date,
    default: Date.now
  },

  isActive: {
    type: Boolean,
    default: true
  },

  /* ⭐ NEW FIELD — Persist onboarding skip state */
  hasRegistered: {
    type: Boolean,
    default: false,
  },

  programProgress: [{
    program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
    enrolledAt: Date,
    completedAt: Date,
    progress: Number,
    lastActive: Date,
    completedModules: [mongoose.Schema.Types.ObjectId],
    certificates: [{
      programId: mongoose.Schema.Types.ObjectId,
      certificateId: String,
      issuedAt: Date,
      downloadUrl: String
    }]
  }],

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/* Indexes */
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ interests: 1 });
userSchema.index({ createdAt: -1 });

/* Password hashing */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/* Compare password */
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

/* Generate email verification code */
userSchema.methods.generateEmailVerificationCode = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.verification.emailToken = code;
  this.verification.emailTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
  return code;
};

/* Generate phone verification code */
userSchema.methods.generatePhoneVerificationCode = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.verification.phoneToken = code;
  this.verification.phoneTokenExpires = Date.now() + 10 * 60 * 1000;
  return code;
};

/* Profile URL */
userSchema.virtual('profileUrl').get(function () {
  return `/users/${this._id}/profile`;
});

const User = mongoose.model('User', userSchema);
module.exports = User;
