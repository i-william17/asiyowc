// models/Chat.js
const mongoose = require("mongoose");
const {
  generateChatKey,
  encryptChatKey,
} = require("../utils/chatCrypto");

/* =====================================================
   READ STATE
===================================================== */
const readStateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lastReadSeq: {
      type: Number,
      default: 0,
    },

    lastReadAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/* =====================================================
   CHAT SCHEMA
===================================================== */
const chatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["dm", "group"],
      required: true,
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    pinnedMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null
    },

    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    dmKey: {
      type: String,
      index: true,
      sparse: true,
    },

    /* =====================
       PER-CHAT ENCRYPTION KEY
    ===================== */
    encryptedChatKey: {
      type: String,
      required: true,
    },

    chatKeyIv: {
      type: String,
      required: true,
    },

    chatKeyTag: {
      type: String,
      required: true,
    },

    keyVersion: {
      type: String,
      default: "v1",
    },

    /* =====================
       CHAT SUMMARY
    ===================== */
    pinnedMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    lastMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    lastMessageAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastMessageType: {
      type: String,
      enum: ["text", "share", null],
      default: null,
    },

    /* =====================
       SEQUENCE
    ===================== */
    lastSeq: {
      type: Number,
      default: 0,
    },

    /* =====================
       READ STATE
    ===================== */
    readState: {
      type: [readStateSchema],
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
   HARDENING
===================================================== */
chatSchema.pre("validate", function (next) {
  if (Array.isArray(this.participants)) {
    this.participants = this.participants
      .map((v) => (typeof v === "object" ? v._id || v.id : v))
      .filter((v) => mongoose.Types.ObjectId.isValid(v));
  }
  next();
});

const normalizeId = (v) =>
  typeof v === "object" && v !== null ? v._id || v.id : v;

chatSchema.pre(
  ["find", "findOne", "findOneAndUpdate", "countDocuments"],
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
   AUTO-GENERATE CHAT KEY ON CREATE
===================================================== */
chatSchema.pre("validate", function (next) {
  if (!this.isNew) return next();

  if (this.encryptedChatKey && this.chatKeyIv && this.chatKeyTag) {
    return next();
  }

  try {
    const chatKey = generateChatKey();
    const wrapped = encryptChatKey(chatKey);

    this.encryptedChatKey = wrapped.encryptedChatKey;
    this.chatKeyIv = wrapped.chatKeyIv;
    this.chatKeyTag = wrapped.chatKeyTag;
    this.keyVersion = wrapped.keyVersion;

    next();
  } catch (err) {
    next(err);
  }
});

/* =====================================================
   VIRTUALS
===================================================== */
chatSchema.virtual("messagesCount", {
  ref: "Message",
  localField: "_id",
  foreignField: "chatId",
  count: true,
});

chatSchema.index(
  { dmKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: "dm",
      isRemoved: false,
    },
  }
);

chatSchema.index({ participants: 1, updatedAt: -1 });
chatSchema.index({ isRemoved: 1 });
chatSchema.index({ blockedUsers: 1 });
chatSchema.index({ _id: 1, "readState.user": 1 });
chatSchema.index({ lastMessageAt: -1 });

chatSchema.methods.getReadState = function (userId) {
  return this.readState.find((r) => String(r.user) === String(userId));
};

module.exports = mongoose.model("Chat", chatSchema);