const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
    },

    experience: {
      type: String,
      enum: ["excellent", "good", "average", "poor", "terrible"],
    },

    message: {
      type: String,
      trim: true,
      maxlength: 3000,
    },

    usageDuration: {
      type: String,
      enum: [
        "first_time",
        "less_than_week",
        "1_3_months",
        "3_6_months",
        "6_12_months",
        "1_year_plus",
      ],
    },

    featureArea: {
      type: String,
      enum: [
        "community",
        "programs",
        "marketplace",
        "savings_pods",
        "mentorship",
        "wellness",
        "general",
      ],
      default: "general",
    },

    recommend: {
      type: Boolean,
      default: true,
    },

    sentiment: {
      type: String,
      enum: ["positive", "neutral", "negative"],
      default: "neutral",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);