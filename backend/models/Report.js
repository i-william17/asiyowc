// models/Report.js
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    targetType: {
      type: String,
      enum: ['post', 'comment', 'chat'],
      required: true
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'targetType'
    },

    reason: {
      type: String,
      required: true,
      maxlength: 1000
    },

    resolved: {
      type: Boolean,
      default: false
    },

    /* =====================
       ADDED (MODERATION)
    ===================== */
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    resolvedAt: {
      type: Date,
      default: null
    }
    /* ===================== */
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/* =====================================================
   VIRTUALS (UI / ADMIN)
===================================================== */

// Human-readable status
reportSchema.virtual('status').get(function () {
  return this.resolved ? 'resolved' : 'pending';
});

// Convenience flag for queues
reportSchema.virtual('isPending').get(function () {
  return !this.resolved;
});

/* =====================================================
   INDEXES (UNCHANGED)
===================================================== */
reportSchema.index({ resolved: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ reporter: 1 });

module.exports = mongoose.model('Report', reportSchema);
