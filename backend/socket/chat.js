// backend/socket/chat.js
const mongoose = require('mongoose');
const Chat = require('../models/Chat');

/* =====================================================
   HELPERS (CRITICAL)
===================================================== */

const normalizeId = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v._id || v.id || null;
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
        sender: userId,
        ciphertext: payload.ciphertext,
        type: payload.type || 'text',
        replyTo: payload.replyTo || null,
        reactions: {},
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
  socket.on('message:reaction', async ({ chatId, messageId, emoji }) => {
    try {
      const cid = normalizeId(chatId);
      const mid = normalizeId(messageId);
      if (!isValidId(cid) || !isValidId(mid) || !emoji) return;

      const chat = await Chat.findOne({ _id: cid, 'messages._id': mid });
      if (!chat) return;

      const msg = chat.messages.id(mid);
      if (!msg) return;

      msg.reactions = msg.reactions || {};
      const users = new Set((msg.reactions[emoji] || []).map(String));

      if (users.has(String(userId))) users.delete(String(userId));
      else users.add(String(userId));

      if (users.size === 0) delete msg.reactions[emoji];
      else msg.reactions[emoji] = Array.from(users);

      await chat.save();

      io.to(`chat:${cid}`).emit('message:reaction', {
        chatId: cid,
        messageId: mid,
        reactions: msg.reactions,
      });
    } catch (e) {
      console.error('message:reaction error', e);
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
     MESSAGE DELETE FOR EVERYONE (PERSISTED)
  ===================================================== */
  socket.on('message:delete', async ({ chatId, messageId }) => {
    try {
      const cid = normalizeId(chatId);
      const mid = normalizeId(messageId);
      if (!isValidId(cid) || !isValidId(mid)) return;

      const chat = await Chat.findOne({ _id: cid, 'messages._id': mid });
      if (!chat) return;

      const msg = chat.messages.id(mid);
      if (!msg) return;

      if (String(msg.sender) !== String(userId)) return;

      msg.isDeleted = true;
      msg.ciphertext = '';
      msg.deletedAt = new Date();

      await chat.save();

      io.to(`chat:${cid}`).emit('message:deleted', {
        chatId: cid,
        messageId: mid,
      });
    } catch (e) {
      console.error('message:delete error', e);
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
};
