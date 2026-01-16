// backend/socket/voice.js
const Voice = require("../models/Voice");

/* =====================================================
   EPHEMERAL IN-MEMORY VOICE INSTANCE SESSIONS
===================================================== */

/**
 * voiceInstanceSessions (GLOBAL, EPHEMERAL)
 *
 * Map<instanceId, {
 *   voiceId: string,                  // Parent voice document ID
 *   hostId: string,
 *   chatEnabled: boolean,
 *   lockedStage: boolean,
 *   mutedUsers: Set<string>,           // chat-muted users
 *   createdAt: number,
 *   participants: Map<string, {
 *     role: "speaker" | "listener",
 *     isMuted: boolean,
 *     isSpeaking: boolean,
 *     joinedAt: number,
 *     lastActiveAt: number,
 *     socketId: string
 *   }>,
 *   rateLimit: Map<string, number>     // chat rate limiting
 * }>
 */
const voiceInstanceSessions = new Map();

const CHAT_RATE_LIMIT_MS = 1200;
const HEARTBEAT_TIMEOUT_MS = 30000;

/* =====================================================
   HELPERS
===================================================== */

const now = () => Date.now();
const roomName = (instanceId) => `voice:${instanceId}`;
const safeId = (id) => (id ? String(id) : null);

function ensureSession(instanceId, voiceId, hostId) {
  if (!voiceInstanceSessions.has(instanceId)) {
    voiceInstanceSessions.set(instanceId, {
      voiceId: String(voiceId),
      hostId: String(hostId),
      chatEnabled: true,
      lockedStage: false,
      mutedUsers: new Set(),
      createdAt: now(),
      participants: new Map(),
      rateLimit: new Map(),
    });
  }
  return voiceInstanceSessions.get(instanceId);
}

function getSession(instanceId) {
  return voiceInstanceSessions.get(instanceId);
}

function isHost(session, userId) {
  return session && String(session.hostId) === String(userId);
}

function emit(io, instanceId, event, payload = {}) {
  io.to(roomName(instanceId)).emit(event, payload);
}

function cleanupIfEmpty(instanceId) {
  const session = voiceInstanceSessions.get(instanceId);
  if (session && session.participants.size === 0) {
    voiceInstanceSessions.delete(instanceId);
  }
}

/* =====================================================
   VOICE INSTANCE SOCKET HANDLER
===================================================== */
module.exports = function voiceSocket(io, socket) {
  if (!socket.user?.id) return;

  const userId = String(socket.user.id);

  /* =====================================================
     JOIN / LEAVE / DISCONNECT
  ===================================================== */

  socket.on("voice:join", async ({ instanceId }, cb) => {
    try {
      if (!instanceId) {
        return cb?.({ success: false, message: "instanceId required" });
      }

      // 🔍 Find the voice document containing this instance
      const voice = await Voice.findOne({
        "instances.instanceId": instanceId,
        isRemoved: false,
      })
        .populate("host", "profile.fullName profile.avatar")
        .lean();

      if (!voice) {
        return cb?.({ success: false, message: "Voice instance not found" });
      }

      // Find the specific instance
      const instance = voice.instances.find(
        (i) => String(i.instanceId) === String(instanceId)
      );

      if (!instance || instance.status !== "live") {
        return cb?.({ success: false, message: "Instance not live" });
      }

      // Create/get session for this instance
      const session = ensureSession(
        instanceId,
        voice._id,
        voice.host._id
      );

      // Determine role (host is speaker, others are listeners initially)
      const role =
        String(voice.host._id) === userId ? "speaker" : "listener";

      // Join the socket room for this instance
      socket.join(roomName(instanceId));

      // Add participant to session
      session.participants.set(userId, {
        role,
        isMuted: false,
        isSpeaking: false,
        joinedAt: now(),
        lastActiveAt: now(),
        socketId: socket.id,
      });

      // Prepare instance data
      const instanceData = {
        id: instanceId,
        voiceId: voice._id,
        speakers: Array.from(session.participants.entries())
          .filter(([, p]) => p.role === "speaker")
          .map(([uid]) => uid),
        participants: Array.from(session.participants.entries()).map(
          ([uid, p]) => ({
            _id: uid,
            role: p.role,
            isMuted: p.isMuted,
            isSpeaking: p.isSpeaking,
          })
        ),
      };

      // Notify others in the instance
      emit(io, instanceId, "voice:user:joined", { userId, role });

      // Send response to joining user
      cb?.({
        success: true,
        room: voice,                 // ✅ Full voice document
        instance: instanceData,      // ✅ Instance-specific data
        role,
        chatEnabled: session.chatEnabled,
        lockedStage: session.lockedStage,
      });

      // 🔥 FORCE HYDRATION EVENT (FIX FOR REDUX)
      emit(io, instanceId, "voice:room:hydrated", {
        room: voice,
        instance: instanceData,
      });

    } catch (e) {
      console.error("Voice join error:", e);
      cb?.({ success: false, message: e.message });
    }
  });

  socket.on("voice:leave", ({ instanceId }) => {
    const session = getSession(instanceId);
    if (!session) return;

    socket.leave(roomName(instanceId));
    session.participants.delete(userId);
    session.rateLimit.delete(userId);
    session.mutedUsers.delete(userId);

    emit(io, instanceId, "voice:user:left", { userId });
    cleanupIfEmpty(instanceId);
  });

  socket.on("disconnect", () => {
    voiceInstanceSessions.forEach((session, instanceId) => {
      if (session.participants.has(userId)) {
        session.participants.delete(userId);
        session.rateLimit.delete(userId);
        session.mutedUsers.delete(userId);

        emit(io, instanceId, "voice:user:left", { userId });
        cleanupIfEmpty(instanceId);
      }
    });
  });

  socket.on("voice:reconnect", async ({ instanceId }, cb) => {
    try {
      const session = getSession(instanceId);
      if (!session) return cb?.({ success: false });

      const participant = session.participants.get(userId);
      if (!participant) return cb?.({ success: false });

      // Find the voice document
      const voice = await Voice.findOne({
        "instances.instanceId": instanceId,
        isRemoved: false,
      })
        .populate("host", "profile.fullName profile.avatar")
        .lean();

      if (!voice) {
        return cb?.({ success: false, message: "Voice instance not found" });
      }

      // Update socket ID and activity
      participant.socketId = socket.id;
      participant.lastActiveAt = now();

      // Prepare instance data
      const instanceData = {
        id: instanceId,
        voiceId: voice._id,
        speakers: Array.from(session.participants.entries())
          .filter(([, p]) => p.role === "speaker")
          .map(([uid]) => uid),
        participants: Array.from(session.participants.entries()).map(
          ([uid, p]) => ({
            _id: uid,
            role: p.role,
            isMuted: p.isMuted,
            isSpeaking: p.isSpeaking,
          })
        ),
      };

      // Send response to reconnecting user
      cb?.({
        success: true,
        room: voice,                 // ✅ Full voice document
        instance: instanceData,      // ✅ Instance-specific data
        role: participant.role,
        chatEnabled: session.chatEnabled,
        lockedStage: session.lockedStage,
      });

      // 🔥 FORCE HYDRATION EVENT (FIX FOR REDUX - RECONNECT)
      emit(io, instanceId, "voice:room:hydrated", {
        room: voice,
        instance: instanceData,
      });

    } catch (e) {
      console.error("Voice reconnect error:", e);
      cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
     HEARTBEAT / PRESENCE
  ===================================================== */

  socket.on("voice:heartbeat", ({ instanceId }) => {
    const session = getSession(instanceId);
    const me = session?.participants.get(userId);
    if (me) me.lastActiveAt = now();
  });

  /* =====================================================
     ROLE & STAGE MANAGEMENT
  ===================================================== */

  socket.on("voice:request:speak", ({ instanceId }) => {
    const session = getSession(instanceId);
    if (!session || session.lockedStage) return;

    emit(io, instanceId, "voice:speaker:requested", { userId });
  });

  socket.on("voice:approve:speaker", ({ instanceId, userId: targetId }) => {
    const session = getSession(instanceId);
    if (!isHost(session, userId)) return;

    const target = session.participants.get(safeId(targetId));
    if (!target) return;

    target.role = "speaker";
    emit(io, instanceId, "voice:speaker:approved", { userId: targetId });
  });

  socket.on("voice:demote:speaker", ({ instanceId, userId: targetId }) => {
    const session = getSession(instanceId);
    if (!isHost(session, userId)) return;

    const target = session.participants.get(safeId(targetId));
    if (!target) return;

    target.role = "listener";
    target.isSpeaking = false;

    emit(io, instanceId, "voice:speaker:demoted", { userId: targetId });
  });

  socket.on("voice:stage:lock", ({ instanceId }) => {
    const session = getSession(instanceId);
    if (!isHost(session, userId)) return;

    session.lockedStage = true;
    emit(io, instanceId, "voice:stage:locked");
  });

  socket.on("voice:stage:unlock", ({ instanceId }) => {
    const session = getSession(instanceId);
    if (!isHost(session, userId)) return;

    session.lockedStage = false;
    emit(io, instanceId, "voice:stage:unlocked");
  });

  /* =====================================================
     AUDIO STATE (SIGNAL ONLY)
  ===================================================== */

  socket.on("voice:mute:user", ({ instanceId, userId: targetId }) => {
    const session = getSession(instanceId);
    if (!isHost(session, userId)) return;

    const target = session.participants.get(safeId(targetId));
    if (!target) return;

    target.isMuted = true;
    emit(io, instanceId, "voice:user:muted", { userId: targetId });
  });

  socket.on("voice:unmute:user", ({ instanceId, userId: targetId }) => {
    const session = getSession(instanceId);
    if (!isHost(session, userId)) return;

    const target = session.participants.get(safeId(targetId));
    if (!target) return;

    target.isMuted = false;
    emit(io, instanceId, "voice:user:unmuted", { userId: targetId });
  });

  socket.on("voice:speaking", ({ instanceId, isSpeaking }) => {
    const session = getSession(instanceId);
    const me = session?.participants.get(userId);
    if (!me || me.isMuted) return;

    me.isSpeaking = !!isSpeaking;

    socket.to(roomName(instanceId)).emit("voice:user:speaking", {
      userId,
      isSpeaking: me.isSpeaking,
    });
  });

  /* =====================================================
     EPHEMERAL CHAT (INSTANCE-ONLY)
  ===================================================== */

  socket.on("voice:chat:message", ({ instanceId, message }, cb) => {
    const session = getSession(instanceId);
    if (!session || !session.chatEnabled) return;
    if (session.mutedUsers.has(userId)) return;

    const last = session.rateLimit.get(userId) || 0;
    if (now() - last < CHAT_RATE_LIMIT_MS) return;

    session.rateLimit.set(userId, now());

    emit(io, instanceId, "voice:chat:message", {
      id: now(),
      userId,
      message,
      createdAt: new Date().toISOString(),
    });

    cb?.({ success: true });
  });

  socket.on("voice:chat:disable", ({ instanceId }) => {
    const session = getSession(instanceId);
    if (!isHost(session, userId)) return;

    session.chatEnabled = false;
    emit(io, instanceId, "voice:chat:disabled");
  });

  socket.on("voice:chat:enable", ({ instanceId }) => {
    const session = getSession(instanceId);
    if (!isHost(session, userId)) return;

    session.chatEnabled = true;
    emit(io, instanceId, "voice:chat:enabled");
  });

  socket.on("voice:chat:mute:user", ({ instanceId, userId: targetId }) => {
    const session = getSession(instanceId);
    if (!isHost(session, userId)) return;

    session.mutedUsers.add(safeId(targetId));
    emit(io, instanceId, "voice:chat:user:muted", { userId: targetId });
  });

  socket.on("voice:chat:unmute:user", ({ instanceId, userId: targetId }) => {
    const session = getSession(instanceId);
    if (!isHost(session, userId)) return;

    session.mutedUsers.delete(safeId(targetId));
    emit(io, instanceId, "voice:chat:user:unmuted", { userId: targetId });
  });

  /* =====================================================
     AUDIO RECORDING
  ===================================================== */
  socket.on("voice:recording:start", ({ instanceId }) => {
    const session = getSession(instanceId);
    if (!isHost(session, userId)) return;

    session.isRecording = true;
    emit(io, instanceId, "voice:recording:started");
  });

  socket.on("voice:recording:stop", async ({ instanceId }) => {
    const session = getSession(instanceId);
    if (!isHost(session, userId)) return;

    session.isRecording = false;

    // SFU / Media service handles actual audio merge
    emit(io, instanceId, "voice:recording:stopped");

    emit(io, instanceId, "voice:recording:ready", {
      replayUrl: `/voices/${session.voiceId}/replay?instance=${instanceId}`,
    });
  });

  /* =====================================================
     MODERATION
  ===================================================== */
  socket.on("voice:moderation:kick", ({ instanceId, userId: targetId }) => {
    const session = getSession(instanceId);
    if (!isHost(session, userId)) return;

    const targetSocketId = session.participants.get(targetId)?.socketId;
    session.participants.delete(targetId);

    emit(io, instanceId, "voice:user:kicked", { userId: targetId });
    
    // Disconnect the kicked user's socket
    if (targetSocketId) {
      io.to(targetSocketId)?.emit("voice:kicked");
    }
  });

  socket.on("voice:moderation:timeout", ({ instanceId, userId: targetId, duration }) => {
    const session = getSession(instanceId);
    if (!isHost(session, userId)) return;

    session.mutedUsers.add(targetId);

    emit(io, instanceId, "voice:user:timedout", {
      userId: targetId,
      until: now() + duration,
    });
  });

  socket.on("voice:moderation:ban", ({ instanceId, userId: targetId }) => {
    const session = getSession(instanceId);
    if (!isHost(session, userId)) return;

    session.bannedUsers = session.bannedUsers || new Set();
    session.bannedUsers.add(targetId);

    emit(io, instanceId, "voice:user:banned", { userId: targetId });
  });

  /* =====================================================
     WEBRTC SIGNALING (NO MEDIA STREAMS)
  ===================================================== */

  socket.on("voice:webrtc:offer", ({ to, offer }) => {
    io.to(to).emit("voice:webrtc:offer", { from: userId, offer });
  });

  socket.on("voice:webrtc:answer", ({ to, answer }) => {
    io.to(to).emit("voice:webrtc:answer", { from: userId, answer });
  });

  socket.on("voice:webrtc:ice", ({ to, candidate }) => {
    io.to(to).emit("voice:webrtc:ice", { from: userId, candidate });
  });

  /* =====================================================
     DEBUG / SAFE INTROSPECTION
  ===================================================== */

  socket.on("voice:debug:state", ({ instanceId }, cb) => {
    const session = getSession(instanceId);
    if (!session) return cb?.(null);

    cb?.({
      voiceId: session.voiceId,
      hostId: session.hostId,
      chatEnabled: session.chatEnabled,
      lockedStage: session.lockedStage,
      participants: Array.from(session.participants.entries()),
    });
  });
};