const User = require('../models/User');

/*
  onlineMap structure:
  userId (string) -> Set(socketId)
*/
const onlineMap = new Map();

/* =====================================================
   INTERNAL HELPERS
===================================================== */

const addSocket = (userId, socketId) => {
  const key = String(userId);
  if (!onlineMap.has(key)) {
    onlineMap.set(key, new Set());
  }
  onlineMap.get(key).add(socketId);
};

const removeSocket = (userId, socketId) => {
  const key = String(userId);
  const set = onlineMap.get(key);
  if (!set) return false;

  set.delete(socketId);

  // user goes offline only when last socket disconnects
  if (set.size === 0) {
    onlineMap.delete(key);
    return true;
  }

  return false;
};

const isOnline = (userId) => onlineMap.has(String(userId));

/* =====================================================
   SOCKET PRESENCE HANDLER
===================================================== */

module.exports = (io, socket) => {
  if (!socket.user || !socket.user.id) return;

  const userId = String(socket.user.id);

  /* ===================== CONNECT ===================== */
  addSocket(userId, socket.id);

  // Notify everyone
  io.emit('user:online', {
    userId
  });

  /* ===================== WHO IS ONLINE ===================== */
  // Client usage:
  // socket.emit('presence:whois', { userIds }, cb)
  socket.on('presence:whois', ({ userIds = [] }, cb) => {
    if (!Array.isArray(userIds)) {
      return typeof cb === 'function' &&
        cb({ success: false, message: 'userIds must be array' });
    }

    const data = userIds.map((id) => ({
      userId: String(id),
      online: isOnline(id)
    }));

    if (typeof cb === 'function') {
      cb({ success: true, data });
    }
  });

  /* ===================== BATCH PRESENCE ===================== */
  // Optional: hydrate presence in bulk
  socket.on('presence:hydrate', (_, cb) => {
    const online = {};
    onlineMap.forEach((_, uid) => {
      online[uid] = true;
    });

    if (typeof cb === 'function') {
      cb({
        success: true,
        data: {
          online
        }
      });
    }
  });

  /* ===================== DISCONNECT ===================== */
  socket.on('disconnect', async () => {
    const wentOffline = removeSocket(userId, socket.id);

    if (!wentOffline) return;

    io.emit('user:offline', {
      userId,
      lastSeen: new Date().toISOString()
    });

    // Persist last seen (safe, optional)
    try {
      await User.findByIdAndUpdate(userId, {
        lastSeenAt: new Date()
      });
    } catch (err) {
      // silently fail (schema may not support lastSeenAt)
    }
  });
};

/* =====================================================
   EXPORTS
===================================================== */

module.exports.isOnline = isOnline;
