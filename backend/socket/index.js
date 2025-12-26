const socketAuth = require('./auth');
const registerPresence = require('./presence');
const registerChat = require('./chat');
const registerGroup = require('./group');
const registerVoice = require('./voice');

/* =====================================================
   SOCKET INITIALIZER
===================================================== */

module.exports = function initSocket(io) {
  if (!io) {
    throw new Error('Socket initialization failed: io instance required');
  }

  /* =====================================================
     AUTH MIDDLEWARE
     - Runs BEFORE connection event
     - Attaches socket.user
  ===================================================== */
  io.use(socketAuth);

  /* =====================================================
     CONNECTION HANDLER
  ===================================================== */
  io.on('connection', (socket) => {
    if (!socket.user || !socket.user.id) {
      socket.disconnect(true);
      return;
    }

    console.log(`🟢 Socket connected: ${socket.user.id}`);

    /* =====================================================
       MODULE REGISTRATION
       Each module binds its own listeners
    ===================================================== */
    try {
      registerPresence(io, socket);
      registerChat(io, socket);
      registerGroup(io, socket);
      registerVoice(io, socket);
    } catch (e) {
      console.error('❌ Socket module registration failed:', e);
      socket.disconnect(true);
      return;
    }

    /* =====================================================
       DISCONNECT
    ===================================================== */
    socket.on('disconnect', (reason) => {
      console.log(
        `🔴 Socket disconnected: ${socket.user.id} | reason: ${reason}`
      );
    });
  });

  return io;
};
