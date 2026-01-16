// models/Voice.js
const mongoose = require("mongoose");

/* =====================================================
   VOICE INSTANCE (SESSION)
===================================================== */

const voiceInstanceSchema = new mongoose.Schema(
  {
    /* ================================
       TIME & STATUS
    ================================ */
    startsAt: {
      type: Date,
      required: true,
      index: true,
    },

    endsAt: {
      type: Date,
      required: true,
    },

    endedAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["scheduled", "live", "ended"],
      default: "scheduled",
      index: true,
    },

    /* ================================
       STABLE INSTANCE ID (SOCKET SAFE)
    ================================ */
    instanceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
      index: true,
    },

    /* ================================
       PARTICIPATION
    ================================ */
    speakers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    /* ================================
       CHAT STATE (BACKUP SOURCE)
    ================================ */
    chatEnabled: {
      type: Boolean,
      default: true,
    },

    /* ================================
       MODERATION (NON-BREAKING)
    ================================ */
    kickedUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reason: String,
        kickedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    /* ================================
       RECORDING / REPLAY (FUTURE)
    ================================ */
    recording: {
      enabled: {
        type: Boolean,
        default: false,
      },
      recordingUrl: String,
      startedAt: Date,
      endedAt: Date,
    },

    /* ================================
       SHARED CONTENT
    ================================ */
    sharedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
  },
  {
    timestamps: true,
  }
);

/* =====================================================
   VOICE ROOM (ROOT)
===================================================== */

const voiceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      index: true,
    },

    hub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hub",
      index: true,
    },

    instances: [voiceInstanceSchema],

    isRemoved: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* =====================================================
   VIRTUALS (UI + SOCKET REQUIRED)
===================================================== */

/**
 * Current / Active Instance
 * - Live preferred
 * - Falls back to last created
 */
voiceSchema.virtual("currentInstance").get(function () {
  if (!Array.isArray(this.instances) || this.instances.length === 0) {
    return null;
  }

  return (
    this.instances.find((i) => i.status === "live") ??
    this.instances[this.instances.length - 1]
  );
});

/**
 * Is room live (LIVE badge)
 */
voiceSchema.virtual("isLive").get(function () {
  const instance = this.currentInstance;
  return instance ? instance.status === "live" : false;
});

/**
 * Listener count
 */
voiceSchema.virtual("listenersCount").get(function () {
  const instance = this.currentInstance;
  return instance?.participants?.length ?? 0;
});

/**
 * Speakers count
 */
voiceSchema.virtual("speakersCount").get(function () {
  const instance = this.currentInstance;
  return instance?.speakers?.length ?? 0;
});

/**
 * Total participants
 */
voiceSchema.virtual("participantsCount").get(function () {
  const instance = this.currentInstance;
  if (!instance) return 0;

  return (
    (instance.speakers?.length ?? 0) +
    (instance.participants?.length ?? 0)
  );
});

/**
 * Socket room ID helper
 */
voiceSchema.virtual("roomId").get(function () {
  return String(this._id);
});

/* =====================================================
   INDEXES (PERFORMANCE)
===================================================== */

voiceSchema.index({ "instances.status": 1, "instances.startsAt": -1 });
voiceSchema.index({ createdAt: -1 });

/* =====================================================
   EXPORT
===================================================== */

module.exports = mongoose.model("Voice", voiceSchema);
