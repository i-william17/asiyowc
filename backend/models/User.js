const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

/* ================= EMERGENCY CONTACT ================= */
const emergencyContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    relationship: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

/* ================= USER ================= */
const userSchema = new mongoose.Schema(
  {
    /* ================= AUTH ================= */
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
      index: true,
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      validate: {
        validator: function (v) {
          return /^\+?[0-9\s-()]{7,20}$/.test(v);
        },
        message: 'Please provide a valid phone number',
      },
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },

    /* ================= PROFILE ================= */
    profile: {
      fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        maxlength: 100,
      },

      role: {
        type: String,
        enum: [
          'mentor',
          'entrepreneur',
          'advocate',
          'changemaker',
          'professional',
          'learner',
        ],
        default: 'professional',
      },

      bio: {
        type: String,
        maxlength: 500,
        default: '',
      },

      /* ===== LOCATION (NEW) ===== */
      location: {
        country: {
          type: String,
          trim: true,
          default: '',
        },
        countryCode: {
          type: String,
          trim: true,
          uppercase: true,
          minlength: 2,
          maxlength: 2,
          default: undefined,
        },
        city: {
          type: String,
          trim: true,
          default: '',
        },
      },

      avatar: {
        url: { type: String, default: null },
        publicId: { type: String, default: null },
      },

      coverPhoto: {
        url: { type: String, default: null },
        publicId: { type: String, default: null },
      },
    },

    /* ================= INTERESTS ================= */
    interests: [
      {
        type: String,
        enum: [
          'leadership',
          'finance',
          'health',
          'advocacy',
          'entrepreneurship',
          'education',
          'technology',
          'arts',
          'mentorship',
          'community',
          'wellness',
        ],
      },
    ],

    /* ================= BADGES ================= */
    badges: [
      {
        type: String,
        trim: true,
      },
    ],

    /* ================= VERIFICATION ================= */
    verification: {
      emailToken: String,
      emailTokenExpires: Date,
      phoneToken: String,
      phoneTokenExpires: Date,
    },

    isVerified: {
      email: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
    },

    /* ================= TWO FACTOR AUTH ================= */
    twoFactorAuth: {
      enabled: { type: Boolean, default: false },
      secret: String,
    },

    /* ================= ACTIVITY ================= */
    lastActive: {
      type: Date,
      default: Date.now,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    /* ================= ADMIN ================= */
    isAdmin: {
      type: Boolean,
      default: false,
      index: true
    },

    hasRegistered: {
      type: Boolean,
      default: false,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },

    /* ================= SAFETY & SOS ================= */
    safety: {
      emergencyContacts: [emergencyContactSchema],
      lastSOSUsed: Date,
    },

    /* ================= PROGRAM PROGRESS ================= */
    programProgress: [
      {
        program: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Program',
        },
        enrolledAt: Date,
        completedAt: Date,
        progress: Number,
        lastActive: Date,
        completedModules: [mongoose.Schema.Types.ObjectId],
        certificates: [
          {
            programId: mongoose.Schema.Types.ObjectId,
            certificateId: String,
            issuedAt: Date,
            downloadUrl: String,
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ================= INDEXES ================= */
userSchema.index({ interests: 1 });
userSchema.index({ createdAt: -1 });
// Optional future use:
// userSchema.index({ 'profile.location.countryCode': 1 });

/* ================= PASSWORD HASHING ================= */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/* ================= PASSWORD COMPARISON ================= */
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

/* ================= VERIFICATION TOKENS ================= */
userSchema.methods.generateEmailVerificationCode = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.verification.emailToken = code;
  this.verification.emailTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
  return code;
};

userSchema.methods.generatePhoneVerificationCode = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.verification.phoneToken = code;
  this.verification.phoneTokenExpires = Date.now() + 10 * 60 * 1000;
  return code;
};

/* ================= VIRTUALS ================= */
userSchema.virtual('profileUrl').get(function () {
  return `/users/${this._id}/profile`;
});

const User = mongoose.model('User', userSchema);
module.exports = User;
