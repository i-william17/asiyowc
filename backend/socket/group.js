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

const Message = require("../models/Message");
const {
  decryptWithKey,
  decryptChatKey
} = require("../utils/chatCrypto");
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

  if (!isValidId(userId)) {
    return;
  }
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
        socket.join(`group:${gid}`);
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

      const chat = await Chat.findById(group.chat).select(
        "encryptedChatKey chatKeyIv chatKeyTag lastSeq"
      );

      if (!chat) return;

      /* =====================
         SEQUENCE
      ===================== */

      chat.lastSeq = (chat.lastSeq || 0) + 1;

      const createdMessage = await Message.create({
        chatId: chat._id,
        sender: userId,
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        tag: payload.tag,
        type: payload.type || "text",
        replyTo: payload.replyTo || null,
        seq: chat.lastSeq
      });

      chat.lastMessageId = createdMessage._id;
      chat.lastMessageAt = createdMessage.createdAt;
      chat.lastMessageType = createdMessage.type;
      chat.updatedAt = new Date();

      await chat.save();

      const message = await Message.findById(createdMessage._id)
        .populate("sender", "profile.fullName profile.avatar")
        .populate({
          path: "replyTo",
          select: "ciphertext iv tag sender",
          populate: {
            path: "sender",
            select: "profile.fullName profile.avatar"
          }
        })
        .populate("reactions.user", "profile.fullName profile.avatar")
        .lean();

      /* =====================
         DECRYPT MESSAGE
      ===================== */

      try {

        const chatKey = decryptChatKey(
          chat.encryptedChatKey,
          chat.chatKeyIv,
          chat.chatKeyTag
        );

        if (message.ciphertext && message.iv && message.tag) {
          message.ciphertext = decryptWithKey(
            message.ciphertext,
            message.iv,
            message.tag,
            chatKey
          );
        }
        if (
          message.replyTo &&
          message.replyTo.ciphertext &&
          message.replyTo.iv &&
          message.replyTo.tag
        ) {
          message.replyTo.ciphertext = decryptWithKey(
            message.replyTo.ciphertext,
            message.replyTo.iv,
            message.replyTo.tag,
            chatKey
          );
        }
      } catch (err) {
        console.error("Group decrypt failed", err);
      }

      /* =====================
   PUSH (GROUP MESSAGE)
===================== */

      try {

        const senderName =
          socket.user?.profile?.fullName ||
          "Someone";

        const senderAvatar =
          socket.user?.profile?.avatar?.url ||
          null;

        const preview =
          message.type === "text"
            ? (message.ciphertext || "New message").slice(0, 100)
            : "New message";

        const memberIds = await Group.findById(gid).select("members.user");

        const recipientsIds = memberIds.members
          .map(m => normalizeId(m.user))
          .filter(Boolean)
          .filter(uid => String(uid) !== String(userId))
          .filter(uid => !isOnline(uid));

        if (recipientsIds.length) {

          const recipients = await User.find({
            _id: { $in: recipientsIds }
          }).select("pushTokens");

          await Promise.all(
            recipients.map((recipient) =>
              sendExpoPushToUser(recipient, {
                title: senderName,
                body: preview,
                data: {
                  type: "community",
                  groupId: String(gid),
                  chatId: String(chat._id),
                  fullName: senderName,
                  avatar: senderAvatar
                }
              })
            )
          );
        }

      } catch (err) {
        console.error("Group push failed", err);
      }

      io.to(`chat:${String(chat._id)}`).emit("group:message:new", {
        groupId: gid,
        chatId: String(chat._id),
        message,
        seq: chat.lastSeq
      });

      cb?.({ success: true, message });

    } catch (e) {
      console.error("group:message:send error", e);
      cb?.({ success: false });
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

      const msg = await Message.findOne({
        _id: messageId,
        chatId
      });

      if (!msg) return;

      msg.reactions = msg.reactions || [];

      msg.reactions = msg.reactions.filter(
        r => String(r.user) !== String(userId)
      );

      if (cleanEmoji) {
        msg.reactions.push({
          user: userId,
          emoji: cleanEmoji,
          reactedAt: new Date()
        });
      }

      await msg.save();

      /* =====================
   PUSH (GROUP REACTION)
===================== */

      try {

        const populated = await Message.findById(messageId)
          .populate("sender", "profile.fullName profile.avatar")
          .lean();

        if (!populated) return;

        const chat = await Chat.findById(chatId)
          .select("encryptedChatKey chatKeyIv chatKeyTag");

        let preview = "Reacted to a message";

        try {

          const chatKey = decryptChatKey(
            chat.encryptedChatKey,
            chat.chatKeyIv,
            chat.chatKeyTag
          );

          if (populated.ciphertext && populated.iv && populated.tag) {
            preview = decryptWithKey(
              populated.ciphertext,
              populated.iv,
              populated.tag,
              chatKey
            ).slice(0, 80);
          }

        } catch { }

        const senderName =
          socket.user?.profile?.fullName ||
          "Someone";

        const senderAvatar =
          socket.user?.profile?.avatar?.url ||
          null;

        const group = await Group.findOne({ chat: chatId })
          .select("members.user");

        const recipientsIds = group.members
          .map(m => normalizeId(m.user))
          .filter(Boolean)
          .filter(uid => String(uid) !== String(userId))
          .filter(uid => !isOnline(uid));

        if (recipientsIds.length) {

          const recipients = await User.find({
            _id: { $in: recipientsIds }
          }).select("pushTokens");

          await Promise.all(
            recipients.map((recipient) =>
              sendExpoPushToUser(recipient, {
                title: `${senderName} reacted ${emoji || ""}`,
                body: preview,
                data: {
                  type: "community",
                  chatId: String(chatId),
                  groupId: String(group._id),
                  fullName: senderName,
                  avatar: senderAvatar
                }
              })
            )
          );
        }

      } catch (err) {
        console.error("Group reaction push failed", err);
      }

      const populatedMsg = await Message.findById(messageId)
        .populate("reactions.user", "profile.fullName profile.avatar");

      io.to(`chat:${chatId}`).emit("group:reaction:update", {
        chatId,
        messageId,
        reactions: populatedMsg.reactions
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

      await Message.updateMany(
        {
          _id: { $in: messageIds },
          chatId,
          "readBy.user": { $ne: userId }
        },
        {
          $push: {
            readBy: {
              user: userId,
              readAt: new Date()
            }
          }
        }
      );

      io.to(`chat:${chatId}`).emit("group:read:batch", {
        chatId,
        messageIds,
        userId
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
        seq: safeSeq,
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
        return cb?.({ success: false });
      }

      const msg = await Message.findOne({
        _id: messageId,
        chatId
      });

      if (!msg) {
        return cb?.({ success: false });
      }

      if (String(msg.sender) !== String(userId)) {
        return cb?.({ success: false });
      }

      msg.isDeletedForEveryone = true;
      msg.deletedAt = new Date();

      await msg.save();

      io.to(`chat:${chatId}`).emit("group:delete:everyone:update", {
        chatId,
        messageId
      });

      cb?.({ success: true });

    } catch (e) {
      console.error("group:delete:everyone error", e);
      cb?.({ success: false });
    }
  });

  /* =====================================================
   DELETE FOR ME
===================================================== */
  socket.on("group:delete:me", async ({ chatId, messageId }, cb) => {
    try {

      if (!isValidId(chatId) || !isValidId(messageId)) {
        return cb?.({ success: false });
      }

      const msg = await Message.findOne({
        _id: messageId,
        chatId
      });

      if (!msg) {
        return cb?.({ success: false });
      }

      msg.deletedFor = msg.deletedFor || [];

      if (!msg.deletedFor.includes(userId)) {
        msg.deletedFor.push(userId);
      }

      await msg.save();

      /* emit ONLY to that user */
      io.to(`user:${userId}`).emit("group:delete:me:update", {
        chatId,
        messageId
      });

      cb?.({ success: true });

    } catch (e) {
      console.error("group:delete:me error", e);
      cb?.({ success: false });
    }
  });

  /* =====================================================
     PIN / UNPIN MESSAGE
  ===================================================== */
  socket.on("group:pin", async ({ chatId, messageId }, cb) => {
    console.log("PIN EVENT RECEIVED", chatId, messageId);

    try {
      if (!isValidId(chatId) || !isValidId(messageId)) {
        return cb?.({ success: false, message: "Invalid ids" });
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return cb?.({ success: false, message: "Chat not found" });
      }

      chat.pinnedMessage =
        String(chat.pinnedMessage) === String(messageId)
          ? null
          : messageId;

      await chat.save();

      /* =====================
   PUSH (GROUP PIN)
===================== */

      try {

        if (!chat.pinnedMessage) return;

        const msg = await Message.findById(chat.pinnedMessage).lean();

        if (!msg) return;

        let preview = "Pinned a message";

        try {

          const chatKey = decryptChatKey(
            chat.encryptedChatKey,
            chat.chatKeyIv,
            chat.chatKeyTag
          );

          if (msg.ciphertext && msg.iv && msg.tag) {
            preview = decryptWithKey(
              msg.ciphertext,
              msg.iv,
              msg.tag,
              chatKey
            ).slice(0, 80);
          }

        } catch { }

        const senderName =
          socket.user?.profile?.fullName ||
          "Someone";

        const senderAvatar =
          socket.user?.profile?.avatar?.url ||
          null;

        const group = await Group.findOne({ chat: chatId })
          .select("members.user");

        const recipientsIds = group.members
          .map(m => normalizeId(m.user))
          .filter(Boolean)
          .filter(uid => String(uid) !== String(userId))
          .filter(uid => !isOnline(uid));

        if (recipientsIds.length) {

          const recipients = await User.find({
            _id: { $in: recipientsIds }
          }).select("pushTokens");

          await Promise.all(
            recipients.map((recipient) =>
              sendExpoPushToUser(recipient, {
                title: `${senderName} pinned a message`,
                body: preview,
                data: {
                  type: "community",
                  chatId: String(chatId),
                  groupId: String(group._id),
                  fullName: senderName,
                  avatar: senderAvatar
                }
              })
            )
          );
        }

      } catch (err) {
        console.error("Group pin push failed", err);
      }

      const pinnedMsg = chat.pinnedMessage
        ? await Message.findById(chat.pinnedMessage)
          .populate("sender", "profile.fullName profile.avatar")
          .lean()
        : null;

      io.to(`chat:${String(chatId)}`).emit("group:pin:update", {
        chatId: String(chatId),
        pinnedMessage: pinnedMsg,
      });

      return cb?.({
        success: true,
        pinnedMessage: pinnedMsg,
      });
    } catch (e) {
      console.error("group:pin error", e);
      return cb?.({ success: false, message: e.message });
    }
  });
};
