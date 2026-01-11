// backend/socket/chat.js
const mongoose = require('mongoose');
const Chat = require('../models/Chat');

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
     TYPING INDICATORS
  ===================================================== */
  socket.on('typing:start', ({ chatId }) => {
    const cid = normalizeId(chatId);
    if (!isValidId(cid)) return;

    socket.to(`chat:${cid}`).emit('typing:start', {
      chatId: cid,
      userId,
    });
  });

  socket.on('typing:stop', ({ chatId }) => {
    const cid = normalizeId(chatId);
    if (!isValidId(cid)) return;

    socket.to(`chat:${cid}`).emit('typing:stop', {
      chatId: cid,
      userId,
    });
  });

  /* =====================================================
     SEND MESSAGE (TEXT / REPLY)
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

      const message = {
        _id: new mongoose.Types.ObjectId(),
        sender: new mongoose.Types.ObjectId(userId),
        ciphertext: payload.ciphertext,
        type: payload.type || 'text',
        replyTo: payload.replyTo || null,
        reactions: [],
        readBy: [],
        createdAt: new Date(),
      };

      chat.messages.push(message);
      await chat.save();

      io.to(`chat:${cid}`).emit('message:new', {
        chatId: cid,
        message,
      });

      cb?.({ success: true, message });
    } catch (e) {
      console.error('message:send error', e);
      cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
     MESSAGE REACTION (PERSISTED)
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
      }).populate(
        "messages.reactions.user",
        "profile.fullName profile.avatar"
      );

      if (!chat) return;

      const msg = chat.messages.id(mid);
      if (!msg) return;

      // ✅ ALWAYS REMOVE USER'S EXISTING REACTION FIRST
      msg.reactions = msg.reactions.filter(
        (r) => String(r.user?._id || r.user) !== String(userId)
      );

      // ✅ ONLY ADD IF EMOJI EXISTS
      if (emoji) {
        msg.reactions.push({
          user: userId,
          emoji,
          createdAt: new Date(),
        });
      }

      await chat.save();

      const populatedChat = await Chat.findOne(
        { _id: cid, "messages._id": mid },
        { "messages.$": 1 }
      ).populate("messages.reactions.user", "profile.fullName profile.avatar");

      const populatedMsg = populatedChat.messages[0];

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
  socket.on('message:read', async ({ chatId, messageId }) => {
    try {
      const cid = normalizeId(chatId);
      const mid = normalizeId(messageId);
      if (!isValidId(cid) || !isValidId(mid)) return;

      const chat = await Chat.findById(cid);
      if (!chat) return;

      const msg = chat.messages.id(mid);
      if (!msg) return;

      msg.readBy = msg.readBy || [];
      if (!msg.readBy.includes(String(userId))) {
        msg.readBy.push(String(userId));
        await chat.save();
      }

      socket.to(`chat:${cid}`).emit('message:read', {
        chatId: cid,
        messageId: mid,
        userId,
      });
    } catch (e) {
      console.error('message:read error', e);
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
      if (chat.pinnedMessage && String(chat.pinnedMessage) === String(mid)) {
        chat.pinnedMessage = null; // UNPIN
      } else {
        chat.pinnedMessage = mid; // PIN (only one allowed)
      }

      await chat.save();

      // 🔥 REALTIME UPDATE
      io.to(`chat:${cid}`).emit("message:pin:update", {
        chatId: cid,
        pinnedMessage: chat.pinnedMessage,
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
        await chat.save();
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

      await chat.save();

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
    socket.to(`chat:${chatId}`).emit("message:read:batch", {
      chatId,
      messageIds,
      userId,
    });
  } catch (err) {
    console.error("❌ message:read:batch error", err);
  }
});


};

