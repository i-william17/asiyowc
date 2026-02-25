// backend/socket/voice.js
const Voice = require("../models/Voice");
const User = require("../models/User");
const { redisClient } = require("../config/redis");

/* =====================================================
   REDIS KEY STRUCTURE
===================================================== */
const RedisKeys = {
  connected: (instanceId) => `voice:${instanceId}:connected`,
  roles: (instanceId) => `voice:${instanceId}:roles`,
  muted: (instanceId) => `voice:${instanceId}:muted`,
  speaking: (instanceId) => `voice:${instanceId}:speaking`,
  banned: (instanceId) => `voice:${instanceId}:banned`,
  chatMuted: (instanceId) => `voice:${instanceId}:chat:muted`,
  requests: (instanceId) => `voice:${instanceId}:requests`,
  userSockets: (instanceId, userId) => `voice:${instanceId}:user:${userId}:sockets`,
  meta: (instanceId) => `voice:${instanceId}:meta`,
  userInstances: (userId) => `user:${userId}:voice:instances`, // Track which instances user is in
  webrtcReady: (instanceId) => `voice:${instanceId}:webrtc:ready`, // Track WebRTC readiness
};

/* =====================================================
   CONSTANTS
===================================================== */
const CHAT_RATE_LIMIT_MS = 1200;
const HEARTBEAT_TIMEOUT_MS = 30000;
const SESSION_TTL = 7200; // 2 hours in seconds
const RATE_LIMIT_TTL = 60; // 1 minute for rate limit entries
const disconnectTimers = new Map();

// Global rate limit map (shared across all sockets for this server instance)
const globalRateLimitMap = new Map();

/* =====================================================
   HELPERS
===================================================== */

const now = () => Date.now();
const roomName = (instanceId) => `voice:${instanceId}`;
const safeId = (id) => (id ? String(id) : null);

function log(level, message, data) {
  if (process.env.NODE_ENV === 'development') {
    console[level](`[${new Date().toISOString()}] ${message}`, data || '');
  }
}

/* =====================================================
   REDIS HELPER FUNCTIONS
===================================================== */

async function addToRedisSet(key, value) {
  try {
    await redisClient.sAdd(key, value);
  } catch (error) {
    log('error', `Redis sAdd error: ${key}`, { error: error.message });
  }
}

async function removeFromRedisSet(key, value) {
  try {
    await redisClient.sRem(key, value);
  } catch (error) {
    log('error', `Redis sRem error: ${key}`, { error: error.message });
  }
}

async function getRedisSetMembers(key) {
  try {
    return await redisClient.sMembers(key) || [];
  } catch (error) {
    log('error', `Redis sMembers error: ${key}`, { error: error.message });
    return [];
  }
}

async function redisSetIsMember(key, value) {
  try {
    return await redisClient.sIsMember(key, value);
  } catch (error) {
    log('error', `Redis sIsMember error: ${key}`, { error: error.message });
    return false;
  }
}

async function redisSetCard(key) {
  try {
    return await redisClient.sCard(key);
  } catch (error) {
    log('error', `Redis sCard error: ${key}`, { error: error.message });
    return 0;
  }
}

async function setRedisHash(key, field, value) {
  try {
    await redisClient.hSet(key, field, value);
  } catch (error) {
    log('error', `Redis hSet error: ${key}`, { error: error.message });
  }
}

async function getRedisHashAll(key) {
  try {
    return await redisClient.hGetAll(key) || {};
  } catch (error) {
    log('error', `Redis hGetAll error: ${key}`, { error: error.message });
    return {};
  }
}

async function getRedisHashField(key, field) {
  try {
    return await redisClient.hGet(key, field);
  } catch (error) {
    log('error', `Redis hGet error: ${key}`, { error: error.message });
    return null;
  }
}

async function deleteRedisHashField(key, field) {
  try {
    await redisClient.hDel(key, field);
  } catch (error) {
    log('error', `Redis hDel error: ${key}`, { error: error.message });
  }
}

async function redisExists(key) {
  try {
    const result = await redisClient.exists(key);
    return result > 0;
  } catch (error) {
    log('error', `Redis exists error: ${key}`, { error: error.message });
    return false;
  }
}

async function redisDel(...keys) {
  if (keys.length === 0) return;
  try {
    await redisClient.del(keys);
  } catch (error) {
    log('error', `Redis del error`, { error: error.message, keys: keys.length });
  }
}

async function redisScanKeys(pattern) {
  try {
    const keys = [];
    let cursor = '0';
    
    do {
      const reply = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = reply[0];
      keys.push(...reply[1]);
    } while (cursor !== '0');
    
    return keys;
  } catch (error) {
    log('error', `Redis scan error: ${pattern}`, { error: error.message });
    return [];
  }
}

/* =====================================================
   USER SOCKET MANAGEMENT (Multi-tab support)
===================================================== */

async function addUserSocket(instanceId, userId, socketId) {
  const userSocketsKey = RedisKeys.userSockets(instanceId, userId);
  const userInstancesKey = RedisKeys.userInstances(userId);
  
  await addToRedisSet(userSocketsKey, socketId);
  await addToRedisSet(userInstancesKey, instanceId);
  
  // Set TTL on user socket set to auto-cleanup if forgotten
  await redisClient.expire(userSocketsKey, SESSION_TTL);
  await redisClient.expire(userInstancesKey, SESSION_TTL);
}

async function removeUserSocket(instanceId, userId, socketId) {
  const userSocketsKey = RedisKeys.userSockets(instanceId, userId);
  const userInstancesKey = RedisKeys.userInstances(userId);
  
  await removeFromRedisSet(userSocketsKey, socketId);
  
  // If no more sockets for this user in this instance
  const socketCount = await redisSetCard(userSocketsKey);
  if (socketCount === 0) {
    await redisDel(userSocketsKey);
    
    // Remove user from connected set
    const connectedKey = RedisKeys.connected(instanceId);
    await removeFromRedisSet(connectedKey, userId);
    
    // Remove speaking and muted states (but keep role)
    const speakingKey = RedisKeys.speaking(instanceId);
    const mutedKey = RedisKeys.muted(instanceId);
    await deleteRedisHashField(speakingKey, userId);
    await deleteRedisHashField(mutedKey, userId);
    
    // Remove WebRTC ready state
    const readyKey = RedisKeys.webrtcReady(instanceId);
    await removeFromRedisSet(readyKey, userId);
    
    // Remove instance from user's instances set
    await removeFromRedisSet(userInstancesKey, instanceId);
    
    // If user has no instances left, clean up user instances key
    const userInstanceCount = await redisSetCard(userInstancesKey);
    if (userInstanceCount === 0) {
      await redisDel(userInstancesKey);
    }
  }
}

async function getUserSockets(instanceId, userId) {
  const userSocketsKey = RedisKeys.userSockets(instanceId, userId);
  return await getRedisSetMembers(userSocketsKey);
}

async function getUserInstances(userId) {
  const userInstancesKey = RedisKeys.userInstances(userId);
  return await getRedisSetMembers(userInstancesKey);
}

/* =====================================================
   RATE LIMITING (Global per server)
===================================================== */

function checkRateLimit(instanceId, userId) {
  const key = `${instanceId}:${userId}`;
  const last = globalRateLimitMap.get(key) || 0;
  const now_time = now();
  
  if (now_time - last < CHAT_RATE_LIMIT_MS) {
    return false;
  }
  
  globalRateLimitMap.set(key, now_time);
  
  // Clean up old entries periodically (simple LRU)
  if (globalRateLimitMap.size > 10000) {
    const oldestThreshold = now_time - (CHAT_RATE_LIMIT_MS * 10);
    for (const [k, timestamp] of globalRateLimitMap.entries()) {
      if (timestamp < oldestThreshold) {
        globalRateLimitMap.delete(k);
      }
    }
  }
  
  return true;
}

/* =====================================================
   INSTANCE METADATA MANAGEMENT
===================================================== */

async function getInstanceMeta(instanceId) {
  const metaKey = RedisKeys.meta(instanceId);
  const meta = await getRedisHashAll(metaKey);
  
  // Clean boolean parsing - no spread to avoid type mixing
  return {
    chatEnabled: meta.chatEnabled !== 'false', // default true
    lockedStage: meta.lockedStage === 'true', // default false
    recording: meta.recording === 'true', // default false
    hostId: meta.hostId,
    voiceId: meta.voiceId,
    createdAt: meta.createdAt,
  };
}

async function setInstanceMeta(instanceId, updates) {
  const metaKey = RedisKeys.meta(instanceId);
  for (const [key, value] of Object.entries(updates)) {
    await setRedisHash(metaKey, key, String(value));
  }
  await redisClient.expire(metaKey, SESSION_TTL);
}

/* =====================================================
   ROSTER BUILDING FROM REDIS
===================================================== */

async function buildRosterFromRedis(instanceId) {
  try {
    const connectedKey = RedisKeys.connected(instanceId);
    const rolesKey = RedisKeys.roles(instanceId);
    const speakingKey = RedisKeys.speaking(instanceId);
    const mutedKey = RedisKeys.muted(instanceId);

    // Get all connected users from Redis
    const connectedIds = await getRedisSetMembers(connectedKey);
    if (connectedIds.length === 0) {
      return { speakers: [], listeners: [], allParticipants: [] };
    }

    // Get roles for all connected users
    const roles = await getRedisHashAll(rolesKey);
    
    // Get speaking states
    const speakingStates = await getRedisHashAll(speakingKey);
    
    // Get mute states
    const muteStates = await getRedisHashAll(mutedKey);

    // Build participants array
    const participants = connectedIds.map(userId => ({
      _id: userId,
      role: roles[userId] || 'listener',
      isSpeaking: speakingStates[userId] === 'true',
      isMuted: muteStates[userId] === 'true',
    }));

    // Separate speakers and listeners
    const speakers = participants.filter(p => p.role === 'speaker');
    const listeners = participants.filter(p => p.role !== 'speaker');

    // Fetch user profiles from MongoDB
    const allUserIds = participants.map(p => p._id);
    const users = await User.find({
      _id: { $in: allUserIds }
    })
      .select("profile.fullName profile.avatar")
      .lean();

    const userMap = {};
    users.forEach(user => {
      userMap[String(user._id)] = user;
    });

    // Enrich participants with profile data
    const enrichedSpeakers = speakers.map(speaker => ({
      ...speaker,
      ...userMap[speaker._id],
    }));

    const enrichedListeners = listeners.map(listener => ({
      ...listener,
      ...userMap[listener._id],
    }));

    const enrichedParticipants = participants.map(participant => ({
      ...participant,
      ...userMap[participant._id],
    }));

    return {
      speakers: enrichedSpeakers,
      listeners: enrichedListeners,
      allParticipants: enrichedParticipants,
    };
  } catch (error) {
    log('error', 'Error building roster from Redis', { error: error.message });
    return { speakers: [], listeners: [], allParticipants: [] };
  }
}

/* =====================================================
   VOICE INSTANCE CLEANUP
===================================================== */

async function cleanupVoiceInstance(instanceId) {
  try {
    const connectedKey = RedisKeys.connected(instanceId);
    
    // 🔴 FIX #6: Get connected users FIRST, then check count
    const connectedUsers = await getRedisSetMembers(connectedKey);
    const connectedCount = connectedUsers.length;
    
    if (connectedCount === 0) {
      // Remove instanceId from each user's instances set
      for (const userId of connectedUsers) {
        const userInstancesKey = RedisKeys.userInstances(userId);
        await removeFromRedisSet(userInstancesKey, instanceId);
        
        // If user has no instances left, clean up user instances key
        const userInstanceCount = await redisSetCard(userInstancesKey);
        if (userInstanceCount === 0) {
          await redisDel(userInstancesKey);
        }
      }
      
      // Find all user socket keys for this instance
      const userSocketsPattern = `voice:${instanceId}:user:*:sockets`;
      const userSocketKeys = await redisScanKeys(userSocketsPattern);
      
      // Delete all instance-related keys
      const keysToDelete = [
        RedisKeys.connected(instanceId),
        RedisKeys.roles(instanceId),
        RedisKeys.muted(instanceId),
        RedisKeys.speaking(instanceId),
        RedisKeys.banned(instanceId),
        RedisKeys.chatMuted(instanceId),
        RedisKeys.requests(instanceId),
        RedisKeys.meta(instanceId),
        RedisKeys.webrtcReady(instanceId),
        ...userSocketKeys,
      ];
      
      if (keysToDelete.length > 0) {
        await redisDel(...keysToDelete);
      }
      
      log('info', `🧹 Cleaned up voice instance: ${instanceId}`, { keysDeleted: keysToDelete.length });
    }
  } catch (error) {
    log('error', 'Error cleaning up voice instance', { error: error.message, instanceId });
  }
}

/* =====================================================
   VOICE INSTANCE SOCKET HANDLER
===================================================== */
module.exports = function voiceSocket(io, socket) {
  if (!socket.user?.id) return;

  const userId = String(socket.user.id);

  /* =====================================================
     JOIN - Optimized with parallel promises
  ===================================================== */

  socket.on("voice:join", async ({ instanceId }, cb) => {
    try {
      if (!instanceId) {
        return cb?.({ success: false, message: "instanceId required" });
      }

      const key = `${instanceId}:${userId}`;
      if (disconnectTimers.has(key)) {
        clearTimeout(disconnectTimers.get(key));
        disconnectTimers.delete(key);
        log('info', `⏱️ [voice] Cancelled disconnect timer for rejoin`, { instanceId, userId });
      }

      // Parallelize initial checks for better performance
      const [voice, isBanned] = await Promise.all([
        Voice.findOne({
          "instances.instanceId": instanceId,
          isRemoved: false,
        })
          .populate("host", "profile.fullName profile.avatar")
          .lean(),
        redisSetIsMember(RedisKeys.banned(instanceId), userId)
      ]);

      if (isBanned) {
        return cb?.({ 
          success: false, 
          message: "You are banned from this voice room",
          code: "BANNED"
        });
      }

      if (!voice) {
        return cb?.({ success: false, message: "Voice instance not found" });
      }

      const instance = voice.instances.find(
        (i) => String(i.instanceId) === String(instanceId)
      );

      // 🔴 FIX #1: Check both status AND expiry
      if (!instance) {
        return cb?.({ success: false, message: "Instance not found" });
      }

      const nowTime = Date.now();
      const endsAt = instance.endsAt ? new Date(instance.endsAt).getTime() : null;

      if (
        instance.status !== "live" ||
        (endsAt && nowTime > endsAt)
      ) {
        return cb?.({
          success: false,
          message: "Instance not live or expired",
          code: "INSTANCE_EXPIRED",
        });
      }

      // Determine role from MongoDB (permanent truth)
      const role = String(voice.host._id) === userId ||
        instance.speakers.some(id => String(id) === userId)
        ? "speaker"
        : "listener";

      // Add user to Redis
      const connectedKey = RedisKeys.connected(instanceId);
      const rolesKey = RedisKeys.roles(instanceId);
      const mutedKey = RedisKeys.muted(instanceId);
      const speakingKey = RedisKeys.speaking(instanceId); // For cleanup
      const readyKey = RedisKeys.webrtcReady(instanceId);

      await addToRedisSet(connectedKey, userId);
      
      // 🟡 FIX #3: Preserve existing Redis role if it exists
      const existingRole = await getRedisHashField(rolesKey, userId);
      if (!existingRole) {
        await setRedisHash(rolesKey, userId, role);
      }
      
      await setRedisHash(mutedKey, userId, 'false'); // Default unmuted
      
      // 🟢 FIX #5: Reset speaking state on fresh join
      await deleteRedisHashField(speakingKey, userId);
      
      // Set TTL on all keys to prevent Redis bloat
      await redisClient.expire(connectedKey, SESSION_TTL);
      await redisClient.expire(rolesKey, SESSION_TTL);
      await redisClient.expire(readyKey, SESSION_TTL); // Safety TTL even if empty
      
      // Add socket to user's socket set (multi-tab support)
      await addUserSocket(instanceId, userId, socket.id);

      socket.join(roomName(instanceId));

      // Initialize instance metadata if not exists
      const metaKey = RedisKeys.meta(instanceId);
      const metaExists = await redisExists(metaKey);
      if (!metaExists) {
        await setInstanceMeta(instanceId, {
          chatEnabled: 'true',
          lockedStage: 'false',
          recording: 'false',
          hostId: voice.host._id,
          voiceId: voice._id,
          createdAt: now().toString()
        });
      }

      // Get instance metadata
      const meta = await getInstanceMeta(instanceId);

      // Build roster from Redis
      const roster = await buildRosterFromRedis(instanceId);

      // Prepare instance data for response
      const instanceData = {
        _id: instance._id,
        instanceId: instance.instanceId,
        status: instance.status,
        startsAt: instance.startsAt,
        endsAt: instance.endsAt,
        speakers: roster.speakers,
        listeners: roster.listeners,
        participants: roster.allParticipants,
        chatEnabled: meta.chatEnabled,
        recording: instance.recording || meta.recording,
      };

      // Send success response FIRST so client can initialize WebRTC
      cb?.({
        success: true,
        room: voice,
        instance: instanceData,
        role,
        chatEnabled: meta.chatEnabled,
        lockedStage: meta.lockedStage,
      });

      // AFTER callback, notify other users about new participant
      // This ensures the new client has received the response and can initialize WebRTC
      // before others start trying to connect to them
      emit(io, instanceId, "voice:user:joined", {
        userId,
        participant: roster.allParticipants.find(p => p._id === userId) || {
          _id: userId,
          role,
          isMuted: false,
          isSpeaking: false,
        },
      });

      // Soft handshake trigger: if there are already ready users, trigger handshake immediately
      // This eliminates the edge case where existing ready users don't re-emit ready
      const readyUsers = await getRedisSetMembers(readyKey);
      
      if (readyUsers.length > 0) {
        for (const readyUserId of readyUsers) {
          if (readyUserId === userId) continue;

          // Notify the existing ready user about the new user
          const shouldCreateOffer = String(userId).localeCompare(String(readyUserId)) < 0;
          const sockets = await getUserSockets(instanceId, readyUserId);
          for (const sid of sockets) {
            io.to(sid).emit("voice:user:ready", {
              userId,
              shouldCreateOffer,
            });
          }

          // SYMMETRIC: Also notify the new user about the existing ready user
          socket.emit("voice:user:ready", {
            userId: readyUserId,
            shouldCreateOffer: String(readyUserId).localeCompare(String(userId)) < 0,
          });
        }
      }

    } catch (e) {
      console.error("Voice join error:", e);
      cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
     LEAVE
  ===================================================== */

  socket.on("voice:leave", async ({ instanceId } = {}) => {
    if (!instanceId) {
      log('warn', "⚠️ [voice] voice:leave called without instanceId", { userId });
      return;
    }

    // Check if user has multiple sockets before removing states
    const userSocketsBefore = await getUserSockets(instanceId, userId);
    const hadMultipleSockets = userSocketsBefore.length > 1;
    
    // Remove this socket from user's socket set
    await removeUserSocket(instanceId, userId, socket.id);
    
    // Check remaining sockets after removal
    const remainingSockets = await getUserSockets(instanceId, userId);
    
    // Only clear speaking/muted if this was the last socket
    if (remainingSockets.length === 0) {
      const speakingKey = RedisKeys.speaking(instanceId);
      const mutedKey = RedisKeys.muted(instanceId);
      const readyKey = RedisKeys.webrtcReady(instanceId);
      
      await deleteRedisHashField(speakingKey, userId);
      await deleteRedisHashField(mutedKey, userId);
      await removeFromRedisSet(readyKey, userId);
      
      // ❌ Do NOT delete from rolesKey - role persists for session
    } else if (hadMultipleSockets) {
      // If user had multiple sockets and still has some, don't clear anything
      // Speaking state should persist across tabs
      log('debug', 'User still has active sockets, preserving state', { 
        userId, 
        remainingCount: remainingSockets.length 
      });
    }

    socket.leave(roomName(instanceId));

    // Cancel any pending disconnect timer
    const key = `${instanceId}:${userId}`;
    if (disconnectTimers.has(key)) {
      clearTimeout(disconnectTimers.get(key));
      disconnectTimers.delete(key);
    }
    
    // Only notify others if this was their last socket
    if (remainingSockets.length === 0) {
      emit(io, instanceId, "voice:user:left", { userId });
    }

    // Cleanup instance if empty
    await cleanupVoiceInstance(instanceId);
  });

  /* =====================================================
     DISCONNECT (Critical - handles abrupt disconnections)
  ===================================================== */

  socket.on("disconnect", async () => {
    log('info', `🔌 Socket disconnected`, { userId, socketId: socket.id });
    
    try {
      // Get all instances this user was in
      const userInstances = await getUserInstances(userId);
      
      for (const instanceId of userInstances) {
        // Check if this socket was in this instance
        const userSockets = await getUserSockets(instanceId, userId);
        
        if (userSockets.includes(socket.id)) {
          // Check if user has multiple sockets before removal
          const hadMultipleSockets = userSockets.length > 1;
          
          // Remove this socket
          await removeUserSocket(instanceId, userId, socket.id);
          
          // Check remaining sockets after removal
          const remainingSockets = await getUserSockets(instanceId, userId);
          
          // Only clear speaking/muted if this was the last socket
          if (remainingSockets.length === 0) {
            const speakingKey = RedisKeys.speaking(instanceId);
            const mutedKey = RedisKeys.muted(instanceId);
            const readyKey = RedisKeys.webrtcReady(instanceId);
            
            await deleteRedisHashField(speakingKey, userId);
            await deleteRedisHashField(mutedKey, userId);
            await removeFromRedisSet(readyKey, userId);
            
            // ❌ Do NOT delete from rolesKey
            
            // Notify others
            emit(io, instanceId, "voice:user:left", { userId });
          } else if (hadMultipleSockets) {
            // User still has active sockets, preserve state
            log('debug', 'User still has active sockets after disconnect', { 
              userId, 
              instanceId,
              remainingCount: remainingSockets.length 
            });
          }
          
          // Cleanup instance if empty
          await cleanupVoiceInstance(instanceId);
        }
      }
    } catch (error) {
      log('error', 'Error in disconnect handler', { error: error.message, userId });
    }
  });

  /* =====================================================
     RECONNECT
  ===================================================== */

  socket.on("voice:reconnect", async ({ instanceId }, cb) => {
    try {
      // Check if user is still in Redis
      const connectedKey = RedisKeys.connected(instanceId);
      const isConnected = await redisSetIsMember(connectedKey, userId);
      
      if (!isConnected) {
        return cb?.({ success: false, message: "Session expired" });
      }

      // Get role from Redis (should still exist)
      const rolesKey = RedisKeys.roles(instanceId);
      const role = await getRedisHashField(rolesKey, userId);

      if (!role) {
        return cb?.({ success: false, message: "Role not found" });
      }

      const voice = await Voice.findOne({
        "instances.instanceId": instanceId,
        isRemoved: false,
      })
        .populate("host", "profile.fullName profile.avatar")
        .lean();

      if (!voice) {
        return cb?.({ success: false, message: "Voice instance not found" });
      }

      // Add this socket to user's socket set
      await addUserSocket(instanceId, userId, socket.id);
      
      // Get instance metadata
      const meta = await getInstanceMeta(instanceId);

      // Build roster from Redis
      const roster = await buildRosterFromRedis(instanceId);

      const instanceData = {
        id: instanceId,
        voiceId: voice._id,
        speakers: roster.speakers,
        listeners: roster.listeners,
        participants: roster.allParticipants,
      };

      cb?.({
        success: true,
        room: voice,
        instance: instanceData,
        role,
        chatEnabled: meta.chatEnabled,
        lockedStage: meta.lockedStage,
      });

    } catch (e) {
      console.error("Voice reconnect error:", e);
      cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
     HEARTBEAT
  ===================================================== */

  socket.on("voice:heartbeat", ({ instanceId }) => {
    // No-op - we rely on disconnect handler for cleanup
    // Could refresh TTLs here for long sessions
    if (instanceId) {
      // Optional: Refresh TTLs for active sessions
      const readyKey = RedisKeys.webrtcReady(instanceId);
      redisClient.expire(readyKey, SESSION_TTL).catch(() => {});
    }
  });

  /* =====================================================
     WEBRTC READY SYNC - Idempotent with Set lookup optimization
  ===================================================== */

  socket.on("voice:webrtc:ready", async ({ instanceId }) => {
    try {
      if (!instanceId) return;

      // 🟢 FIX #4: Ensure user is still connected before processing
      const connectedKey = RedisKeys.connected(instanceId);
      const stillConnected = await redisSetIsMember(connectedKey, userId);
      if (!stillConnected) return;

      const readyKey = RedisKeys.webrtcReady(instanceId);
      
      // Prevent double-processing - make handler idempotent
      const alreadyReady = await redisSetIsMember(readyKey, userId);
      if (alreadyReady) return;

      // Mark this user as ready
      await addToRedisSet(readyKey, userId);
      await redisClient.expire(readyKey, SESSION_TTL);

      const connectedUsers = await getRedisSetMembers(connectedKey);
      
      // Get all ready users once (performance optimization)
      const readyUsers = await getRedisSetMembers(readyKey);
      
      // Defensive guard: ensure this user is still in the ready set
      // Prevents race conditions where disconnect cleared ready during processing
      if (!readyUsers.includes(userId)) return;
      
      // Convert to Set for O(1) lookups in large rooms
      const readySet = new Set(readyUsers);

      for (const otherUserId of connectedUsers) {
        if (otherUserId === userId) continue;

        // Check if other user is ready (using Set for O(1) lookup)
        if (!readySet.has(otherUserId)) continue;

        // Deterministic offer creation rule - safer comparison
        const shouldCreateOffer = String(userId).localeCompare(String(otherUserId)) < 0;
        const otherShouldCreateOffer = String(otherUserId).localeCompare(String(userId)) < 0;

        // Notify the other user about this user
        const otherSockets = await getUserSockets(instanceId, otherUserId);
        for (const sid of otherSockets) {
          io.to(sid).emit("voice:user:ready", {
            userId,
            shouldCreateOffer,
          });
        }

        // Notify this user about the other user (symmetric notification)
        socket.emit("voice:user:ready", {
          userId: otherUserId,
          shouldCreateOffer: otherShouldCreateOffer,
        });
      }

    } catch (err) {
      log("error", "webrtc ready error", err);
    }
  });

  /* =====================================================
     ROLE & STAGE MANAGEMENT
  ===================================================== */

  socket.on("voice:request:speak", async ({ instanceId, meta } = {}) => {
    const rolesKey = RedisKeys.roles(instanceId);
    const currentRole = await getRedisHashField(rolesKey, userId);
    
    if (currentRole !== "listener") return;

    // Check if stage is locked
    const instanceMeta = await getInstanceMeta(instanceId);
    if (instanceMeta.lockedStage) return;

    // Add to Redis requests
    const requestsKey = RedisKeys.requests(instanceId);
    await setRedisHash(requestsKey, userId, JSON.stringify({ meta: meta || null, timestamp: now() }));

    emit(io, instanceId, "voice:speaker:requested", {
      userId,
      meta: meta || null,
    });
  });

  socket.on("voice:approve:speaker", async ({ instanceId, userId: targetId }) => {
    // Check if user is host
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    if (!tid) return;

    const rolesKey = RedisKeys.roles(instanceId);
    const currentRole = await getRedisHashField(rolesKey, tid);
    
    if (currentRole !== "listener") return;

    // Update MongoDB with arrayFilters
    await Voice.updateOne(
      {
        "instances.instanceId": instanceId,
        isRemoved: false,
      },
      {
        $addToSet: { "instances.$[inst].speakers": tid },
        $pull: { "instances.$[inst].participants": tid },
      },
      {
        arrayFilters: [{ "inst.instanceId": instanceId }],
      }
    );

    // Update Redis role
    await setRedisHash(rolesKey, tid, "speaker");

    // Remove from requests
    const requestsKey = RedisKeys.requests(instanceId);
    await deleteRedisHashField(requestsKey, tid);

    emit(io, instanceId, "voice:speaker:approved", { userId: tid });
  });

  socket.on("voice:decline:speaker", async ({ instanceId, userId: targetId }) => {
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    if (!tid) return;

    // Remove from requests
    const requestsKey = RedisKeys.requests(instanceId);
    await deleteRedisHashField(requestsKey, tid);

    emit(io, instanceId, "voice:speaker:declined", { userId: tid });
  });

  socket.on("voice:demote:speaker", async ({ instanceId, userId: targetId }) => {
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    if (!tid) return;

    const rolesKey = RedisKeys.roles(instanceId);
    const currentRole = await getRedisHashField(rolesKey, tid);
    
    if (currentRole !== "speaker") return;

    // Update MongoDB with arrayFilters
    await Voice.updateOne(
      {
        "instances.instanceId": instanceId,
        isRemoved: false,
      },
      {
        $pull: { "instances.$[inst].speakers": tid },
        $addToSet: { "instances.$[inst].participants": tid },
      },
      {
        arrayFilters: [{ "inst.instanceId": instanceId }],
      }
    );

    // Update Redis role
    await setRedisHash(rolesKey, tid, "listener");

    emit(io, instanceId, "voice:speaker:demoted", { userId: tid });
  });

  socket.on("voice:stage:lock", async ({ instanceId }) => {
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    await setInstanceMeta(instanceId, { lockedStage: 'true' });
    emit(io, instanceId, "voice:stage:locked");
  });

  socket.on("voice:stage:unlock", async ({ instanceId }) => {
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    await setInstanceMeta(instanceId, { lockedStage: 'false' });
    emit(io, instanceId, "voice:stage:unlocked");
  });

  /* =====================================================
     AUDIO STATE
  ===================================================== */

  socket.on("voice:mute:user", async ({ instanceId, userId: targetId }) => {
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);

    // Update Redis
    const mutedKey = RedisKeys.muted(instanceId);
    await setRedisHash(mutedKey, tid, 'true');

    emit(io, instanceId, "voice:user:muted", { userId: tid });
  });

  socket.on("voice:unmute:user", async ({ instanceId, userId: targetId }) => {
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);

    // Update Redis
    const mutedKey = RedisKeys.muted(instanceId);
    await setRedisHash(mutedKey, tid, 'false');

    emit(io, instanceId, "voice:user:unmuted", { userId: tid });
  });

  /* =====================================================
     SPEAKING STATE - Fixed duplication issue
  ===================================================== */

  socket.on("voice:speaking", async ({ instanceId, isSpeaking }) => {
    // 🟡 FIX #2: Check mute state from Redis
    const mutedKey = RedisKeys.muted(instanceId);
    const isMuted = await getRedisHashField(mutedKey, userId);
    
    if (isMuted === 'true') return;

    // Update Redis speaking state
    const speakingKey = RedisKeys.speaking(instanceId);
    await setRedisHash(speakingKey, userId, String(!!isSpeaking));

    // 🔥 FIX #2: Broadcast to room EXCEPT sender socket
    socket.to(roomName(instanceId)).emit("voice:user:speaking", {
      userId,
      isSpeaking: !!isSpeaking,
    });

    // Sync across user's other tabs only (for multi-tab sync)
    const userSockets = await getUserSockets(instanceId, userId);
    for (const targetSocketId of userSockets) {
      if (targetSocketId === socket.id) continue;
      io.to(targetSocketId).emit("voice:user:speaking", {
        userId,
        isSpeaking: !!isSpeaking,
      });
    }
  });

  /* =====================================================
     EPHEMERAL CHAT (INSTANCE-ONLY)
  ===================================================== */

  socket.on("voice:chat:message", async ({ instanceId, message }, cb) => {
    const meta = await getInstanceMeta(instanceId);
    if (!meta.chatEnabled) return;

    // Check chat mute in Redis
    const chatMutedKey = RedisKeys.chatMuted(instanceId);
    const isChatMuted = await redisSetIsMember(chatMutedKey, userId);
    if (isChatMuted) return;

    // Rate limiting (global per server)
    if (!checkRateLimit(instanceId, userId)) {
      return cb?.({ success: false, message: "Rate limited" });
    }

    emit(io, instanceId, "voice:chat:message", {
      id: now(),
      userId,
      message,
      createdAt: new Date().toISOString(),
    });

    cb?.({ success: true });
  });

  socket.on("voice:chat:disable", async ({ instanceId }) => {
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    await setInstanceMeta(instanceId, { chatEnabled: 'false' });
    emit(io, instanceId, "voice:chat:disabled");
  });

  socket.on("voice:chat:enable", async ({ instanceId }) => {
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    await setInstanceMeta(instanceId, { chatEnabled: 'true' });
    emit(io, instanceId, "voice:chat:enabled");
  });

  socket.on("voice:chat:mute:user", async ({ instanceId, userId: targetId }) => {
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    
    // Add to Redis chat muted set
    const chatMutedKey = RedisKeys.chatMuted(instanceId);
    await addToRedisSet(chatMutedKey, tid);

    emit(io, instanceId, "voice:chat:user:muted", { userId: tid });
  });

  socket.on("voice:chat:unmute:user", async ({ instanceId, userId: targetId }) => {
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    
    // Remove from Redis chat muted set
    const chatMutedKey = RedisKeys.chatMuted(instanceId);
    await removeFromRedisSet(chatMutedKey, tid);

    emit(io, instanceId, "voice:chat:user:unmuted", { userId: tid });
  });

  /* =====================================================
     AUDIO RECORDING
  ===================================================== */
  socket.on("voice:recording:start", async ({ instanceId }) => {
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    await setInstanceMeta(instanceId, { recording: 'true' });
    emit(io, instanceId, "voice:recording:started");
  });

  socket.on("voice:recording:stop", async ({ instanceId }) => {
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    await setInstanceMeta(instanceId, { recording: 'false' });

    emit(io, instanceId, "voice:recording:stopped");

    emit(io, instanceId, "voice:recording:ready", {
      replayUrl: `/voices/${meta.voiceId}/replay?instance=${instanceId}`,
    });
  });

  /* =====================================================
     MODERATION
  ===================================================== */
  socket.on("voice:moderation:kick", async ({ instanceId, userId: targetId }) => {
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    
    // Get target socket IDs FIRST before deletion
    const targetSockets = await getUserSockets(instanceId, tid);
    
    // Remove from Redis
    const connectedKey = RedisKeys.connected(instanceId);
    const speakingKey = RedisKeys.speaking(instanceId);
    const mutedKey = RedisKeys.muted(instanceId);

    await removeFromRedisSet(connectedKey, tid);
    await deleteRedisHashField(speakingKey, tid);
    await deleteRedisHashField(mutedKey, tid);
    
    // Remove all sockets for this user
    for (const targetSocketId of targetSockets) {
      await removeUserSocket(instanceId, tid, targetSocketId);
    }
    
    // ❌ Do NOT delete from rolesKey - role persists

    // Notify all participants
    emit(io, instanceId, "voice:user:kicked", { userId: tid });

    // Kick the user's sockets
    for (const targetSocketId of targetSockets) {
      io.to(targetSocketId)?.emit("voice:kicked");
    }
  });

  socket.on("voice:moderation:timeout", async ({ instanceId, userId: targetId, duration }) => {
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    
    // Add to Redis muted set
    const mutedKey = RedisKeys.muted(instanceId);
    await setRedisHash(mutedKey, tid, 'true');

    emit(io, instanceId, "voice:user:timedout", {
      userId: tid,
      until: now() + duration,
    });

    // Auto-unmute after duration
    setTimeout(async () => {
      await setRedisHash(mutedKey, tid, 'false');
      emit(io, instanceId, "voice:user:unmuted", { userId: tid });
    }, duration);
  });

  socket.on("voice:moderation:ban", async ({ instanceId, userId: targetId }) => {
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    
    // Get target socket IDs FIRST before deletion
    const targetSockets = await getUserSockets(instanceId, tid);
    
    // Add to Redis banned set
    const bannedKey = RedisKeys.banned(instanceId);
    await addToRedisSet(bannedKey, tid);

    // Remove from all other sets
    const connectedKey = RedisKeys.connected(instanceId);
    const speakingKey = RedisKeys.speaking(instanceId);
    const mutedKey = RedisKeys.muted(instanceId);

    await removeFromRedisSet(connectedKey, tid);
    await deleteRedisHashField(speakingKey, tid);
    await deleteRedisHashField(mutedKey, tid);
    
    // Remove all sockets for this user
    for (const targetSocketId of targetSockets) {
      await removeUserSocket(instanceId, tid, targetSocketId);
    }
    
    // ❌ Do NOT delete from rolesKey - role persists

    // Notify all participants
    emit(io, instanceId, "voice:user:banned", { userId: tid });

    // Ban the user's sockets
    for (const targetSocketId of targetSockets) {
      io.to(targetSocketId)?.emit("voice:banned");
    }
  });

  /* =====================================================
     WEBRTC SIGNALING - Multi-tab aware
  ===================================================== */

  socket.on("voice:webrtc:offer", async ({ instanceId, to, offer }) => {
    // Guard against malformed packets
    if (!offer || !to) return;
    
    const targetSockets = await getUserSockets(instanceId, String(to));

    for (const targetSocketId of targetSockets) {
      io.to(targetSocketId).emit("voice:webrtc:offer", {
        from: userId,
        offer,
      });
    }
  });

  socket.on("voice:webrtc:answer", async ({ instanceId, to, answer }) => {
    // Guard against malformed packets
    if (!answer || !to) return;
    
    const targetSockets = await getUserSockets(instanceId, String(to));

    for (const targetSocketId of targetSockets) {
      io.to(targetSocketId).emit("voice:webrtc:answer", {
        from: userId,
        answer,
      });
    }
  });

  socket.on("voice:webrtc:ice", async ({ instanceId, to, candidate }) => {
    // Guard against malformed packets
    if (!candidate || !to) return;
    
    const targetSockets = await getUserSockets(instanceId, String(to));

    for (const targetSocketId of targetSockets) {
      io.to(targetSocketId).emit("voice:webrtc:ice", {
        from: userId,
        candidate,
      });
    }
  });

  /* =====================================================
     DEBUG / SAFE INTROSPECTION
  ===================================================== */

  socket.on("voice:debug:state", async ({ instanceId }, cb) => {
    try {
      // Get Redis state
      const connectedKey = RedisKeys.connected(instanceId);
      const rolesKey = RedisKeys.roles(instanceId);
      const speakingKey = RedisKeys.speaking(instanceId);
      const mutedKey = RedisKeys.muted(instanceId);
      const bannedKey = RedisKeys.banned(instanceId);
      const chatMutedKey = RedisKeys.chatMuted(instanceId);
      const requestsKey = RedisKeys.requests(instanceId);
      const metaKey = RedisKeys.meta(instanceId);
      const readyKey = RedisKeys.webrtcReady(instanceId);

      const [connected, roles, speaking, muted, banned, chatMuted, requests, meta, ready] = await Promise.all([
        getRedisSetMembers(connectedKey),
        getRedisHashAll(rolesKey),
        getRedisHashAll(speakingKey),
        getRedisHashAll(mutedKey),
        getRedisSetMembers(bannedKey),
        getRedisSetMembers(chatMutedKey),
        getRedisHashAll(requestsKey),
        getRedisHashAll(metaKey),
        getRedisSetMembers(readyKey),
      ]);

      // Get user socket info for each connected user
      const userSockets = {};
      for (const uid of connected) {
        userSockets[uid] = await getUserSockets(instanceId, uid);
      }

      // Get user instances for this user
      const userInstances = await getUserInstances(userId);

      cb?.({
        redis: {
          connected,
          roles,
          speaking,
          muted,
          banned,
          chatMuted,
          requests,
          meta,
          ready,
          userSockets,
          userInstances,
        },
      });
    } catch (error) {
      log('error', 'Debug state error', { error: error.message });
      cb?.({ error: error.message });
    }
  });

  /* =====================================================
     DEBUG: WebRTC Ready State Inspector (Temporary)
  ===================================================== */

  socket.on("voice:debug:ready", async ({ instanceId }, cb) => {
    try {
      const readyKey = RedisKeys.webrtcReady(instanceId);
      const readyUsers = await getRedisSetMembers(readyKey);
      cb?.({ readyUsers });
    } catch (error) {
      log('error', 'Debug ready error', { error: error.message });
      cb?.({ error: error.message });
    }
  });
};

// Helper function for emitting to room
function emit(io, instanceId, event, payload = {}) {
  io.to(roomName(instanceId)).emit(event, payload);
}