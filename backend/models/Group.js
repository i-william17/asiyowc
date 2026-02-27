// models/Group.js
const mongoose = require('mongoose');

/* =====================================================
   PRIVATE GROUP INVITE TOKENS
===================================================== */
const inviteTokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    description: {
      type: String,
      maxlength: 1000
    },

    avatar: {
      type: String,
      default: null
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
      }
    ],

    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
          index: true
        },
        joinedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true
    },

    privacy: {
      type: String,
      enum: ['public', 'private', 'system'],
      default: 'public'
    },

    /**
     * 🔐 PRIVATE GROUP INVITE LINKS
     * - Used only for private groups
     * - Stored as hashed tokens
     */
    inviteTokens: {
      type: [inviteTokenSchema],
      default: []
    },

    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        index: true
      }
    ],

    isRemoved: {
      type: Boolean,
      default: false,
      index: true
    },

    isArchived: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/* =====================================================
   VIRTUALS
===================================================== */
groupSchema.virtual('membersCount').get(function () {
  return this.members ? this.members.length : 0;
});

/* =====================================================
   INDEXES
===================================================== */
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ privacy: 1, isRemoved: 1, isArchived: 1 });

groupSchema.index({
  name: 'text',
  description: 'text'
});

module.exports = mongoose.model('Group', groupSchema);
