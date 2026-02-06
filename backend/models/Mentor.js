const mongoose = require("mongoose");

/* =====================================================
   SPOTLIGHT STORY (Embedded)
   Max 10 per mentor
===================================================== */
const storySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: 120,
      trim: true,
    },

    content: {
      type: String,
      required: true,
      maxlength: 3000,
    },

    image: {
      type: String, // optional banner image URL
    },

    views: {
      type: Number,
      default: 0,
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

/* =====================================================
   VERIFICATION DOCUMENTS (URL ONLY)
   Google Drive / Dropbox / etc
===================================================== */
const documentSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true, // "ID", "Certificate"
      trim: true,
    },

    url: {
      type: String,
      required: true,
      match: /^https?:\/\/.+/,
    },

    provider: {
      type: String,
      enum: ["drive", "dropbox", "onedrive", "other"],
      default: "other",
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/* =====================================================
   AVAILABILITY (optional for bookings later)
===================================================== */
const availabilitySchema = new mongoose.Schema(
  {
    day: String, // Monday, Tuesday
    from: String, // "09:00"
    to: String, // "17:00"
  },
  { _id: false }
);

/* =====================================================
   MAIN MENTOR MODEL
===================================================== */
const mentorSchema = new mongoose.Schema(
  {
    /* =================================================
       RELATION
    ================================================= */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one mentor profile per user
    },

    /* =================================================
       PROFILE
    ================================================= */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String, // "CEO & Leadership Coach"
    },

    bio: {
      type: String,
      maxlength: 1000,
    },

    specialty: {
      type: String, // "Finance", "Tech", etc
      index: true,
    },

    experience: {
      type: String, // "10+ years"
    },

    skills: [String],

    languages: [String],

    avatar: {
      type: String, // profile image URL
    },

    /* =================================================
       STATS (auto-updated by system)
    ================================================= */
    rating: {
      type: Number,
      default: 0,
    },

    mentees: {
      type: Number,
      default: 0,
    },

    sessions: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    /* =================================================
       VERIFICATION & MODERATION
    ================================================= */
    verified: {
      type: Boolean,
      default: false, // ONLY true mentors are visible
      index: true,
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    verificationDocs: {
      type: [documentSchema],
      default: [],
      validate: [
        arr => arr.length <= 5,
        "Maximum 5 verification documents allowed",
      ],
    },

    rejectionReason: {
      type: String,
    },

    /* =================================================
       SPOTLIGHT STORIES
       max 10
    ================================================= */
    stories: {
      type: [storySchema],
      default: [],
      validate: [
        arr => arr.length <= 10,
        "Mentor can only post up to 10 stories",
      ],
    },

    /* =================================================
       BOOKING SUPPORT (future ready)
    ================================================= */
    availability: {
      type: [availabilitySchema],
      default: [],
    },

    pricePerSession: {
      type: Number,
      default: 0, // 0 = free
    },

    /* =================================================
       FLAGS
    ================================================= */
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isSuspended: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/* =====================================================
   INDEXES (performance)
===================================================== */
mentorSchema.index({ verified: 1, isActive: 1 });
mentorSchema.index({ rating: -1 });
mentorSchema.index({ specialty: 1 });
mentorSchema.index({ createdAt: -1 });

/* =====================================================
   METHODS
===================================================== */

// Only return public-safe fields
mentorSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();

  delete obj.verificationDocs;
  delete obj.verificationStatus;
  delete obj.rejectionReason;

  return obj;
};

/* =====================================================
   EXPORT
===================================================== */
module.exports = mongoose.model("Mentor", mentorSchema);
