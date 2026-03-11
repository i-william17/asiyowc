// models/Message.js
const mongoose = require("mongoose");
const {
  encryptWithKey,
  decryptWithKey,
  decryptChatKey,
} = require("../utils/chatCrypto");

const reactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    emoji: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const readReceiptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    ciphertext: {
      type: String,
      required: true,
    },

    iv: {
      type: String,
      required: true,
    },

    tag: {
      type: String,
      required: true,
    },

    algorithm: {
      type: String,
      default: "aes-256-gcm",
    },

    keyVersion: {
      type: String,
      default: "v1",
    },

    type: {
      type: String,
      enum: ["text", "share"],
      default: "text",
    },

    sharedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    reactions: [reactionSchema],

    readBy: [readReceiptSchema],

    seq: {
      type: Number,
      required: true,
      index: true,
    },

    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* =====================================================
   AUTO-ENCRYPT BEFORE VALIDATE
   IMPORTANT:
   - lets current backend keep sending `ciphertext`
   - if iv/tag missing, we treat incoming ciphertext as PLAINTEXT
===================================================== */
messageSchema.pre("validate", async function (next) {
  try {
    if (!this.isModified("ciphertext")) return next();

    // already encrypted
    if (
      this.iv &&
      this.tag &&
      this.iv !== "pending" &&
      this.tag !== "pending"
    ) {
      return next();
    }

    const Chat = mongoose.model("Chat");
    const chat = await Chat.findById(this.chatId).select(
      "encryptedChatKey chatKeyIv chatKeyTag"
    );

    if (!chat) {
      return next(new Error("Chat not found for message encryption"));
    }

    const chatKey = decryptChatKey(
      chat.encryptedChatKey,
      chat.chatKeyIv,
      chat.chatKeyTag
    );

    this.iv = undefined;
    this.tag = undefined;

    const encrypted = encryptWithKey(this.ciphertext, chatKey);

    this.iv = encrypted.iv;
    this.tag = encrypted.tag;
    this.ciphertext = encrypted.ciphertext;

    next();
  } catch (err) {
    next(err);
  }
});

/* =====================================================
   INDEXES
===================================================== */
messageSchema.index({ chatId: 1, seq: 1 }, { unique: true });
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ replyTo: 1 });
messageSchema.index({ chatId: 1, seq: -1 });

module.exports = mongoose.model("Message", messageSchema);