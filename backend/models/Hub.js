const mongoose = require("mongoose");

/* =====================================================
   🔥 SINGLE REACTION SCHEMA (REUSED EVERYWHERE)
===================================================== */
const hubReactionSchema = new mongoose.Schema(
  {
    emoji: {
      type: String, // 👍 ❤️ 🔥 😂
      required: true,
      trim: true,
    },

    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],

    count: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

/* =====================================================
   🔥 HUB UPDATE SUBSCHEMA (EMBEDDED)
   Uses SAME reaction schema above
===================================================== */
const hubUpdateSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* text | image | video */
    type: {
      type: String,
      enum: ["text", "image", "video"],
      default: "text",
    },

    content: {
      text: {
        type: String,
        trim: true,
      },

      imageUrl: String,
      videoUrl: String,
      publicId: String, // Cloudinary cleanup
    },

    /* ✅ REUSE SAME REACTION SCHEMA */
    reactions: {
      type: [hubReactionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

/* =====================================================
   HUB SCHEMA
===================================================== */
const hubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    /* =====================
       UI FIELDS
    ===================== */
    description: {
      type: String,
      maxlength: 500,
      default: "",
    },

    avatar: {
      type: String,
      default: null,
    },

    /* =====================
       TYPE
    ===================== */
    type: {
      type: String,
      enum: ["regional", "international", "global"],
      required: true,
    },

    region: {
      type: String,
      required: function () {
        return this.type === "regional";
      },
    },

    /* =====================
       ROLES
    ===================== */
    moderators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    /* =====================
       POSTS (UNCHANGED)
    ===================== */
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],

    /* =====================================================
       🔥 NEW: EMBEDDED UPDATES FEED
       (NO NEW MODEL NEEDED)
    ===================================================== */
    updates: {
      type: [hubUpdateSchema],
      default: [],
    },

    /* =====================================================
       HUB-LEVEL REACTIONS (SAME SCHEMA REUSED)
    ===================================================== */
    reactions: {
      type: [hubReactionSchema],
      default: [],
    },

    isRemoved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* =====================================================
   VIRTUALS
===================================================== */
hubSchema.virtual("membersCount").get(function () {
  return this.members ? this.members.length : 0;
});

/* =====================================================
   INDEXES
===================================================== */
hubSchema.index({ type: 1, region: 1 });
hubSchema.index({ members: 1 });
hubSchema.index({ "reactions.users": 1 });
hubSchema.index({ "updates.author": 1 });
hubSchema.index({ isRemoved: 1 });

module.exports = mongoose.model("Hub", hubSchema);
