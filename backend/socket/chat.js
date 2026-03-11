// backend/socket/chat.js
const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require("../models/User");
const {
  decryptWithKey,
  decryptChatKey
} = require("../utils/chatCrypto");
const { sendExpoPushToUser } = require("../utils/push");
const { isOnline } = require("./presence");

/* =====================================================
   HELPERS (CRITICAL)
===================================================== */

const normalizeId = (v) => {
  if (!v) return null;

  // String
  if (typeof v === "string") return v;

  // Mongoose ObjectId
  if (v instanceof mongoose.Types.ObjectId) {
    return v.toString();
  }

  // Populated object
  if (typeof v === "object") {
    if (v._id) return v._id.toString();
    if (v.id) return v.id.toString();
  }

  return null;
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* =====================================================
   SOCKET CHAT HANDLERS
===================================================== */

module.exports = (io, socket) => {
  const userId = normalizeId(socket.user?.id);
  if (!isValidId(userId)) return;

  /* =====================================================
     JOIN ALL CHATS
  ===================================================== */
  socket.on('chat:joinAll', async (_, cb) => {
    try {
      const chats = await Chat.find({
        participants: userId,
        isRemoved: false,
      }).select('_id');

      chats.forEach((c) => {
        socket.join(`chat:${c._id.toString()}`);
      });

      cb?.({ success: true, joined: chats.length });
    } catch (e) {
      console.error('chat:joinAll error', e);
      cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
     JOIN ONE CHAT
  ===================================================== */
  socket.on('chat:join', async ({ chatId }, cb) => {
    try {
      const cleanChatId = normalizeId(chatId);
      if (!isValidId(cleanChatId)) {
        return cb?.({ success: false, message: 'Invalid chatId' });
      }

      const chat = await Chat.findOne({
        _id: cleanChatId,
        participants: userId,
        isRemoved: false,
      }).select('_id');

      if (!chat) {
        return cb?.({ success: false, message: 'Access denied' });
      }

      socket.join(`chat:${cleanChatId}`);
      cb?.({ success: true });
    } catch (e) {
      console.error('chat:join error', e);
      cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
     CREATE CHAT
  ===================================================== */
  socket.on('chat:create', async ({ type = 'dm', participants = [] }, cb) => {
    try {
      if (!Array.isArray(participants)) {
        return cb?.({ success: false, message: 'Invalid participants' });
      }

      const cleanParticipants = [
        userId,
        ...participants.map(normalizeId),
      ].filter(isValidId);

      const uniqueParticipants = [...new Set(cleanParticipants.map(String))];

      if (uniqueParticipants.length < 2) {
        return cb?.({ success: false, message: 'At least 2 participants required' });
      }

      if (type === "dm") {
        const existing = await Chat.findOne({
          type: "dm",
          participants: { $all: uniqueParticipants, $size: uniqueParticipants.length },
          isRemoved: false,
        });

        if (existing) {
          socket.join(`chat:${existing._id}`);
          return cb?.({ success: true, chat: existing });
        }
      }

      const chat = await Chat.create({
        type,
        participants: uniqueParticipants,
      });

      uniqueParticipants.forEach((uid) => {
        io.to(`user:${uid}`).emit('chat:created', chat);
      });

      socket.join(`chat:${chat._id}`);
      cb?.({ success: true, chat });
    } catch (e) {
      console.error('chat:create error', e);
      cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
     TYPING INDICATORS (WITH BLOCK CHECK)
  ===================================================== */
  socket.on('typing:start', async ({ chatId }) => {
    try {
      const cid = normalizeId(chatId);
      if (!isValidId(cid)) return;

      // 🔥 BLOCK CHECK
      const chat = await Chat.findById(cid).select('blockedUsers');
      if (chat?.blockedUsers?.map(String).includes(String(userId))) return;

      socket.to(`chat:${cid}`).emit('typing:start', {
        chatId: cid,
        userId,
      });
    } catch (e) {
      console.error('typing:start error', e);
    }
  });

  socket.on('typing:stop', async ({ chatId }) => {
    try {
      const cid = normalizeId(chatId);
      if (!isValidId(cid)) return;

      // 🔥 BLOCK CHECK
      const chat = await Chat.findById(cid).select('blockedUsers');
      if (chat?.blockedUsers?.map(String).includes(String(userId))) return;

      socket.to(`chat:${cid}`).emit('typing:stop', {
        chatId: cid,
        userId,
      });
    } catch (e) {
      console.error('typing:stop error', e);
    }
  });

  /* =====================================================
     SEND MESSAGE (TEXT / REPLY) WITH BLOCK CHECK
  ===================================================== */
  socket.on("message:send", async ({ chatId, payload }, cb) => {
    try {

      const cid = normalizeId(chatId);

      if (!isValidId(cid) || !payload?.ciphertext) {
        return cb?.({ success: false });
      }

      const chat = await Chat.findOne({
        _id: cid,
        participants: userId,
        isRemoved: false
      }).select(
        "participants encryptedChatKey chatKeyIv chatKeyTag blockedUsers type readState lastSeq"
      );

      if (!chat) {
        return cb?.({ success: false });
      }

      if (chat.blockedUsers?.map(String).includes(String(userId))) {
        return cb?.({ success: false, message: "Blocked" });
      }

      /* =====================
         SEQUENCE
      ===================== */

      chat.lastSeq = (chat.lastSeq || 0) + 1;

      chat.readState = chat.readState || [];

      const senderState = chat.readState.find(
        r => String(r.user) === String(userId)
      );

      if (senderState) {
        senderState.lastReadSeq = chat.lastSeq;
        senderState.lastReadAt = new Date();
      } else {
        chat.readState.push({
          user: userId,
          lastReadSeq: chat.lastSeq,
          lastReadAt: new Date()
        });
      }

      /* =====================
         CREATE MESSAGE
      ===================== */

      const createdMessage = await Message.create({
        chatId: chat._id,
        sender: userId,
        ciphertext: payload.ciphertext,
        iv: payload.iv || null,
        tag: payload.tag || null,
        algorithm: payload.algorithm || "aes-256-gcm",
        keyVersion: payload.keyVersion || "v1",
        type: payload.type || "text",
        replyTo: payload.replyTo || null,
        seq: chat.lastSeq
      });

      chat.lastMessageId = createdMessage._id;
      chat.lastMessageAt = createdMessage.createdAt;
      chat.lastMessageType = createdMessage.type;
      chat.updatedAt = new Date();

      await chat.save();

      /* =====================
         LOAD MESSAGE
      ===================== */

      const message = await Message.findById(createdMessage._id)
        .populate("sender", "profile.fullName profile.avatar")
        .populate({
          path: "replyTo",
          select: "ciphertext iv tag sender",
          populate: {
            path: "sender",
            select: "profile.fullName profile.avatar"
          }
        })
        .populate("reactions.user", "profile.fullName profile.avatar")
        .lean();

      if (!message) {
        return cb?.({ success: false });
      }

      /* =====================
         DECRYPT MESSAGE
      ===================== */

      try {

        const chatKey = decryptChatKey(
          chat.encryptedChatKey,
          chat.chatKeyIv,
          chat.chatKeyTag
        );

        if (message.ciphertext && message.iv && message.tag) {
          message.ciphertext = decryptWithKey(
            message.ciphertext,
            message.iv,
            message.tag,
            chatKey
          );
        }

        if (
          message.replyTo &&
          message.replyTo.ciphertext &&
          message.replyTo.iv &&
          message.replyTo.tag
        ) {
          message.replyTo.ciphertext = decryptWithKey(
            message.replyTo.ciphertext,
            message.replyTo.iv,
            message.replyTo.tag,
            chatKey
          );
        }

      } catch (err) {
        console.error("DM decrypt failed", err);
        message.ciphertext = "";
      }

      /* =====================
         PUSH (DM ONLY)
      ===================== */

      if (chat.type === "dm") {

        const senderName =
          socket.user?.profile?.fullName ||
          "Someone";

        const senderAvatar =
          socket.user?.profile?.avatar?.url ||
          null;

        const preview =
          payload.type === "text"
            ? "New message"
            : "New message";

        const recipientsIds = chat.participants
          .map(normalizeId)
          .filter(Boolean)
          .filter(uid => String(uid) !== String(userId))
          .filter(uid => !isOnline(uid));

        if (recipientsIds.length) {

          const recipients = await User.find({
            _id: { $in: recipientsIds }
          }).select("pushTokens");

          await Promise.all(
            recipients.map((recipient) =>
              sendExpoPushToUser(recipient, {
                title: senderName,
                body: preview,
                data: {
                  type: "community",
                  chatId: String(cid),
                  fullName: senderName,
                  avatar: senderAvatar
                }
              })
            )
          );
        }
      }

      /* =====================
         REALTIME EMIT
      ===================== */

      io.to(`chat:${cid}`).emit("message:new", {
        chatId: cid,
        message,
        lastSeq: chat.lastSeq
      });

      cb?.({ success: true, message });

    } catch (e) {
      console.error("message:send error", e);
      cb?.({ success: false });
    }
  });

  /* =====================================================
     MESSAGE REACTION (PERSISTED) WITH BLOCK CHECK
  ===================================================== */
  socket.on("message:reaction", async ({ chatId, messageId, emoji }) => {
    try {

      const cid = normalizeId(chatId);
      const mid = normalizeId(messageId);

      if (!isValidId(cid) || !isValidId(mid)) return;

      const chat = await Chat.findOne({
        _id: cid,
        participants: userId,
        isRemoved: false
      }).select("encryptedChatKey chatKeyIv chatKeyTag blockedUsers");

      if (!chat) return;

      if (chat.blockedUsers?.map(String).includes(String(userId))) return;

      const msg = await Message.findOne({
        _id: mid,
        chatId: cid
      });

      if (!msg) return;

      /* =====================
         UPDATE REACTIONS
      ===================== */

      let reactions = msg.reactions || [];

      reactions = reactions.filter(
        r => String(r.user) !== String(userId)
      );

      if (emoji) {
        reactions.push({
          user: userId,
          emoji,
          createdAt: new Date()
        });
      }

      msg.reactions = reactions;
      await msg.save();

      /* =====================
         LOAD FULL MESSAGE
      ===================== */

      const populatedMsg = await Message.findById(mid)
        .populate("sender", "profile.fullName profile.avatar")
        .populate({
          path: "replyTo",
          select: "ciphertext iv tag sender",
          populate: {
            path: "sender",
            select: "profile.fullName profile.avatar"
          }
        })
        .populate("reactions.user", "profile.fullName profile.avatar")
        .lean();

      if (!populatedMsg) return;

      /* =====================
         DECRYPT MESSAGE
      ===================== */

      try {

        const chatKey = decryptChatKey(
          chat.encryptedChatKey,
          chat.chatKeyIv,
          chat.chatKeyTag
        );

        if (
          populatedMsg.ciphertext &&
          populatedMsg.iv &&
          populatedMsg.tag
        ) {
          populatedMsg.ciphertext = decryptWithKey(
            populatedMsg.ciphertext,
            populatedMsg.iv,
            populatedMsg.tag,
            chatKey
          );
        }

        if (
          populatedMsg.replyTo &&
          populatedMsg.replyTo.ciphertext &&
          populatedMsg.replyTo.iv &&
          populatedMsg.replyTo.tag
        ) {
          populatedMsg.replyTo.ciphertext = decryptWithKey(
            populatedMsg.replyTo.ciphertext,
            populatedMsg.replyTo.iv,
            populatedMsg.replyTo.tag,
            chatKey
          );
        }

      } catch (err) {
        console.error("Reaction decrypt failed", err);
        populatedMsg.ciphertext = "";
      }

      /* =====================
         REALTIME UPDATE
      ===================== */

      io.to(`chat:${cid}`).emit("message:reaction:update", {
        chatId: cid,
        message: populatedMsg
      });

    } catch (err) {
      console.error("message:reaction error", err);
    }
  });

  /* =====================================================
     MESSAGE READ RECEIPT (PERSISTED)
  ===================================================== */
  socket.on("message:read", async ({ chatId, messageId }) => {

    try {

      const cid = normalizeId(chatId);
      const mid = normalizeId(messageId);

      if (!isValidId(cid) || !isValidId(mid)) return;

      const msg = await Message.findOne({
        _id: mid,
        chatId: cid
      });

      if (!msg) return;

      const already = msg.readBy.some(
        r => String(r.user) === String(userId)
      );

      if (!already) {
        msg.readBy.push({
          user: userId,
          readAt: new Date()
        });

        await msg.save();
      }

      io.to(`chat:${cid}`).emit("message:read:update", {
        chatId: cid,
        messageId: mid,
        userId
      });

    } catch (e) {
      console.error(e);
    }

  });

  /* =====================================================
   PIN / UNPIN MESSAGE (PERSISTED + REALTIME)
===================================================== */
  socket.on("message:pin", async ({ chatId, messageId }) => {
    try {
      const cid = normalizeId(chatId);
      const mid = normalizeId(messageId);

      if (!isValidId(cid)) return;

      const chat = await Chat.findOne({
        _id: cid,
        participants: userId,
        isRemoved: false,
      });

      if (!chat) return;

      // 🔁 TOGGLE PIN
      const newPinned =
        chat.pinnedMessage && String(chat.pinnedMessage) === String(mid)
          ? null
          : mid;

      await Chat.updateOne(
        { _id: cid },
        { $set: { pinnedMessage: newPinned } },
        { runValidators: false }
      );
      // 🔥 REALTIME UPDATE
      io.to(`chat:${cid}`).emit("message:pin:update", {
        chatId: cid,
        pinnedMessage: newPinned,
      });
    } catch (err) {
      console.error("[PIN MESSAGE ERROR]", err);
    }
  });

  /* =====================================================
     MESSAGE DELETE
  ===================================================== */
  // DELETE FOR ME
  socket.on("message:delete:me", async ({ chatId, messageId }) => {

    try {

      const cid = normalizeId(chatId);
      const mid = normalizeId(messageId);

      if (!isValidId(cid) || !isValidId(mid)) return;

      const msg = await Message.findOne({
        _id: mid,
        chatId: cid
      });

      if (!msg) return;

      /* ======================
         ADD USER TO deletedFor
      ====================== */

      if (!msg.deletedFor.map(String).includes(String(userId))) {
        msg.deletedFor.push(userId);
        await msg.save();
      }

      /* ======================
         REALTIME UPDATE
      ====================== */

      io.to(`user:${userId}`).emit("message:delete:me:update", {
        chatId: cid,
        messageId: mid,
        userId
      });

    } catch (e) {
      console.error("message:delete:me error", e);
    }

  });

  // DELETE FOR EVERYONE (FIXED & GUARANTEED PERSISTENCE)
  socket.on("message:delete:everyone", async ({ chatId, messageId }, cb) => {

    try {

      const cid = normalizeId(chatId);
      const mid = normalizeId(messageId);

      if (!isValidId(cid) || !isValidId(mid)) {
        return cb?.({ success: false });
      }

      const msg = await Message.findOne({
        _id: mid,
        chatId: cid
      });

      if (!msg) {
        return cb?.({ success: false });
      }

      /* ======================
         PERMISSION CHECK
      ====================== */

      if (String(msg.sender) !== String(userId)) {
        return cb?.({ success: false });
      }

      /* ======================
         ONLY TOGGLE FLAG
      ====================== */

      if (!msg.isDeletedForEveryone) {
        msg.isDeletedForEveryone = true;
        await msg.save();
      }

      /* ======================
         REALTIME UPDATE
      ====================== */

      io.to(`chat:${cid}`).emit("message:delete:everyone:update", {
        chatId: cid,
        messageId: mid
      });

      cb?.({ success: true });

    } catch (e) {
      console.error("message:delete:everyone error", e);
      cb?.({ success: false });
    }

  });

  /* =====================================================
     MESSAGE EDIT (PERSISTED)
  ===================================================== */
  socket.on("message:edit", async ({ chatId, messageId, ciphertext }) => {

    try {

      const cid = normalizeId(chatId);
      const mid = normalizeId(messageId);

      if (!isValidId(cid) || !isValidId(mid)) return;

      const msg = await Message.findOne({
        _id: mid,
        chatId: cid
      });

      if (!msg) return;

      if (String(msg.sender) !== String(userId)) return;

      msg.ciphertext = ciphertext;
      msg.editedAt = new Date();

      await msg.save();

      io.to(`chat:${cid}`).emit("message:edited", {
        chatId: cid,
        messageId: mid,
        ciphertext
      });

    } catch (e) {
      console.error(e);
    }

  });

  /* =====================================================
     MESSAGE READ (BATCH)
  ===================================================== */
  socket.on("message:read:batch", async ({ chatId, messageIds }) => {
    try {

      const cid = normalizeId(chatId);

      if (!isValidId(cid) || !Array.isArray(messageIds) || messageIds.length === 0) return;

      await Message.updateMany(
        {
          _id: { $in: messageIds },
          chatId: cid,
          "readBy.user": { $ne: userId }
        },
        {
          $push: {
            readBy: {
              user: userId,
              readAt: new Date()
            }
          }
        }
      );

      io.to(`chat:${cid}`).emit("message:read:batch", {
        chatId: cid,
        messageIds,
        userId
      });

    } catch (err) {
      console.error("❌ message:read:batch error", err);
    }
  });

  /* =====================================================
   CHAT READ MARKER (FOR UNREAD SYSTEM)
===================================================== */
  socket.on("chat:read", async ({ chatId, seq }, cb) => {
    try {
      const cid = normalizeId(chatId);
      if (!isValidId(cid)) return;

      const chat = await Chat.findOne({
        _id: cid,
        participants: userId,
        isRemoved: false,
      }).select("lastSeq readState");

      if (!chat) return;

      // ⭐ FIX
      if (!Array.isArray(chat.readState)) {
        chat.readState = [];
      }

      const safeSeq = Math.min(Number(seq || 0), chat.lastSeq || 0);

      const existing = chat.readState.find(
        r => String(r.user) === String(userId)
      );

      if (existing) {
        existing.lastReadSeq = Math.max(existing.lastReadSeq || 0, safeSeq);
        existing.lastReadAt = new Date();
      } else {
        chat.readState.push({
          user: userId,
          lastReadSeq: safeSeq,
          lastReadAt: new Date(),
        });
      }

      await chat.save();

      io.to(`chat:${cid}`).emit("chat:read:update", {
        chatId: cid,
        userId,
        lastReadSeq: safeSeq
      });

      cb?.({ success: true });

    } catch (err) {
      console.error("chat:read error", err);
      cb?.({ success: false });
    }
  });

  /* =====================================================
     BLOCK USER (FIXED + PERSISTENT + CONSISTENT)
  ===================================================== */
  socket.on("user:block", async ({ chatId, userToBlock }, cb) => {
    try {
      const cid = normalizeId(chatId);
      const uid = normalizeId(userToBlock);

      if (!isValidId(cid) || !isValidId(uid)) {
        return cb?.({ success: false, message: "Invalid ids" });
      }

      const chat = await Chat.findOne({
        _id: cid,
        participants: userId,
        type: "dm",
      });

      if (!chat) {
        return cb?.({ success: false, message: "Chat not found" });
      }

      await Chat.updateOne(
        { _id: cid },
        { $addToSet: { blockedUsers: uid } }
      );

      // 🔥 RE-FETCH updated blockedUsers
      const updatedChat = await Chat.findById(cid).select("blockedUsers");

      io.to(`chat:${cid}`).emit("chat:user:blocked", {
        chatId: cid,
        blockedUsers: updatedChat.blockedUsers || [],
      });

      cb?.({ success: true });
    } catch (err) {
      console.error("Block error", err);
      cb?.({ success: false, message: err.message });
    }
  });

  /* =====================================================
     UNBLOCK USER (FIXED + PERSISTENT + CONSISTENT)
  ===================================================== */
  socket.on("user:unblock", async ({ chatId, userToUnblock }, cb) => {
    try {
      const cid = normalizeId(chatId);
      const uid = normalizeId(userToUnblock);

      if (!isValidId(cid) || !isValidId(uid)) {
        return cb?.({ success: false, message: "Invalid ids" });
      }

      await Chat.updateOne(
        { _id: cid },
        { $pull: { blockedUsers: uid } }
      );

      // 🔥 RE-FETCH updated blockedUsers
      const updatedChat = await Chat.findById(cid).select("blockedUsers");

      io.to(`chat:${cid}`).emit("chat:user:blocked", {
        chatId: cid,
        blockedUsers: updatedChat.blockedUsers || [],
      });

      cb?.({ success: true });
    } catch (err) {
      console.error("Unblock error", err);
      cb?.({ success: false, message: err.message });
    }
  });

};