// backend/socket/presence.js
const User = require('../models/User');

/*
  onlineMap structure:
  userId (string) -> Set(socketId)
*/
const onlineMap = new Map();

/* =====================================================
   INTERNAL HELPERS
===================================================== */

/**
 * Add socketId to user's active socket set
 * Returns true if user transitioned OFFLINE -> ONLINE
 */
const addSocket = (userId, socketId) => {
  const uid = String(userId);

  if (!onlineMap.has(uid)) {
    onlineMap.set(uid, new Set([socketId]));
    return true; // first socket → user just came online
  }

  onlineMap.get(uid).add(socketId);
  return false;
};

/**
 * Remove socketId from user's socket set
 * Returns true if user transitioned ONLINE -> OFFLINE
 */
const removeSocket = (userId, socketId) => {
  const uid = String(userId);
  const sockets = onlineMap.get(uid);

  if (!sockets) return false;

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineMap.delete(uid);
    return true; // last socket → user just went offline
  }

  return false;
};

/**
 * Check if user is currently online
 */
const isOnline = (userId) => {
  return onlineMap.has(String(userId));
};

/**
 * Get all online users (ids)
 */
const getOnlineUsers = () => {
  return Array.from(onlineMap.keys());
};

/* =====================================================
   SOCKET PRESENCE HANDLER
===================================================== */

module.exports = (io, socket) => {
  if (!socket.user || !socket.user.id) return;

  const userId = String(socket.user.id);

  /* ===================== CONNECT ===================== */
  const becameOnline = addSocket(userId, socket.id);

  // Emit ONLY if user actually became online
  if (becameOnline) {
    io.emit('user:online', {
      userId,
      at: new Date().toISOString(),
    });
  }

  /* ===================== WHO IS ONLINE ===================== */
  /**
   * Client usage:
   * socket.emit('presence:whois', { userIds }, cb)
   */
  socket.on('presence:whois', ({ userIds = [] }, cb) => {
    try {
      if (!Array.isArray(userIds)) {
        return cb?.({
          success: false,
          message: 'userIds must be an array',
        });
      }

      const data = userIds.map((uid) => ({
        userId: String(uid),
        online: isOnline(uid),
      }));

      cb?.({
        success: true,
        data,
      });
    } catch (e) {
      cb?.({
        success: false,
        message: e.message,
      });
    }
  });

  /* ===================== BULK HYDRATION ===================== */
  /**
   * Optional: hydrate presence in bulk
   * socket.emit('presence:hydrate', {}, cb)
   */
  socket.on('presence:hydrate', (_, cb) => {
    try {
      const online = {};
      onlineMap.forEach((_, uid) => {
        online[uid] = true;
      });

      cb?.({
        success: true,
        data: { online },
      });
    } catch (e) {
      cb?.({
        success: false,
        message: e.message,
      });
    }
  });

  /* ===================== DISCONNECT ===================== */
  socket.on('disconnect', async (reason) => {
    const wentOffline = removeSocket(userId, socket.id);

    // Emit ONLY if user truly went offline
    if (!wentOffline) return;

    const lastSeen = new Date();

    io.emit('user:offline', {
      userId,
      lastSeen: lastSeen.toISOString(),
      reason,
    });

    // Persist last seen (safe & optional)
    try {
      await User.findByIdAndUpdate(
        userId,
        { lastSeenAt: lastSeen },
        { lean: true }
      );
    } catch (_) {
      // silently ignore (schema may not support lastSeenAt)
    }
  });
};

/* =====================================================
   EXPORTS
===================================================== */

module.exports.isOnline = isOnline;
module.exports.getOnlineUsers = getOnlineUsers;
