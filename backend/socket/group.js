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
const User = require("../models/User");
const { sendExpoPushToUser } = require("../utils/push");

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

      // increment chat sequence
      chat.lastSeq = (chat.lastSeq || 0) + 1;

      const message = {
        _id: new mongoose.Types.ObjectId(),
        sender: userId,
        ciphertext: payload.ciphertext,
        type: payload.type || "text",
        replyTo: payload.replyTo || null,
        reactions: [],
        readBy: [],
        seq: chat.lastSeq,
        createdAt: new Date(),
      };

      chat.messages.push(message);
      await chat.save();

      /* ================= PUSH NOTIFICATION (OPTIMIZED + AVATAR) ================= */

      const groupDoc = await Group.findById(gid)
        .select("name members.user")
        .lean();

      if (groupDoc?.members?.length) {

        const senderName =
          socket.user?.profile?.fullName ||
          socket.user?.fullName ||
          "Someone";

        const senderAvatar =
          socket.user?.profile?.avatar?.url ||
          socket.user?.avatar ||
          null;

        const preview =
          payload.type === "text"
            ? (payload.ciphertext || "").substring(0, 60)
            : "New message";

        /* ======================================
           Build recipient list
        ====================================== */

        const memberIds = groupDoc.members
          .map((m) => normalizeId(m.user))
          .filter(Boolean)
          .filter((uid) => String(uid) !== String(userId)) // skip sender
          .filter((uid) => !isOnline(uid)); // skip online users

        if (memberIds.length) {

          const recipients = await User.find({
            _id: { $in: memberIds },
          }).select("pushTokens");

          for (const recipient of recipients) {
            await sendExpoPushToUser(recipient, {
              title: groupDoc.name || "Group Message",
              body: `${senderName}: ${preview}`,
              data: {
                type: "community",
                groupId: String(gid),
                chatId: String(group.chat),

                // 🔥 sender metadata for banner UI
                fullName: senderName,
                avatar: senderAvatar,
              },
            });
          }

        }
      }

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

      const updated = [];

      for (const mid of messageIds) {
        if (!isValidId(mid)) continue;

        const result = await Chat.updateOne(
          {
            _id: chatId,
            "messages._id": mid,
            "messages.sender": { $ne: userId }, // skip own messages
            "messages.readBy.user": { $ne: userId }, // 🔥 PREVENT DUPLICATE
          },
          {
            $push: {
              "messages.$.readBy": {
                user: userId,
                readAt: new Date(),
              },
            },
          }
        );

        if (result.modifiedCount > 0) {
          updated.push(String(mid));
        }
      }

      if (!updated.length) return;

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
     READ RECEIPT
  ===================================================== */
  socket.on("group:read", async ({ chatId, seq }, cb) => {
    try {
      if (!isValidId(chatId)) {
        return cb?.({ success: false });
      }

      const chat = await Chat.findOne({
        _id: chatId,
        type: "group",
        participants: userId,
      });

      if (!chat) {
        return cb?.({ success: false });
      }

      // ensure readState exists
      if (!Array.isArray(chat.readState)) {
        chat.readState = [];
      }

      const safeSeq = Math.min(Number(seq || 0), chat.lastSeq || 0);

      let state = chat.readState.find(
        (r) => String(r.user) === String(userId)
      );

      if (state) {
        state.lastReadSeq = Math.max(state.lastReadSeq || 0, safeSeq);
        state.lastReadAt = new Date();
      } else {
        chat.readState.push({
          user: userId,
          lastReadSeq: safeSeq,
          lastReadAt: new Date(),
        });
      }

      await chat.save();

      io.to(`chat:${chatId}`).emit("group:read:update", {
        chatId,
        userId,
        lastReadSeq: safeSeq,
      });

      cb?.({ success: true });

    } catch (err) {
      console.error("group:read error", err);
      cb?.({ success: false });
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

      /* ================= PIN PUSH ================= */
      const group = await Group.findOne({ chat: chatId })
        .select("name members.user")
        .lean();

      if (group?.members?.length) {
        for (const member of group.members) {
          const memberId = String(member.user);
          if (memberId === String(userId)) continue;
          if (isOnline(memberId)) continue;

          const recipient = await User.findById(memberId).select("pushTokens");
          if (!recipient) continue;

          await sendExpoPushToUser(recipient, {
            title: "Pinned Message",
            body: `A message was pinned in ${group.name}`,
            data: {
              type: "community",
              groupId: String(group._id),
              chatId: String(chatId),
            },
          });
        }
      }

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
