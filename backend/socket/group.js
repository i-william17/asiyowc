const mongoose = require('mongoose');
const Group = require('../models/Group');

/* =====================================================
   HELPERS
===================================================== */

const normalizeId = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v._id || v.id || null;
  return null;
};

const isValidObjectId = (v) => mongoose.Types.ObjectId.isValid(v);

/* =====================================================
   GROUP SOCKET HANDLERS
===================================================== */

module.exports = (io, socket) => {
  const userId = normalizeId(socket.user?.id);

  /* ===================== JOIN GROUP ROOM ===================== */
  socket.on('group:join', async ({ groupId }, cb) => {
    try {
      const cleanGroupId = normalizeId(groupId);

      if (!isValidObjectId(cleanGroupId)) {
        return typeof cb === 'function' &&
          cb({ success: false, message: 'Invalid groupId' });
      }

      const group = await Group.findOne({
        _id: cleanGroupId,
        isRemoved: false,
        'members.user': userId
      }).select('_id');

      if (!group) {
        return typeof cb === 'function' &&
          cb({ success: false, message: 'Not a member / group not found' });
      }

      socket.join(`group:${cleanGroupId}`);
      if (typeof cb === 'function') cb({ success: true });
    } catch (e) {
      console.error('group:join error', e);
      if (typeof cb === 'function') cb({ success: false, message: e.message });
    }
  });

  /* ===================== LEAVE GROUP ROOM ===================== */
  socket.on('group:leave', ({ groupId }, cb) => {
    const cleanGroupId = normalizeId(groupId);

    if (!isValidObjectId(cleanGroupId)) {
      return typeof cb === 'function' &&
        cb({ success: false, message: 'Invalid groupId' });
    }

    socket.leave(`group:${cleanGroupId}`);
    if (typeof cb === 'function') cb({ success: true });
  });

  /* ===================== GROUP MESSAGE BROADCAST ===================== */
  // Fired AFTER REST persistence
  socket.on('group:message:broadcast', ({ groupId, message }) => {
    const cleanGroupId = normalizeId(groupId);
    if (!isValidObjectId(cleanGroupId) || !message) return;

    io.to(`group:${cleanGroupId}`).emit('group:message:new', {
      groupId: cleanGroupId,
      message
    });
  });

  /* ===================== TYPING INDICATORS ===================== */
  socket.on('group:typing:start', ({ groupId }) => {
    const cleanGroupId = normalizeId(groupId);
    if (!isValidObjectId(cleanGroupId)) return;

    socket.to(`group:${cleanGroupId}`).emit('group:typing:start', {
      groupId: cleanGroupId,
      userId
    });
  });

  socket.on('group:typing:stop', ({ groupId }) => {
    const cleanGroupId = normalizeId(groupId);
    if (!isValidObjectId(cleanGroupId)) return;

    socket.to(`group:${cleanGroupId}`).emit('group:typing:stop', {
      groupId: cleanGroupId,
      userId
    });
  });

  /* ===================== READ RECEIPTS ===================== */
  socket.on('group:message:read', ({ groupId, messageId }) => {
    const cleanGroupId = normalizeId(groupId);
    const cleanMessageId = normalizeId(messageId);

    if (!isValidObjectId(cleanGroupId) || !isValidObjectId(cleanMessageId)) return;

    socket.to(`group:${cleanGroupId}`).emit('group:message:read', {
      groupId: cleanGroupId,
      messageId: cleanMessageId,
      userId
    });
  });

  /* ===================== DELIVERY ACK ===================== */
  socket.on('group:message:delivered', ({ groupId, messageId }) => {
    const cleanGroupId = normalizeId(groupId);
    const cleanMessageId = normalizeId(messageId);

    if (!isValidObjectId(cleanGroupId) || !isValidObjectId(cleanMessageId)) return;

    socket.to(`group:${cleanGroupId}`).emit('group:message:delivered', {
      groupId: cleanGroupId,
      messageId: cleanMessageId,
      userId
    });
  });

  /* ===================== MESSAGE REACTIONS ===================== */
  socket.on('group:message:reaction', ({ groupId, messageId, emoji }) => {
    const cleanGroupId = normalizeId(groupId);
    const cleanMessageId = normalizeId(messageId);

    if (!isValidObjectId(cleanGroupId) || !isValidObjectId(cleanMessageId) || !emoji) return;

    io.to(`group:${cleanGroupId}`).emit('group:message:reaction', {
      groupId: cleanGroupId,
      messageId: cleanMessageId,
      emoji,
      userId
    });
  });

  /* ===================== PIN / UNPIN MESSAGE ===================== */
  socket.on('group:message:pin', ({ groupId, messageId }) => {
    const cleanGroupId = normalizeId(groupId);
    const cleanMessageId = normalizeId(messageId);

    if (!isValidObjectId(cleanGroupId) || !isValidObjectId(cleanMessageId)) return;

    io.to(`group:${cleanGroupId}`).emit('group:message:pinned', {
      groupId: cleanGroupId,
      messageId: cleanMessageId,
      userId
    });
  });

  socket.on('group:message:unpin', ({ groupId, messageId }) => {
    const cleanGroupId = normalizeId(groupId);
    const cleanMessageId = normalizeId(messageId);

    if (!isValidObjectId(cleanGroupId) || !isValidObjectId(cleanMessageId)) return;

    io.to(`group:${cleanGroupId}`).emit('group:message:unpinned', {
      groupId: cleanGroupId,
      messageId: cleanMessageId,
      userId
    });
  });

  /* ===================== MESSAGE EDIT ===================== */
  socket.on('group:message:edited', ({ groupId, messageId, message }) => {
    const cleanGroupId = normalizeId(groupId);
    const cleanMessageId = normalizeId(messageId);

    if (!isValidObjectId(cleanGroupId) || !isValidObjectId(cleanMessageId)) return;

    io.to(`group:${cleanGroupId}`).emit('group:message:edited', {
      groupId: cleanGroupId,
      messageId: cleanMessageId,
      message
    });
  });

  /* ===================== MESSAGE DELETE ===================== */
  socket.on('group:message:deleted', ({ groupId, messageId }) => {
    const cleanGroupId = normalizeId(groupId);
    const cleanMessageId = normalizeId(messageId);

    if (!isValidObjectId(cleanGroupId) || !isValidObjectId(cleanMessageId)) return;

    io.to(`group:${cleanGroupId}`).emit('group:message:deleted', {
      groupId: cleanGroupId,
      messageId: cleanMessageId
    });
  });
};
