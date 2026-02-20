// models/Chat.js
const mongoose = require('mongoose');

/* =====================================================
   MESSAGE SCHEMA
===================================================== */

const reactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const readReceiptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    ciphertext: {
      type: String,
      required: true
    },

    iv: {
      type: String,
      required: true
    },

    tag: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: ['text', 'share'],
      default: 'text'
    },

    sharedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    },

    /* =====================
       🔁 REPLY SUPPORT
    ===================== */
    replyTo: {
      type: mongoose.Schema.Types.ObjectId
    },

    /* =====================
       ❤️ REACTIONS
    ===================== */
    reactions: [reactionSchema],

    /* =====================
       ✓✓ READ RECEIPTS
    ===================== */
    readBy: [readReceiptSchema],

    /* =====================
       🗑 DELETE CONTROL
    ===================== */
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    isDeletedForEveryone: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

/* =====================================================
   CHAT SCHEMA
===================================================== */
const chatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['dm', 'group'],
      required: true
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],

    /* =====================
   🚫 BLOCKED USERS
===================== */
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    // 🔑 DM-only uniqueness key
    dmKey: {
      type: String,
      index: true,
      sparse: true
    },

    messages: [messageSchema],

    /* =====================
       📌 PINNED MESSAGE
    ===================== */
    pinnedMessage: {
      type: mongoose.Schema.Types.ObjectId
    },

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
   🔒 HARDENING (KEEP)
===================================================== */

chatSchema.pre('validate', function (next) {
  if (Array.isArray(this.participants)) {
    this.participants = this.participants
      .map((v) => (typeof v === 'object' ? v._id || v.id : v))
      .filter((v) => mongoose.Types.ObjectId.isValid(v));
  }
  next();
});

const normalizeId = (v) =>
  typeof v === 'object' && v !== null ? v._id || v.id : v;

chatSchema.pre(
  ['find', 'findOne', 'findOneAndUpdate', 'countDocuments'],
  function () {
    const cond = this.getQuery?.() || this._conditions;

    if (cond?.participants?.$all) {
      cond.participants.$all = cond.participants.$all
        .map(normalizeId)
        .filter((v) => mongoose.Types.ObjectId.isValid(v));
    }

    if (Array.isArray(cond?.participants)) {
      cond.participants = cond.participants
        .map(normalizeId)
        .filter((v) => mongoose.Types.ObjectId.isValid(v));
    }
  }
);

/* =====================================================
   VIRTUALS (UI REQUIRED)
===================================================== */

chatSchema.virtual('lastMessage').get(function () {
  if (!this.messages || this.messages.length === 0) return null;
  return this.messages[this.messages.length - 1];
});

chatSchema.virtual('lastMessageAt').get(function () {
  if (!this.messages || this.messages.length === 0) return this.updatedAt;
  return this.messages[this.messages.length - 1].createdAt;
});

chatSchema.virtual('messagesCount').get(function () {
  return this.messages ? this.messages.length : 0;
});

/* =====================================================
   INDEXES
===================================================== */

chatSchema.index(
  { dmKey: 1 },
  {
    unique: true,
    partialFilterExpression: { type: 'dm' }
  }
);

chatSchema.index({ participants: 1, updatedAt: -1 });
chatSchema.index({ isRemoved: 1 });
chatSchema.index({ blockedUsers: 1 });

module.exports = mongoose.model('Chat', chatSchema);
