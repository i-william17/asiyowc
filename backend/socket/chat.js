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

const normalizeIds = (arr = []) =>
  arr.map(normalizeId).filter((v) => mongoose.Types.ObjectId.isValid(v));

/* =====================================================
   SOCKET CHAT HANDLERS
===================================================== */

module.exports = (io, socket) => {
  const userId = normalizeId(socket.user?.id);

  /* ===================== JOIN ALL CHATS ===================== */
  socket.on('chat:joinAll', async (_, cb) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return typeof cb === 'function' &&
          cb({ success: false, message: 'Invalid user id' });
      }

      const chats = await Chat.find({
        participants: userId,
        isRemoved: false
      }).select('_id');

      chats.forEach((c) => socket.join(`chat:${c._id.toString()}`));

      if (typeof cb === 'function') {
        cb({ success: true, joined: chats.length });
      }
    } catch (e) {
      console.error('chat:joinAll error', e);
      if (typeof cb === 'function') {
        cb({ success: false, message: e.message });
      }
    }
  });

  /* ===================== JOIN ONE CHAT ===================== */
  socket.on('chat:join', async ({ chatId }, cb) => {
    try {
      const cleanChatId = normalizeId(chatId);

      if (!mongoose.Types.ObjectId.isValid(cleanChatId)) {
        return typeof cb === 'function' &&
          cb({ success: false, message: 'Invalid chatId' });
      }

      const chat = await Chat.findOne({
        _id: cleanChatId,
        participants: userId,
        isRemoved: false
      }).select('_id');

      if (!chat) {
        return typeof cb === 'function' &&
          cb({ success: false, message: 'Chat not found or access denied' });
      }

      socket.join(`chat:${cleanChatId}`);
      if (typeof cb === 'function') cb({ success: true });
    } catch (e) {
      console.error('chat:join error', e);
      if (typeof cb === 'function') cb({ success: false, message: e.message });
    }
  });

  /* ===================== CREATE CHAT ===================== */
  socket.on('chat:create', async ({ type = 'dm', participants = [] }, cb) => {
    try {
      if (!Array.isArray(participants)) {
        return cb?.({ success: false, message: 'Invalid participants format' });
      }

      const cleanParticipants = [
        userId,
        ...participants.map(normalizeId)
      ]
        .filter((v) => mongoose.Types.ObjectId.isValid(v))
        .map(String);

      const uniqueParticipants = [...new Set(cleanParticipants)];

      if (uniqueParticipants.length < 2) {
        return cb?.({ success: false, message: 'At least 2 participants required' });
      }

      const chat = await Chat.create({
        type,
        participants: uniqueParticipants
      });

      uniqueParticipants.forEach((uid) => {
        io.to(uid).emit('chat:created', chat);
      });

      socket.join(`chat:${chat._id}`);
      cb?.({ success: true, chat });
    } catch (e) {
      console.error('❌ chat:create failed:', e);
      cb?.({ success: false, message: e.message });
    }
  });

  /* ===================== TYPING INDICATORS ===================== */
  socket.on('typing:start', ({ chatId }) => {
    const cleanChatId = normalizeId(chatId);
    if (!cleanChatId) return;

    socket.to(`chat:${cleanChatId}`).emit('typing:start', {
      chatId: cleanChatId,
      userId
    });
  });

  socket.on('typing:stop', ({ chatId }) => {
    const cleanChatId = normalizeId(chatId);
    if (!cleanChatId) return;

    socket.to(`chat:${cleanChatId}`).emit('typing:stop', {
      chatId: cleanChatId,
      userId
    });
  });

  /* ===================== MESSAGE BROADCAST ===================== */
  socket.on('message:broadcast', ({ chatId, message }) => {
    const cleanChatId = normalizeId(chatId);
    if (!cleanChatId || !message) return;

    io.to(`chat:${cleanChatId}`).emit('message:new', {
      chatId: cleanChatId,
      message
    });
  });

  /* ===================== MESSAGE REPLY ===================== */
  socket.on('message:reply', ({ chatId, message }) => {
    const cleanChatId = normalizeId(chatId);
    if (!cleanChatId || !message) return;

    io.to(`chat:${cleanChatId}`).emit('message:new', {
      chatId: cleanChatId,
      message
    });
  });

  /* ===================== READ RECEIPTS ===================== */
  socket.on('message:read', ({ chatId, messageId }) => {
    const cleanChatId = normalizeId(chatId);
    const cleanMessageId = normalizeId(messageId);
    if (!cleanChatId || !cleanMessageId) return;

    socket.to(`chat:${cleanChatId}`).emit('message:read', {
      chatId: cleanChatId,
      messageId: cleanMessageId,
      userId
    });
  });

  /* ===================== DELIVERY ACK ===================== */
  socket.on('message:delivered', ({ chatId, messageId }) => {
    const cleanChatId = normalizeId(chatId);
    const cleanMessageId = normalizeId(messageId);
    if (!cleanChatId || !cleanMessageId) return;

    socket.to(`chat:${cleanChatId}`).emit('message:delivered', {
      chatId: cleanChatId,
      messageId: cleanMessageId,
      userId
    });
  });

  /* ===================== MESSAGE REACTIONS ===================== */
  socket.on('message:reaction', ({ chatId, messageId, emoji }) => {
    const cleanChatId = normalizeId(chatId);
    const cleanMessageId = normalizeId(messageId);
    if (!cleanChatId || !cleanMessageId || !emoji) return;

    io.to(`chat:${cleanChatId}`).emit('message:reaction', {
      chatId: cleanChatId,
      messageId: cleanMessageId,
      emoji,
      userId
    });
  });

  /* ===================== MESSAGE PIN ===================== */
  socket.on('message:pin', ({ chatId, messageId }) => {
    const cleanChatId = normalizeId(chatId);
    const cleanMessageId = normalizeId(messageId);
    if (!cleanChatId || !cleanMessageId) return;

    io.to(`chat:${cleanChatId}`).emit('message:pinned', {
      chatId: cleanChatId,
      messageId: cleanMessageId,
      userId
    });
  });

  socket.on('message:unpin', ({ chatId, messageId }) => {
    const cleanChatId = normalizeId(chatId);
    const cleanMessageId = normalizeId(messageId);
    if (!cleanChatId || !cleanMessageId) return;

    io.to(`chat:${cleanChatId}`).emit('message:unpinned', {
      chatId: cleanChatId,
      messageId: cleanMessageId,
      userId
    });
  });

  /* ===================== MESSAGE EDIT ===================== */
  socket.on('message:edited', ({ chatId, messageId, message }) => {
    const cleanChatId = normalizeId(chatId);
    const cleanMessageId = normalizeId(messageId);
    if (!cleanChatId || !cleanMessageId) return;

    io.to(`chat:${cleanChatId}`).emit('message:edited', {
      chatId: cleanChatId,
      messageId: cleanMessageId,
      message
    });
  });

  /* ===================== MESSAGE DELETE ===================== */
  socket.on('message:deleted', ({ chatId, messageId }) => {
    const cleanChatId = normalizeId(chatId);
    const cleanMessageId = normalizeId(messageId);
    if (!cleanChatId || !cleanMessageId) return;

    io.to(`chat:${cleanChatId}`).emit('message:deleted', {
      chatId: cleanChatId,
      messageId: cleanMessageId
    });
  });
};
