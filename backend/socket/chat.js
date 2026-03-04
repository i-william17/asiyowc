// backend/socket/chat.js
const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const User = require("../models/User");
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
        messages: [],
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
  socket.on('message:send', async ({ chatId, payload }, cb) => {
    try {
      const cid = normalizeId(chatId);
      if (!isValidId(cid) || !payload?.ciphertext) return;

      const chat = await Chat.findOne({
        _id: cid,
        participants: userId,
        isRemoved: false,
      });

      if (!chat) return;

      // 🔥 BLOCK CHECK - Prevent blocked users from sending messages
      if (chat.blockedUsers?.map(String).includes(String(userId))) {
        return cb?.({ success: false, message: "You are blocked from sending messages in this chat" });
      }

      /* =====================
         SEQUENCE + MESSAGE
      ===================== */

      chat.lastSeq = (chat.lastSeq || 0) + 1;

      const message = {
        _id: new mongoose.Types.ObjectId(),
        sender: new mongoose.Types.ObjectId(userId),
        ciphertext: payload.ciphertext,
        type: payload.type || 'text',
        replyTo: payload.replyTo || null,
        reactions: [],
        readBy: [],
        seq: chat.lastSeq,
        createdAt: new Date(),
      };

      chat.messages.push(message);
      await chat.save();

      /* ================= DM PUSH NOTIFICATION (OPTIMIZED + AVATAR) ================= */

      if (chat.type === "dm") {

        const senderName =
          socket.user?.profile?.fullName ||
          socket.user?.fullName ||
          "Someone";

        const senderAvatar =
          socket.user?.profile?.avatar?.url ||
          socket.user?.avatar ||
          null;

        const preview =
          payload.type === "text"
            ? (payload.ciphertext || "").substring(0, 60)
            : "New message";

        /* ======================================
           Build recipient list
        ====================================== */

        const recipientsIds = chat.participants
          .map(normalizeId)
          .filter(Boolean)
          .filter(uid => String(uid) !== String(userId)) // skip sender
          .filter(uid => !isOnline(uid)); // skip online users

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

                  // 🔥 banner metadata
                  fullName: senderName,
                  avatar: senderAvatar,
                },
              })
            )
          );

        }
      }

      io.to(`chat:${cid}`).emit('message:new', {
        chatId: cid,
        message,
        lastSeq: chat.lastSeq,
      });

      cb?.({ success: true, message });
    } catch (e) {
      console.error('message:send error', e);
      cb?.({ success: false, message: e.message });
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
        type: "dm",
        participants: userId,
        "messages._id": mid,
        isRemoved: false,
      });

      if (!chat) return;

      // 🔥 BLOCK CHECK - Prevent blocked users from adding reactions
      if (chat.blockedUsers?.map(String).includes(String(userId))) return;

      const msg = chat.messages.id(mid);
      if (!msg) return;

      let reactions = msg.reactions || [];

      // 🔁 Remove previous reaction from this user
      reactions = reactions.filter(
        (r) => String(r.user) !== String(userId)
      );

      // ➕ Add new reaction if emoji exists
      if (emoji) {
        reactions.push({
          user: userId,
          emoji,
          createdAt: new Date(),
        });
      }

      // 🔥 IMPORTANT: Update ONLY the reactions field
      await Chat.updateOne(
        {
          _id: cid,
          "messages._id": mid,
        },
        {
          $set: {
            "messages.$.reactions": reactions,
          },
        },
        { runValidators: false } // prevents ciphertext validation failure
      );

      // Re-fetch updated message (populated)
      const populatedChat = await Chat.findOne(
        { _id: cid, "messages._id": mid },
        { "messages.$": 1 }
      ).populate(
        "messages.reactions.user",
        "profile.fullName profile.avatar"
      );

      const populatedMsg = populatedChat?.messages?.[0];
      if (!populatedMsg) return;

      io.to(`chat:${cid}`).emit("message:reaction:update", {
        chatId: cid,
        message: populatedMsg.toObject(),
      });

    } catch (err) {
      console.error("[DM reaction socket] ❌", err);
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

      await Chat.updateOne(
        {
          _id: cid,
          "messages._id": mid,
          "messages.readBy.user": { $ne: userId }, // 🔥 KEY
        },
        {
          $push: {
            "messages.$.readBy": {
              user: userId,
              readAt: new Date(),
            },
          },
        }
      );

      io.to(String(cid)).emit("message:read:update", {
        chatId: cid,
        messageId: mid,
        userId,
      });

    } catch (err) {
      console.error("Read receipt error:", err);
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

      const chat = await Chat.findOne({
        _id: cid,
        participants: userId,
        "messages._id": mid,
      });

      if (!chat) return;

      const msg = chat.messages.id(mid);

      console.log("msg", msg);

      if (!msg) return;

      msg.deletedFor = msg.deletedFor || [];

      if (!msg.deletedFor.includes(String(userId))) {
        msg.deletedFor.push(userId);

        await Chat.updateOne(
          { _id: cid, "messages._id": mid },
          {
            $addToSet: {
              "messages.$.deletedFor": userId
            }
          },
          { runValidators: false }
        );

      }

      // 🔁 ONLY ACK TO USER (no broadcast)
      socket.emit("message:delete:me:update", {
        chatId: cid,
        messageId: mid,
        userId,
      });
    } catch (e) {
      console.error("delete for me error", e);
    }
  });

  // DELETE FOR EVERYONE (FIXED & GUARANTEED PERSISTENCE)
  socket.on("message:delete:everyone", async ({ chatId, messageId }, cb) => {
    try {
      const cid = normalizeId(chatId);
      const mid = normalizeId(messageId);

      if (!isValidId(cid) || !isValidId(mid)) {
        return cb?.({ success: false, message: "Invalid ids" });
      }

      // 1️⃣ Ensure user is participant AND message exists
      const chat = await Chat.findOne(
        { _id: cid, participants: userId, "messages._id": mid },
        { "messages.$": 1 }
      );

      if (!chat || !chat.messages?.length) {
        return cb?.({ success: false, message: "Message not found" });
      }

      // 2️⃣ Atomic update (NO ciphertext touched)
      const res = await Chat.updateOne(
        { _id: cid, "messages._id": mid },
        {
          $set: {
            "messages.$.isDeletedForEveryone": true,
            "messages.$.deletedAt": new Date(),
          },
        },
        { runValidators: false }
      );

      if (!res.modifiedCount) {
        return cb?.({ success: false, message: "Update failed" });
      }

      // 3️⃣ Broadcast
      io.to(`chat:${cid}`).emit("message:delete:everyone:update", {
        chatId: cid,
        messageId: mid,
      });

      cb?.({ success: true });
    } catch (err) {
      console.error("❌ delete for everyone error", err);
      cb?.({ success: false, message: err.message });
    }
  });

  /* =====================================================
     MESSAGE EDIT (PERSISTED)
  ===================================================== */
  socket.on('message:edit', async ({ chatId, messageId, ciphertext }) => {
    try {
      const cid = normalizeId(chatId);
      const mid = normalizeId(messageId);
      if (!isValidId(cid) || !isValidId(mid) || !ciphertext) return;

      const chat = await Chat.findOne({ _id: cid, 'messages._id': mid });
      if (!chat) return;

      const msg = chat.messages.id(mid);
      if (!msg) return;
      if (String(msg.sender) !== String(userId)) return;

      msg.ciphertext = ciphertext;
      msg.editedAt = new Date();

      await Chat.updateOne(
        { _id: cid, "messages._id": mid },
        {
          $set: {
            "messages.$.ciphertext": ciphertext,
            "messages.$.editedAt": new Date(),
          }
        },
        { runValidators: false }
      );

      io.to(`chat:${cid}`).emit('message:edited', {
        chatId: cid,
        messageId: mid,
        ciphertext,
      });
    } catch (e) {
      console.error('message:edit error', e);
    }
  });

  /* =====================================================
     MESSAGE READ (BATCH)
  ===================================================== */
  socket.on("message:read:batch", async ({ chatId, messageIds }) => {
    try {
      if (!chatId || !Array.isArray(messageIds) || messageIds.length === 0) return;

      const userId = socket.user?.id;
      if (!userId) return;

      await Chat.updateOne(
        { _id: chatId },
        {
          $addToSet: {
            "messages.$[msg].readBy": {
              user: userId,
              readAt: new Date(),
            },
          },
        },
        {
          arrayFilters: [{ "msg._id": { $in: messageIds } }],
          runValidators: false, // ✅ prevents ciphertext failures
        }
      );

      // 🔁 realtime update
      io.to(`chat:${chatId}`).emit("message:read:batch", {
        chatId,
        messageIds,
        userId,
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

      socket.emit("chat:read:update", {
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