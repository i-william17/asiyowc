const mongoose = require("mongoose");

/* =====================================================
   SUBDOCUMENT: Participant Progress
   (embedded for fast reads per session)
===================================================== */

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* -----------------------------
       Progress tracking
    ----------------------------- */
    progress: {
      type: Number, // 0 → 100
      default: 0,
      min: 0,
      max: 100,
    },

    minutesWatched: {
      type: Number,
      default: 0,
    },

    /* -----------------------------
       Completion
    ----------------------------- */
    completed: {
      type: Boolean,
      default: false,
    },

    completedAt: Date,

    /* -----------------------------
       Engagement
    ----------------------------- */
    lastWatchedAt: Date,
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);



/* =====================================================
   MAIN RETREAT SCHEMA
===================================================== */

const retreatSchema = new mongoose.Schema(
  {
    /* =================================================
       BASIC INFO
    ================================================= */

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      maxlength: 2000,
    },

    instructor: {
      type: String,
    },

    type: {
      type: String,
      enum: [
        "meditation",
        "yoga",
        "breathwork",
        "therapy",
        "mindfulness",
        "fitness",
      ],
      index: true,
    },

    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },

    duration: {
      type: Number, // minutes
      required: true,
    },



    /* =================================================
       MEDIA
    ================================================= */

    thumbnail: {
      url: String,
      publicId: String,
    },

    videoUrl: String, // streaming or Cloudinary

    audioUrl: String, // optional audio-only version



    /* =================================================
       TAGS / DISCOVERY
    ================================================= */

    tags: [
      {
        type: String,
        index: true,
      },
    ],

    category: {
      type: String, // stress, sleep, focus, anxiety
      index: true,
    },



    /* =================================================
       USER PARTICIPATION
       (embedded for fast mobile reads)
    ================================================= */

    participants: [participantSchema],

    participantsCount: {
      type: Number,
      default: 0,
    },

    completionsCount: {
      type: Number,
      default: 0,
    },



    /* =================================================
       STATS / ANALYTICS
    ================================================= */

    averageCompletionRate: {
      type: Number,
      default: 0,
    },

    totalMinutesWatched: {
      type: Number,
      default: 0,
    },



    /* =================================================
       ADMIN / CONTROL
    ================================================= */

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    order: {
      type: Number,
      default: 0, // for sorting UI
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // admin
    },
  },
  { timestamps: true }
);



/* =====================================================
   INDEXES (IMPORTANT FOR SCALE)
===================================================== */

// fast filtering
retreatSchema.index({ type: 1 });
retreatSchema.index({ category: 1 });
retreatSchema.index({ isActive: 1 });

// prevent duplicate participant entries
retreatSchema.index(
  { _id: 1, "participants.user": 1 },
  { unique: true, sparse: true }
);



/* =====================================================
   AUTO-COMPLETE MIDDLEWARE
   If progress >= 100 → mark completed
===================================================== */

retreatSchema.methods.updateParticipantProgress = function (
  userId,
  progress,
  minutes
) {
  let participant = this.participants.find(
    (p) => p.user.toString() === userId.toString()
  );

  if (!participant) {
    participant = { user: userId };
    this.participants.push(participant);
    this.participantsCount += 1;
  }

  participant.progress = progress;
  participant.minutesWatched += minutes || 0;
  participant.lastWatchedAt = new Date();

  if (progress >= 100 && !participant.completed) {
    participant.completed = true;
    participant.completedAt = new Date();
    this.completionsCount += 1;
  }
};



module.exports = mongoose.model("Retreat", retreatSchema);
