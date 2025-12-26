// models/Hub.js
const mongoose = require('mongoose');

const hubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    /* =====================
       ADDED (UI REQUIRED)
    ===================== */
    description: {
      type: String,
      maxlength: 500,
      default: ''
    },

    avatar: {
      type: String, // Cloudinary / S3 URL
      default: null
    },
    /* ===================== */

    type: {
      type: String,
      enum: ['regional', 'international', 'global'],
      required: true
    },

    region: {
      type: String,
      required: function () {
        return this.type === 'regional';
      }
    },

    moderators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],

    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],

    posts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    }],

    isRemoved: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/* =====================================================
   VIRTUALS (UI-DERIVED)
===================================================== */
hubSchema.virtual('membersCount').get(function () {
  return this.members ? this.members.length : 0;
});

/* =====================================================
   INDEXES (UNCHANGED)
===================================================== */
hubSchema.index({ type: 1, region: 1 });
hubSchema.index({ members: 1 });
hubSchema.index({ isRemoved: 1 });

module.exports = mongoose.model('Hub', hubSchema);
