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
  userInstances: (userId) => `user:${userId}:voice:instances`,
  timeoutUntil: (instanceId, userId) => `voice:${instanceId}:timeout:${userId}`, // For timeout tracking
};

/* =====================================================
   CONSTANTS
===================================================== */
const CHAT_RATE_LIMIT_MS = 1200;
const SESSION_TTL = 43200; // 12 hours

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
    await redisClient.del(...keys);
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

    // Remove timeout tracking if exists
    const timeoutKey = RedisKeys.timeoutUntil(instanceId, userId);
    await redisDel(timeoutKey);

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
   AUTHORITATIVE SYNC HELPER
===================================================== */

async function emitInstanceSync(io, instanceId) {
  try {
    const roster = await buildRosterFromRedis(instanceId);
    const meta = await getInstanceMeta(instanceId);

    emit(io, instanceId, "voice:instance:sync", {
      instanceId,
      speakers: roster.speakers,
      participants: roster.allParticipants,
      chatEnabled: meta.chatEnabled,
      lockedStage: meta.lockedStage,
    });
  } catch (error) {
    log('error', 'Error emitting instance sync', { error: error.message, instanceId });
  }
}

/* =====================================================
   VOICE INSTANCE CLEANUP
===================================================== */

async function cleanupVoiceInstance(instanceId) {
  try {
    const connectedKey = RedisKeys.connected(instanceId);

    const connectedUsers = await getRedisSetMembers(connectedKey);
    const connectedCount = connectedUsers.length;

    if (connectedCount === 0) {
      // Find all user socket keys for this instance
      const userSocketsPattern = `voice:${instanceId}:user:*:sockets`;
      const userSocketKeys = await redisScanKeys(userSocketsPattern);

      // Find all timeout keys for this instance
      const timeoutPattern = `voice:${instanceId}:timeout:*`;
      const timeoutKeys = await redisScanKeys(timeoutPattern);

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
        ...userSocketKeys,
        ...timeoutKeys,
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
     JOIN
  ===================================================== */

  socket.on("voice:join", async ({ instanceId }, cb) => {
    try {
      if (!instanceId) {
        return cb?.({ success: false, message: "instanceId required" });
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
      const speakingKey = RedisKeys.speaking(instanceId);

      await addToRedisSet(connectedKey, userId);

      // Preserve existing Redis role if it exists
      const existingRole = await getRedisHashField(rolesKey, userId);
      if (!existingRole) {
        await setRedisHash(rolesKey, userId, role);
      }

      // Check for active timeout before setting mute state
      const timeoutKey = RedisKeys.timeoutUntil(instanceId, userId);
      const storedTimeout = await redisClient.get(timeoutKey);
      const nowTimeMs = now();

      if (storedTimeout && parseInt(storedTimeout) > nowTimeMs) {
        // User is still timed out - keep them muted
        await setRedisHash(mutedKey, userId, 'true');
      } else {
        // No active timeout - unmute by default
        await setRedisHash(mutedKey, userId, 'false');
      }

      // Reset speaking state on fresh join
      await deleteRedisHashField(speakingKey, userId);

      // Set TTL on all keys to prevent Redis bloat
      await redisClient.expire(connectedKey, SESSION_TTL);
      await redisClient.expire(rolesKey, SESSION_TTL);
      await redisClient.expire(mutedKey, SESSION_TTL);
      await redisClient.expire(speakingKey, SESSION_TTL);

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

      // Send success response FIRST so client can initialize
      cb?.({
        success: true,
        room: voice,
        instance: instanceData,
        role,
        chatEnabled: meta.chatEnabled,
        lockedStage: meta.lockedStage,
      });

      // AFTER callback, sync authoritative state to all clients
      await emitInstanceSync(io, instanceId);

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

      await deleteRedisHashField(speakingKey, userId);
      await deleteRedisHashField(mutedKey, userId);
    } else if (hadMultipleSockets) {
      log('debug', 'User still has active sockets, preserving state', {
        userId,
        remainingCount: remainingSockets.length
      });
    }

    socket.leave(roomName(instanceId));

    // Sync authoritative state if this was their last socket
    if (remainingSockets.length === 0) {
      await emitInstanceSync(io, instanceId);
    }

    // Cleanup instance if empty
    await cleanupVoiceInstance(instanceId);
  });

  /* =====================================================
     DISCONNECT
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

            await deleteRedisHashField(speakingKey, userId);
            await deleteRedisHashField(mutedKey, userId);

            // Sync authoritative state
            await emitInstanceSync(io, instanceId);
          } else if (hadMultipleSockets) {
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
    if (!instanceId) {
      return cb?.({ success: false, message: "instanceId required" });
    }

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

  socket.on("voice:heartbeat", async ({ instanceId }) => {
    if (!instanceId) return;

    try {
      // Refresh TTLs for all active session keys
      await Promise.all([
        redisClient.expire(RedisKeys.connected(instanceId), SESSION_TTL),
        redisClient.expire(RedisKeys.roles(instanceId), SESSION_TTL),
        redisClient.expire(RedisKeys.muted(instanceId), SESSION_TTL),
        redisClient.expire(RedisKeys.speaking(instanceId), SESSION_TTL),
        redisClient.expire(RedisKeys.meta(instanceId), SESSION_TTL),
        redisClient.expire(RedisKeys.requests(instanceId), SESSION_TTL),
        redisClient.expire(RedisKeys.banned(instanceId), SESSION_TTL),
        redisClient.expire(RedisKeys.chatMuted(instanceId), SESSION_TTL),
      ]).catch(() => { });

      // Also refresh user's socket set TTL
      const userSocketsKey = RedisKeys.userSockets(instanceId, userId);
      await redisClient.expire(userSocketsKey, SESSION_TTL).catch(() => { });

    } catch (error) {
      log('error', 'Heartbeat error', { error: error.message });
    }
  });

  /* =====================================================
     ROLE & STAGE MANAGEMENT
  ===================================================== */

  socket.on("voice:request:speak", async ({ instanceId, meta } = {}) => {
    if (!instanceId) return;

    const rolesKey = RedisKeys.roles(instanceId);
    const currentRole = await getRedisHashField(rolesKey, userId);

    if (currentRole !== "listener") return;

    // Check if stage is locked
    const instanceMeta = await getInstanceMeta(instanceId);
    if (instanceMeta.lockedStage) return;

    // Add to Redis requests
    const requestsKey = RedisKeys.requests(instanceId);
    await setRedisHash(requestsKey, userId, JSON.stringify({ meta: meta || null, timestamp: now() }));
    await redisClient.expire(requestsKey, SESSION_TTL);

    // Get full participant data for the requester
    const roster = await buildRosterFromRedis(instanceId);
    const participant = roster.allParticipants.find(p => String(p._id) === String(userId));

    emit(io, instanceId, "voice:speaker:requested", {
      participant: participant || {
        _id: userId,
        role: 'listener',
        isMuted: false,
        isSpeaking: false,
      },
      meta: meta || null,
    });
  });

  socket.on("voice:approve:speaker", async ({ instanceId, userId: targetId }) => {
    if (!instanceId || !targetId) return;

    // Check if user is host
    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    if (!tid) return;

    // Prevent host from approving themselves (no-op but guard)
    if (tid === userId) return;

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

    // Sync authoritative state to all clients
    await emitInstanceSync(io, instanceId);
  });

  socket.on("voice:decline:speaker", async ({ instanceId, userId: targetId }) => {
    if (!instanceId || !targetId) return;

    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    if (!tid) return;

    // Prevent host from declining themselves (no-op but guard)
    if (tid === userId) return;

    // Remove from requests
    const requestsKey = RedisKeys.requests(instanceId);
    await deleteRedisHashField(requestsKey, tid);

    emit(io, instanceId, "voice:speaker:declined", { userId: tid });
  });

  socket.on("voice:demote:speaker", async ({ instanceId, userId: targetId }) => {
    if (!instanceId || !targetId) return;

    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    if (!tid) return;

    // Prevent host from demoting themselves (no-op but guard)
    if (tid === userId) return;

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

    // Sync authoritative state to all clients
    await emitInstanceSync(io, instanceId);
  });

  socket.on("voice:stage:lock", async ({ instanceId }) => {
    if (!instanceId) return;

    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    await setInstanceMeta(instanceId, { lockedStage: 'true' });

    // Sync authoritative state to all clients
    await emitInstanceSync(io, instanceId);
  });

  socket.on("voice:stage:unlock", async ({ instanceId }) => {
    if (!instanceId) return;

    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    await setInstanceMeta(instanceId, { lockedStage: 'false' });

    // Sync authoritative state to all clients
    await emitInstanceSync(io, instanceId);
  });

  /* =====================================================
     AUDIO STATE
  ===================================================== */

  socket.on("voice:mute:user", async ({ instanceId, userId: targetId }) => {
    if (!instanceId || !targetId) return;

    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    if (!tid) return;

    // Prevent host from muting themselves
    if (tid === userId) return;

    // Update Redis
    const mutedKey = RedisKeys.muted(instanceId);
    await setRedisHash(mutedKey, tid, 'true');
    await redisClient.expire(mutedKey, SESSION_TTL);

    // Clear speaking state when muted
    const speakingKey = RedisKeys.speaking(instanceId);
    await deleteRedisHashField(speakingKey, tid);

    // Send targeted force mute to the user's sockets
    const targetSockets = await getUserSockets(instanceId, tid);
    for (const targetSocketId of targetSockets) {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      targetSocket?.emit("voice:force:mute", {
        instanceId,
      });
    }

    // Sync authoritative state to all clients
    await emitInstanceSync(io, instanceId);
  });

  socket.on("voice:unmute:user", async ({ instanceId, userId: targetId }) => {
    if (!instanceId || !targetId) return;

    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    if (!tid) return;

    // Prevent host from unmuting themselves (no-op but guard)
    if (tid === userId) return;

    // Update Redis
    const mutedKey = RedisKeys.muted(instanceId);
    await setRedisHash(mutedKey, tid, 'false');
    await redisClient.expire(mutedKey, SESSION_TTL);

    // Send targeted force unmute to the user's sockets
    const targetSockets = await getUserSockets(instanceId, tid);
    for (const targetSocketId of targetSockets) {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      targetSocket?.emit("voice:force:unmute", {
        instanceId,
      });
    }

    // Sync authoritative state to all clients
    await emitInstanceSync(io, instanceId);
  });

  /* =====================================================
     SPEAKING STATE
  ===================================================== */

  socket.on("voice:speaking", async ({ instanceId, isSpeaking }) => {
    if (!instanceId) return;

    // Check if user is a speaker (optional guard)
    const rolesKey = RedisKeys.roles(instanceId);
    const role = await getRedisHashField(rolesKey, userId);
    if (role !== "speaker") return; // Only speakers can broadcast speaking state

    // Check mute state from Redis
    const mutedKey = RedisKeys.muted(instanceId);
    const isMuted = await getRedisHashField(mutedKey, userId);

    if (isMuted === 'true') return;

    // Update Redis speaking state
    const speakingKey = RedisKeys.speaking(instanceId);
    await setRedisHash(speakingKey, userId, String(!!isSpeaking));
    await redisClient.expire(speakingKey, SESSION_TTL);

    // Broadcast to room EXCEPT sender socket
    socket.to(roomName(instanceId)).emit("voice:user:speaking", {
      userId,
      isSpeaking: !!isSpeaking,
    });

    // Sync across user's other tabs only (for multi-tab sync)
    const userSockets = await getUserSockets(instanceId, userId);
    for (const targetSocketId of userSockets) {
      if (targetSocketId === socket.id) continue;
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      targetSocket?.emit("voice:user:speaking", {
        userId,
        isSpeaking: !!isSpeaking,
      });
    }
  });

  /* =====================================================
     EPHEMERAL CHAT
  ===================================================== */
  /* =====================================================
     EPHEMERAL CHAT (ENRICHED + TOAST)
  ===================================================== */

  socket.on("voice:chat:message", async ({ instanceId, message }, cb) => {
    if (!instanceId || !message) return;

    const meta = await getInstanceMeta(instanceId);
    if (!meta.chatEnabled) return;

    const chatMutedKey = RedisKeys.chatMuted(instanceId);
    const isChatMuted = await redisSetIsMember(chatMutedKey, userId);
    if (isChatMuted) return;

    if (!checkRateLimit(instanceId, userId)) {
      return cb?.({ success: false, message: "Rate limited" });
    }

    // 🔹 Fetch user profile
    const user = await User.findById(userId)
      .select("profile.fullName profile.avatar")
      .lean();

    const rolesKey = RedisKeys.roles(instanceId);
    const redisRole = await getRedisHashField(rolesKey, userId);

    const isHost = String(meta.hostId) === String(userId);
    const role = isHost ? "host" : (redisRole || "listener");

    const avatar =
      typeof user?.profile?.avatar === "string"
        ? user.profile.avatar
        : user?.profile?.avatar?.url || null;

    const enriched = {
      _id: now(),
      userId,
      userName: user?.profile?.fullName || "Unknown",
      avatar,
      role, // host | speaker | listener
      message,
      createdAt: new Date().toISOString(),
    };

    // 🔹 1️⃣ Sidebar chat stream
    emit(io, instanceId, "voice:chat:message", enriched);

    // 🔹 2️⃣ Bottom screen toast (Google Meet style)
    emit(io, instanceId, "voice:chat:toast", {
      ...enriched,
      ttlMs: 60000, // frontend auto dismiss hint
    });

    cb?.({ success: true });
  });

  socket.on("voice:chat:disable", async ({ instanceId }) => {
    if (!instanceId) return;

    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    await setInstanceMeta(instanceId, { chatEnabled: 'false' });

    // Sync authoritative state to all clients
    await emitInstanceSync(io, instanceId);
  });

  socket.on("voice:chat:enable", async ({ instanceId }) => {
    if (!instanceId) return;

    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    await setInstanceMeta(instanceId, { chatEnabled: 'true' });

    // Sync authoritative state to all clients
    await emitInstanceSync(io, instanceId);
  });

  socket.on("voice:chat:mute:user", async ({ instanceId, userId: targetId }) => {
    if (!instanceId || !targetId) return;

    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    if (!tid) return;

    // Prevent host from chat muting themselves
    if (tid === userId) return;

    // Add to Redis chat muted set
    const chatMutedKey = RedisKeys.chatMuted(instanceId);
    await addToRedisSet(chatMutedKey, tid);
    await redisClient.expire(chatMutedKey, SESSION_TTL);

    emit(io, instanceId, "voice:chat:user:muted", { userId: tid });
  });

  socket.on("voice:chat:unmute:user", async ({ instanceId, userId: targetId }) => {
    if (!instanceId || !targetId) return;

    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    if (!tid) return;

    // Prevent host from chat unmuting themselves (no-op but guard)
    if (tid === userId) return;

    // Remove from Redis chat muted set
    const chatMutedKey = RedisKeys.chatMuted(instanceId);
    await removeFromRedisSet(chatMutedKey, tid);

    emit(io, instanceId, "voice:chat:user:unmuted", { userId: tid });
  });

  /* =====================================================
     AUDIO RECORDING
  ===================================================== */

  socket.on("voice:recording:start", async ({ instanceId }) => {
    if (!instanceId) return;

    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    await setInstanceMeta(instanceId, { recording: 'true' });
    emit(io, instanceId, "voice:recording:started");
  });

  socket.on("voice:recording:stop", async ({ instanceId }) => {
    if (!instanceId) return;

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
    if (!instanceId || !targetId) return;

    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    if (!tid) return;

    // Prevent host from kicking themselves
    if (tid === userId) return;

    // Get target socket IDs FIRST before deletion
    const targetSockets = await getUserSockets(instanceId, tid);

    // Remove from Redis - removeUserSocket will handle connected set removal
    const speakingKey = RedisKeys.speaking(instanceId);
    const mutedKey = RedisKeys.muted(instanceId);
    const requestsKey = RedisKeys.requests(instanceId);
    const timeoutKey = RedisKeys.timeoutUntil(instanceId, tid);

    await deleteRedisHashField(speakingKey, tid);
    await deleteRedisHashField(mutedKey, tid);
    await deleteRedisHashField(requestsKey, tid); // Clear any pending requests
    await redisDel(timeoutKey); // Clear timeout tracking

    // Optional: clear role so it's recomputed from MongoDB on rejoin
    // Comment this out if you want to preserve role
    const rolesKey = RedisKeys.roles(instanceId);
    await deleteRedisHashField(rolesKey, tid);

    // Remove all sockets for this user - this will handle connected set removal
    for (const targetSocketId of targetSockets) {
      await removeUserSocket(instanceId, tid, targetSocketId);
    }

    // Sync authoritative state to all clients
    await emitInstanceSync(io, instanceId);

    // Forcefully remove from socket room and kick each socket
    for (const targetSocketId of targetSockets) {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        // Remove from socket room to prevent further sync events
        targetSocket.leave(roomName(instanceId));

        // Emit kick event with instanceId for verification
        targetSocket.emit("voice:kicked", {
          instanceId
        });

        // Optional: emit terminate event for immediate WebRTC cleanup
        targetSocket.emit("voice:terminate:rtc", {
          instanceId
        });
      }
    }
  });

  socket.on("voice:moderation:timeout", async ({ instanceId, userId: targetId, duration }) => {
    if (!instanceId || !targetId || !duration) return;

    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    if (!tid) return;

    // Prevent host from timing out themselves
    if (tid === userId) return;

    const mutedKey = RedisKeys.muted(instanceId);
    const speakingKey = RedisKeys.speaking(instanceId);
    const timeoutKey = RedisKeys.timeoutUntil(instanceId, tid);
    const timeoutUntil = now() + duration;

    // Store timeout end time in Redis
    await setRedisHash(mutedKey, tid, 'true');
    await redisClient.expire(mutedKey, SESSION_TTL);
    await redisClient.set(timeoutKey, timeoutUntil.toString(), 'EX', Math.ceil(duration / 1000) + 60); // Add 60s buffer

    // Clear speaking state when muted
    await deleteRedisHashField(speakingKey, tid);

    // Send targeted force mute
    const targetSockets = await getUserSockets(instanceId, tid);
    for (const targetSocketId of targetSockets) {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      targetSocket?.emit("voice:force:mute", {
        instanceId,
      });
    }

    // Sync authoritative state
    await emitInstanceSync(io, instanceId);

    emit(io, instanceId, "voice:user:timedout", {
      userId: tid,
      until: timeoutUntil,
    });

    // Auto-unmute after duration with error handling
    setTimeout(async () => {
      try {
        // Check if this timeout is still active (no new timeout overwrote it)
        const storedTimeout = await redisClient.get(timeoutKey);
        if (storedTimeout && parseInt(storedTimeout) === timeoutUntil) {
          // Check if user still exists in Redis (might have left)
          const connectedKey = RedisKeys.connected(instanceId);
          const isConnected = await redisSetIsMember(connectedKey, tid);

          if (isConnected) {
            // Check if user is still muted by this timeout (not manually muted)
            const currentMuteState = await getRedisHashField(mutedKey, tid);
            if (currentMuteState === 'true') {
              await setRedisHash(mutedKey, tid, 'false');

              // Send targeted force unmute
              const updatedSockets = await getUserSockets(instanceId, tid);
              for (const targetSocketId of updatedSockets) {
                const targetSocket = io.sockets.sockets.get(targetSocketId);
                targetSocket?.emit("voice:force:unmute", {
                  instanceId,
                });
              }

              await emitInstanceSync(io, instanceId);
              emit(io, instanceId, "voice:user:unmuted", { userId: tid });
            }
          }
          // Clean up timeout key
          await redisDel(timeoutKey);
        }
      } catch (error) {
        log('error', 'Timeout auto-unmute failed', {
          error: error.message,
          instanceId,
          tid
        });
      }
    }, duration);
  });

  socket.on("voice:moderation:ban", async ({ instanceId, userId: targetId }) => {
    if (!instanceId || !targetId) return;

    const meta = await getInstanceMeta(instanceId);
    if (String(meta.hostId) !== userId) return;

    const tid = safeId(targetId);
    if (!tid) return;

    // Prevent host from banning themselves
    if (tid === userId) return;

    // Get target socket IDs FIRST before deletion
    const targetSockets = await getUserSockets(instanceId, tid);

    // Add to Redis banned set
    const bannedKey = RedisKeys.banned(instanceId);
    await addToRedisSet(bannedKey, tid);
    await redisClient.expire(bannedKey, SESSION_TTL);

    // Remove from all other sets - removeUserSocket will handle connected set
    const speakingKey = RedisKeys.speaking(instanceId);
    const mutedKey = RedisKeys.muted(instanceId);
    const requestsKey = RedisKeys.requests(instanceId);
    const rolesKey = RedisKeys.roles(instanceId);
    const timeoutKey = RedisKeys.timeoutUntil(instanceId, tid);

    await deleteRedisHashField(speakingKey, tid);
    await deleteRedisHashField(mutedKey, tid);
    await deleteRedisHashField(requestsKey, tid);
    await deleteRedisHashField(rolesKey, tid); // Clear role on ban
    await redisDel(timeoutKey); // Clear timeout tracking

    // Remove all sockets for this user - this will handle connected set removal
    for (const targetSocketId of targetSockets) {
      await removeUserSocket(instanceId, tid, targetSocketId);
    }

    // Sync authoritative state to all clients
    await emitInstanceSync(io, instanceId);

    // Ban the user's sockets
    for (const targetSocketId of targetSockets) {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        // Remove from socket room
        targetSocket.leave(roomName(instanceId));

        // Emit ban event with instanceId
        targetSocket.emit("voice:banned", {
          instanceId
        });

        // Optional: emit terminate event for immediate WebRTC cleanup
        targetSocket.emit("voice:terminate:rtc", {
          instanceId
        });
      }
    }
  });

  /* =====================================================
     DEBUG / SAFE INTROSPECTION
  ===================================================== */

  socket.on("voice:debug:state", async ({ instanceId }, cb) => {
    if (!instanceId) return cb?.({ error: "instanceId required" });

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

      const [connected, roles, speaking, muted, banned, chatMuted, requests, meta] = await Promise.all([
        getRedisSetMembers(connectedKey),
        getRedisHashAll(rolesKey),
        getRedisHashAll(speakingKey),
        getRedisHashAll(mutedKey),
        getRedisSetMembers(bannedKey),
        getRedisSetMembers(chatMutedKey),
        getRedisHashAll(requestsKey),
        getRedisHashAll(metaKey),
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
          userSockets,
          userInstances,
        },
      });
    } catch (error) {
      log('error', 'Debug state error', { error: error.message });
      cb?.({ error: error.message });
    }
  });
};

// Helper function for emitting to room
function emit(io, instanceId, event, payload = {}) {
  io.to(roomName(instanceId)).emit(event, payload);
}