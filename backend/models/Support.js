const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    category: {
      type: String,
      enum: [
        "technical_issue",
        "account_problem",
        "payment_issue",
        "bug_report",
        "feature_request",
        "security_concern",
        "other",
      ],
      default: "other",
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    attachments: [
      {
        url: String,
        public_id: String,
      },
    ],

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },

    deviceInfo: {
      platform: String, // ios / android / web
      appVersion: String,
      device: String,
      osVersion: String,
    },

    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Support", supportSchema);