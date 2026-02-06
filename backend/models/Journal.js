const mongoose = require("mongoose");

/* =====================================================
   SUBDOCUMENTS
===================================================== */

/* -----------------------------
   Mood subdocument (semantic)
----------------------------- */
const moodSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      enum: ["great", "good", "okay", "low"],
    },

    score: {
      type: Number, // 1–4 (analytics)
      min: 1,
      max: 4,
    },

    note: String,

    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);



/* =====================================================
   MAIN JOURNAL SCHEMA
===================================================== */

const journalSchema = new mongoose.Schema(
  {
    /* =================================================
       OWNER + DAY
    ================================================= */

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },



    /* =================================================
       MOOD TRACKING
    ================================================= */

    // semantic mood (label + score)
    mood: moodSchema,

    // ✅ EXACT dial value (0–100)
    moodValue: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
      index: true, // useful for analytics queries later
    },



    /* =================================================
       JOURNAL CONTENT
    ================================================= */

    text: {
      type: String,
      maxlength: 5000,
      default: "",
    },

    gratitude: [
      {
        type: String,
        trim: true,
      },
    ],

    tags: [
      {
        type: String,
        index: true,
      },
    ],



    /* =================================================
       INSIGHTS / WELLNESS
    ================================================= */

    affirmation: String,

    wellnessScore: {
      type: Number,
      default: 0,
    },



    /* =================================================
       STREAK SYSTEM
    ================================================= */

    streakDay: {
      type: Number,
      default: 0,
    },

    isComplete: {
      type: Boolean,
      default: false,
    },



    /* =================================================
       META
    ================================================= */

    source: {
      type: String,
      default: "mobile",
    },
  },
  { timestamps: true }
);



/* =====================================================
   INDEXES
===================================================== */

// only ONE journal per user per day
journalSchema.index({ user: 1, date: 1 }, { unique: true });

journalSchema.index({ user: 1, createdAt: -1 });

journalSchema.index({ moodValue: 1 }); // analytics / charts



/* =====================================================
   HELPERS
===================================================== */

journalSchema.methods.calculateScore = function () {
  let score = 0;

  if (this.text?.length > 20) score += 40;
  if (this.gratitude?.length) score += 20;

  if (this.mood?.score) score += this.mood.score * 10;

  // optional: boost based on raw mood value
  if (this.moodValue >= 80) score += 10;

  this.wellnessScore = Math.min(score, 100);
};



/* =====================================================
   AUTO FLAGS
===================================================== */

journalSchema.pre("save", function (next) {
  if (this.text || this.moodValue !== undefined) {
    this.isComplete = true;
  }

  this.calculateScore();

  next();
});



module.exports = mongoose.model("Journal", journalSchema);