const socketAuth = require('./auth');
const registerPresence = require('./presence');
const registerChat = require('./chat');
const registerGroup = require('./group');
const registerVoice = require('./voice');
const registerHub = require('./hub');

/* =====================================================
   SOCKET INITIALIZER (AUTHORITATIVE)
===================================================== */

module.exports = function initSocket(io) {
  if (!io) {
    throw new Error('Socket initialization failed: io instance required');
  }

  /* =====================================================
     AUTH MIDDLEWARE
     - Runs BEFORE connection
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

    const userId = String(socket.user.id);

    console.log(`🟢 Socket connected: ${userId}`);

    /* =====================================================
       USER ROOM (1 user = 1 room)
       - Used for presence, direct emits, receipts
    ===================================================== */
    socket.join(`user:${userId}`);

    /* =====================================================
       REQUIRED CHAT ROOM EVENTS
       🔥 THIS FIXES YOUR REALTIME ISSUES
    ===================================================== */

    // DM chat room
    socket.on('chat:join', ({ chatId }, cb) => {
      if (!chatId) {
        return typeof cb === 'function' &&
          cb({ success: false, message: 'chatId required' });
      }

      socket.join(String(chatId));
      typeof cb === 'function' && cb({ success: true });
    });

    socket.on('chat:leave', ({ chatId }) => {
      if (!chatId) return;
      socket.leave(String(chatId));
    });

    // Join ALL DM chats at once (used on reconnect)
    socket.on('chat:joinAll', ({ chatIds = [] }, cb) => {
      if (!Array.isArray(chatIds)) return;

      chatIds.forEach((id) => socket.join(String(id)));
      typeof cb === 'function' && cb({ success: true });
    });

    /* =====================================================
       GROUP CHAT ROOMS
    ===================================================== */

    socket.on('group:join', ({ groupId }, cb) => {
      if (!groupId) {
        return typeof cb === 'function' &&
          cb({ success: false, message: 'groupId required' });
      }

      socket.join(`group:${groupId}`);
      typeof cb === 'function' && cb({ success: true });
    });

    socket.on('group:leave', ({ groupId }) => {
      if (!groupId) return;
      socket.leave(`group:${groupId}`);
    });

    /* =====================================================
   AI MEMORY CONTROL
   - Clears conversation memory when frontend closes chat
===================================================== */
    socket.on("ai:clear", () => {
      const userId = socket.user?.id;
      if (!userId) return;

      const room = `user:${String(userId)}`;

      // This function is exported from your AI controller file
      const { clearAiMemory } = require("../controllers/aiController");

      clearAiMemory(userId);

      console.log("🧹 AI memory cleared for", room);
    });

    /* =====================================================
       REGISTER DOMAIN MODULES
       (safe – they rely on rooms above)
    ===================================================== */
    try {
      registerPresence(io, socket);
      registerChat(io, socket);
      registerGroup(io, socket);
      registerVoice(io, socket);
      registerHub(io, socket);
    } catch (err) {
      console.error('❌ Socket module registration failed:', err);
      socket.disconnect(true);
      return;
    }

    /* =====================================================
       CLEANUP
    ===================================================== */
    socket.on('disconnect', (reason) => {
      console.log(`🔴 Socket disconnected: ${userId} | reason: ${reason}`);
    });
  });

  return io;
};
