// backend/socket/group.js
/* =====================================================
   GROUP SOCKET HANDLERS (PRODUCTION SAFE)
   - Messaging
   - Typing
   - Reactions
   - Read receipts
   - Presence (via presence.js)
   - Pin / Delete
===================================================== */

const mongoose = require("mongoose");
const Group = require("../models/Group");
const Chat = require("../models/Chat");

/**
 * Presence helpers (GLOBAL truth)
 * DO NOT reimplement presence here
 */
const { isOnline } = require("./presence");

/* =====================================================
   INTERNAL HELPERS
===================================================== */

/**
 * Normalize any possible ID shape into string or null
 */
const normalizeId = (v) => {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") return String(v._id || v.id || v.userId || "");
  return null;
};

/**
 * Validate Mongo ObjectId
 */
const isValidId = (v) => mongoose.Types.ObjectId.isValid(v);

/* =====================================================
   EXPORT SOCKET MODULE
===================================================== */

module.exports = (io, socket) => {
  /* =====================================================
     AUTH GUARD
  ===================================================== */
  const userId = normalizeId(socket.user?.id);
  if (!isValidId(userId)) return;

  /* =====================================================
     JOIN GROUP ROOM
     - joins group room
     - joins chat room
  ===================================================== */
  socket.on("group:join", async ({ groupId }, cb) => {
    try {
      const gid = normalizeId(groupId);
      if (!isValidId(gid)) {
        return cb?.({ success: false, message: "Invalid groupId" });
      }

      const group = await Group.findOne({
        _id: gid,
        isRemoved: false,
        "members.user": userId,
      }).select("_id chat");

      if (!group) {
        return cb?.({
          success: false,
          message: "Not a member or group missing",
        });
      }

      socket.join(`group:${gid}`);

      if (group.chat) {
        socket.join(`chat:${String(group.chat)}`);
      }

      cb?.({
        success: true,
        chatId: group.chat || null,
      });
    } catch (e) {
      console.error("group:join error", e);
      cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
     LEAVE GROUP ROOM
  ===================================================== */
  socket.on("group:leave", ({ groupId }, cb) => {
    const gid = normalizeId(groupId);
    if (!isValidId(gid)) {
      return cb?.({ success: false, message: "Invalid groupId" });
    }

    socket.leave(`group:${gid}`);
    cb?.({ success: true });
  });

  /* =====================================================
     GROUP PRESENCE WHOIS
     - BRIDGE between Group + Presence
     - Returns ONLY online members of this group
  ===================================================== */
  socket.on("group:presence:whois", async ({ groupId }, cb) => {
    try {
      const gid = normalizeId(groupId);
      if (!isValidId(gid)) {
        return cb?.({ success: false, message: "Invalid groupId" });
      }

      const group = await Group.findById(gid).select("members.user");
      if (!group) {
        return cb?.({ success: false, message: "Group not found" });
      }

      const onlineMembers = group.members
        .map((m) => normalizeId(m.user))
        .filter(Boolean)
        .filter((uid) => isOnline(uid))
        .filter((uid) => String(uid) !== String(userId)); // exclude self

      cb?.({
        success: true,
        data: onlineMembers.map((uid) => ({ userId: uid })),
      });
    } catch (e) {
      console.error("group:presence:whois error", e);
      cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
     SEND GROUP MESSAGE
  ===================================================== */
  socket.on("group:message:send", async ({ groupId, payload }, cb) => {
    try {
      const gid = normalizeId(groupId);
      if (!isValidId(gid) || !payload?.ciphertext) return;

      const group = await Group.findOne({
        _id: gid,
        isRemoved: false,
        "members.user": userId,
      }).select("chat");

      if (!group?.chat) return;

      const chat = await Chat.findOne({
        _id: group.chat,
        participants: userId
      });

      if (!chat) return;

      const message = {
        _id: new mongoose.Types.ObjectId(),
        sender: userId,
        ciphertext: payload.ciphertext,
        type: payload.type || "text",
        replyTo: payload.replyTo || null,
        reactions: [],
        readBy: [],
        createdAt: new Date(),
      };

      chat.messages.push(message);
      await chat.save();

      io.to(`chat:${String(group.chat)}`).emit("group:group:new", {
        groupId: gid,
        chatId: String(group.chat),
        message,
      });

      cb?.({ success: true, message });
    } catch (e) {
      console.error("group:message:send error", e);
      cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
     TYPING INDICATORS
  ===================================================== */
  socket.on("group:typing:start", ({ groupId }) => {
    const gid = normalizeId(groupId);
    if (!isValidId(gid)) return;

    socket.to(`group:${gid}`).emit("group:typing:start", {
      groupId: gid,
      userId,
    });
  });

  socket.on("group:typing:stop", ({ groupId }) => {
    const gid = normalizeId(groupId);
    if (!isValidId(gid)) return;

    socket.to(`group:${gid}`).emit("group:typing:stop", {
      groupId: gid,
      userId,
    });
  });

  /* =====================================================
     MESSAGE REACTIONS
  ===================================================== */
  socket.on("group:reaction", async ({ chatId, messageId, emoji }) => {
    try {
      if (!isValidId(chatId) || !isValidId(messageId)) return;

      const cleanEmoji =
        typeof emoji === "string" && emoji.trim()
          ? emoji.trim()
          : null;

      const chat = await Chat.findOne({
        _id: chatId,
        type: "group",
        participants: userId,
      });

      if (!chat) return;

      const msg = chat.messages.id(messageId);
      if (!msg) return;

      msg.reactions = msg.reactions || [];

      // always remove old reaction first
      msg.reactions = msg.reactions.filter(
        (r) => String(r.user) !== String(userId)
      );

      // only add if emoji provided
      if (cleanEmoji) {
        msg.reactions.push({
          user: userId,
          emoji: cleanEmoji,
          reactedAt: new Date(),
        });
      }

      await chat.save();

      // 🔥 RE-FETCH ONLY THIS MESSAGE WITH POPULATED REACTIONS
      const populatedChat = await Chat.findById(chatId)
        .select("messages")
        .populate(
          "messages.reactions.user",
          "profile.fullName profile.avatar fullName avatar"
        );

      const updatedMsg = populatedChat.messages.id(messageId);
      if (!updatedMsg) return;

      io.to(`chat:${chatId}`).emit("group:reaction:update", {
        chatId,
        messageId,
        reactions: updatedMsg.reactions,
      });
    } catch (e) {
      console.error("group:reaction error", e);
    }
  });

  /* =====================================================
     READ RECEIPTS (BATCH)
  ===================================================== */
  socket.on("group:read:batch", async ({ chatId, messageIds }) => {
    try {
      if (!isValidId(chatId)) return;
      if (!Array.isArray(messageIds) || !messageIds.length) return;

      const chat = await Chat.findById(chatId);
      if (!chat) return;

      const updated = [];

      for (const mid of messageIds) {
        if (!isValidId(mid)) continue;

        const msg = chat.messages.id(mid);
        if (!msg) continue;

        // 🧠 Skip messages sent by this user
        if (String(msg.sender) === String(userId)) continue;

        msg.readBy = msg.readBy || [];

        const alreadyRead = msg.readBy.some(
          (r) => String(r.user) === String(userId)
        );

        if (alreadyRead) continue;

        msg.readBy.push({
          user: userId,
          readAt: new Date(),
        });

        updated.push(String(mid));
      }

      if (!updated.length) return;

      await chat.save();

      io.to(`chat:${chatId}`).emit("group:read:batch", {
        chatId,
        messageIds: updated,
        userId,
      });
    } catch (e) {
      console.error("group:read:batch error", e);
    }
  });

  /* =====================================================
     DELETE FOR EVERYONE
  ===================================================== */
  socket.on("group:delete:everyone", async ({ chatId, messageId }, cb) => {
    try {
      if (!isValidId(chatId) || !isValidId(messageId)) {
        return cb?.({ success: false, message: "Invalid IDs" });
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return cb?.({ success: false, message: "Chat not found" });
      }

      const msg = chat.messages.id(messageId);
      if (!msg) {
        return cb?.({ success: false, message: "Message not found" });
      }

      if (String(msg.sender) !== String(userId)) {
        return cb?.({ success: false, message: "Not allowed" });
      }

      msg.isDeletedForEveryone = true;
      msg.deletedAt = new Date();

      await chat.save();

      io.to(`chat:${chatId}`).emit("group:delete:everyone:update", {
        chatId,
        messageId,
      });

      cb?.({ success: true });
    } catch (e) {
      console.error("group:delete:everyone error", e);
      cb?.({ success: false, message: e.message });
    }
  });

  /* =====================================================
     PIN / UNPIN MESSAGE
  ===================================================== */
  socket.on("group:pin", async ({ chatId, messageId }) => {
    try {
      if (!isValidId(chatId) || !isValidId(messageId)) return;

      const chat = await Chat.findById(chatId);
      if (!chat) return;

      chat.pinnedMessage =
        String(chat.pinnedMessage) === String(messageId)
          ? null
          : messageId;

      await chat.save();

      const pinnedMsg =
        chat.messages.id(chat.pinnedMessage) || null;

      io.to(`chat:${chatId}`).emit("group:pin:update", {
        chatId,
        pinnedMessage: pinnedMsg,
      });
    } catch (e) {
      console.error("group:pin error", e);
    }
  });
};
