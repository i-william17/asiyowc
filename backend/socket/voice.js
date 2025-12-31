// backend/socket/voice.js
const Voice = require('../models/Voice');

/* =====================================================
   SOCKET VOICE HANDLERS
===================================================== */

module.exports = (io, socket) => {
  if (!socket.user || !socket.user.id) return;

  const userId = String(socket.user.id);

  /* ===================== JOIN VOICE ROOM ===================== */
  socket.on('voice:join', async ({ voiceId }, cb) => {
    try {
      if (!voiceId) {
        return typeof cb === 'function' &&
          cb({ success: false, message: 'voiceId required' });
      }

      const voice = await Voice.findOne({
        _id: voiceId,
        isRemoved: false
      }).select('_id');

      if (!voice) {
        return typeof cb === 'function' &&
          cb({ success: false, message: 'Voice not found' });
      }

      socket.join(`voice:${voiceId}`);

      // Notify others in the room
      socket.to(`voice:${voiceId}`).emit('voice:user-joined', {
        voiceId,
        userId
      });

      if (typeof cb === 'function') cb({ success: true });
    } catch (e) {
      if (typeof cb === 'function') {
        cb({ success: false, message: e.message });
      }
    }
  });

  /* ===================== LEAVE VOICE ROOM ===================== */
  socket.on('voice:leave', ({ voiceId }, cb) => {
    if (!voiceId) {
      return typeof cb === 'function' &&
        cb({ success: false, message: 'voiceId required' });
    }

    socket.leave(`voice:${voiceId}`);

    socket.to(`voice:${voiceId}`).emit('voice:user-left', {
      voiceId,
      userId
    });

    if (typeof cb === 'function') cb({ success: true });
  });

  /* ===================== INSTANCE STATUS BROADCAST ===================== */
  // Used when REST updates instance state (mute, speaking, recording, etc.)
  socket.on('voice:instance:status', ({ voiceId, instanceId, status }) => {
    if (!voiceId || !instanceId || !status) return;

    io.to(`voice:${voiceId}`).emit('voice:instance:status', {
      voiceId,
      instanceId,
      status
    });
  });

  /* ===================== CLEANUP ON DISCONNECT ===================== */
  socket.on('disconnect', () => {
    // Room cleanup is handled automatically by socket.io
    // Presence + lastSeen handled by presence module
  });
};
