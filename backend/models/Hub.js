const mongoose = require("mongoose");

/* =====================================================
   🔥 SINGLE REACTION SCHEMA (REUSED EVERYWHERE)
===================================================== */
const hubReactionSchema = new mongoose.Schema(
  {
    emoji: {
      type: String,
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
   🔥 HUB UPDATE SUBSCHEMA
===================================================== */
const hubUpdateSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["text", "image", "video"],
      required: true,
    },

    /* ================= CONTENT ================= */
    content: {
      text: {
        type: String,
        trim: true,
      },

      caption: {
        type: String,
        trim: true,
      },

      imageUrl: String,
      videoUrl: String,
      publicId: String, // Cloudinary cleanup
    },

    /* ================= REACTIONS ================= */
    reactions: {
      type: [hubReactionSchema],
      default: [],
    },

  },

  /* ================= TIMESTAMPS ================= */
  { timestamps: true }
);

/* =====================================================
   🔥 STRICT TYPE VALIDATION
===================================================== */
hubUpdateSchema.pre("validate", function (next) {
  if (!this.content) {
    this.content = {};
  }

  if (this.type === "text") {
    if (!this.content.text || !this.content.text.trim()) {
      return next(new Error("Text update must include content.text"));
    }
  }

  if (this.type === "image") {
    if (!this.content.imageUrl) {
      return next(new Error("Image update must include content.imageUrl"));
    }
  }

  if (this.type === "video") {
    if (!this.content.videoUrl) {
      return next(new Error("Video update must include content.videoUrl"));
    }
  }

  next();
});

/* =====================================================
   🔥 HUB SCHEMA
===================================================== */
const hubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      maxlength: 500,
      default: "",
    },

    avatar: {
      type: String,
      default: null,
    },

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

    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],

    /* ================= UPDATES FEED ================= */
    updates: {
      type: [hubUpdateSchema],
      default: [],
    },

    /* ================= PINNING ================= */
    pinnedUpdate: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    /* ================= HUB REACTIONS ================= */
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
   🔥 VIRTUALS
===================================================== */
hubSchema.virtual("membersCount").get(function () {
  return this.members ? this.members.length : 0;
});

/* =====================================================
   🔥 INDEXES
===================================================== */
hubSchema.index({ type: 1, region: 1 });
hubSchema.index({ members: 1 });
hubSchema.index({ "reactions.users": 1 });
hubSchema.index({ "updates.author": 1 });
hubSchema.index({ isRemoved: 1 });

module.exports = mongoose.model("Hub", hubSchema);
