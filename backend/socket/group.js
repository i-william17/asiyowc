// backend/socket/group.js
const mongoose = require('mongoose');
const Group = require('../models/Group');
const Chat = require('../models/Chat');

/* =====================================================
   HELPERS
===================================================== */

const normalizeId = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v._id || v.id || null;
  return null;
};

const isValidId = (v) => mongoose.Types.ObjectId.isValid(v);

/* =====================================================
   GROUP SOCKET HANDLERS
===================================================== */

module.exports = (io, socket) => {
  const userId = normalizeId(socket.user?.id);
  if (!isValidId(userId)) return;

  /* =====================================================
     JOIN GROUP ROOM
  ===================================================== */
  socket.on('group:join', async ({ groupId }, cb) => {
    try {
      const gid = normalizeId(groupId);
      if (!isValidId(gid)) {
        return cb?.({ success: false, message: 'Invalid groupId' });
      }

      const group = await Group.findOne({
        _id: gid,
        isRemoved: false,
        'members.user': userId,
      }).select('_id chat');

      if (!group) {
        return cb?.({ success: false, message: 'Not a member or group missing' });
      }

      socket.join(`group:${gid}`);

      if (group.chat) {
        socket.join(`chat:${String(group.chat)}`);
      }

      cb?.({ success: true, chatId: group.chat || null });
    } catch (e) {
      console.error('group:join error', e);
      cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
     LEAVE GROUP ROOM
  ===================================================== */
  socket.on('group:leave', ({ groupId }, cb) => {
    const gid = normalizeId(groupId);
    if (!isValidId(gid)) {
      return cb?.({ success: false, message: 'Invalid groupId' });
    }

    socket.leave(`group:${gid}`);
    cb?.({ success: true });
  });

  /* =====================================================
     SEND GROUP MESSAGE (TEXT / REPLY)
     ➜ STORED IN CHAT COLLECTION
  ===================================================== */
  socket.on('group:message:send', async ({ groupId, payload }, cb) => {
    try {
      const gid = normalizeId(groupId);
      if (!isValidId(gid) || !payload?.ciphertext) return;

      const group = await Group.findOne({
        _id: gid,
        'members.user': userId,
        isRemoved: false,
      }).select('chat');

      if (!group || !group.chat) return;

      const chat = await Chat.findById(group.chat);
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

      io.to(`chat:${String(group.chat)}`).emit('group:message:new', {
        groupId: gid,
        chatId: String(group.chat),
        message,
      });

      cb?.({ success: true, message });
    } catch (e) {
      console.error('group:message:send error', e);
      cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
     TYPING INDICATORS
  ===================================================== */
  socket.on('group:typing:start', ({ groupId }) => {
    const gid = normalizeId(groupId);
    if (!isValidId(gid)) return;

    socket.to(`group:${gid}`).emit('group:typing:start', {
      groupId: gid,
      userId,
    });
  });

  socket.on('group:typing:stop', ({ groupId }) => {
    const gid = normalizeId(groupId);
    if (!isValidId(gid)) return;

    socket.to(`group:${gid}`).emit('group:typing:stop', {
      groupId: gid,
      userId,
    });
  });

  /* =====================================================
     MESSAGE REACTION (PERSISTED)
  ===================================================== */
  socket.on('group:message:reaction', async ({ groupId, messageId, emoji }) => {
    try {
      const gid = normalizeId(groupId);
      const mid = normalizeId(messageId);
      if (!isValidId(gid) || !isValidId(mid) || !emoji) return;

      const group = await Group.findById(gid).select('chat');
      if (!group?.chat) return;

      const chat = await Chat.findOne({
        _id: group.chat,
        'messages._id': mid,
      });

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

      io.to(`chat:${String(group.chat)}`).emit('group:message:reaction', {
        groupId: gid,
        messageId: mid,
        reactions: msg.reactions,
      });
    } catch (e) {
      console.error('group:message:reaction error', e);
    }
  });

  /* =====================================================
     MESSAGE READ RECEIPT (PERSISTED)
  ===================================================== */
  socket.on('group:message:read', async ({ groupId, messageId }) => {
    try {
      const gid = normalizeId(groupId);
      const mid = normalizeId(messageId);
      if (!isValidId(gid) || !isValidId(mid)) return;

      const group = await Group.findById(gid).select('chat');
      if (!group?.chat) return;

      const chat = await Chat.findById(group.chat);
      if (!chat) return;

      const msg = chat.messages.id(mid);
      if (!msg) return;

      msg.readBy = msg.readBy || [];
      if (!msg.readBy.includes(String(userId))) {
        msg.readBy.push(String(userId));
        await chat.save();
      }

      socket.to(`chat:${String(group.chat)}`).emit('group:message:read', {
        groupId: gid,
        messageId: mid,
        userId,
      });
    } catch (e) {
      console.error('group:message:read error', e);
    }
  });

  /* =====================================================
     MESSAGE DELETE FOR EVERYONE (PERSISTED)
  ===================================================== */
  socket.on('group:message:delete', async ({ groupId, messageId }) => {
    try {
      const gid = normalizeId(groupId);
      const mid = normalizeId(messageId);
      if (!isValidId(gid) || !isValidId(mid)) return;

      const group = await Group.findById(gid).select('chat');
      if (!group?.chat) return;

      const chat = await Chat.findById(group.chat);
      if (!chat) return;

      const msg = chat.messages.id(mid);
      if (!msg) return;
      if (String(msg.sender) !== String(userId)) return;

      msg.isDeleted = true;
      msg.ciphertext = '';
      msg.deletedAt = new Date();

      await chat.save();

      io.to(`chat:${String(group.chat)}`).emit('group:message:deleted', {
        groupId: gid,
        messageId: mid,
      });
    } catch (e) {
      console.error('group:message:delete error', e);
    }
  });

  /* =====================================================
     MESSAGE EDIT (PERSISTED)
  ===================================================== */
  socket.on('group:message:edit', async ({ groupId, messageId, ciphertext }) => {
    try {
      const gid = normalizeId(groupId);
      const mid = normalizeId(messageId);
      if (!isValidId(gid) || !isValidId(mid) || !ciphertext) return;

      const group = await Group.findById(gid).select('chat');
      if (!group?.chat) return;

      const chat = await Chat.findById(group.chat);
      if (!chat) return;

      const msg = chat.messages.id(mid);
      if (!msg) return;
      if (String(msg.sender) !== String(userId)) return;

      msg.ciphertext = ciphertext;
      msg.editedAt = new Date();

      await chat.save();

      io.to(`chat:${String(group.chat)}`).emit('group:message:edited', {
        groupId: gid,
        messageId: mid,
        ciphertext,
      });
    } catch (e) {
      console.error('group:message:edit error', e);
    }
  });
};
