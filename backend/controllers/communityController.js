// controllers/communityController.js
const mongoose = require('mongoose');

const Group = require('../models/Group');
const User = require('../models/User');
const Hub = require('../models/Hub');
const Chat = require('../models/Chat');
const Voice = require('../models/Voice');
const Report = require('../models/Report');
const Post = require('../models/Post');

/* =====================================================
   HELPERS
===================================================== */
const normalizeId = (v) =>
  typeof v === 'object' && v !== null ? v._id || v.id : v;

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const ok = (res, data = null, message = null, extra = {}) =>
  res.json({ success: true, message, data, ...extra });

const created = (res, data = null, message = null, extra = {}) =>
  res.status(201).json({ success: true, message, data, ...extra });

const bad = (res, message = 'Bad request', extra = {}) =>
  res.status(400).json({ success: false, message, ...extra });

const forbidden = (res, message = 'Forbidden', extra = {}) =>
  res.status(403).json({ success: false, message, ...extra });

const notFound = (res, message = 'Not found', extra = {}) =>
  res.status(404).json({ success: false, message, ...extra });

const serverError = (res, error) =>
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: error?.message || String(error)
  });

const pick = (obj, allowed) => {
  const out = {};
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
};

const parsePage = (req) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const hasRole = (user, roles = []) => roles.includes(user?.role);

const ensureAuthUser = (req, res) => {
  if (!req.user || !req.user.id) {
    bad(res, 'Unauthorized');
    return null;
  }
  return req.user;
};

const ensureObjectIdParam = (res, id, label = 'id') => {
  if (!isValidObjectId(id)) {
    bad(res, `Invalid ${label}`);
    return false;
  }
  return true;
};

const normalizeDmParticipants = (userId, participants = []) => {
  const ids = [...new Set([userId, ...participants])]
    .map(String)
    .filter(Boolean)
    .sort(); // IMPORTANT for uniqueness stability
  return ids;
};

const ensureGroupVisibility = async (group, userId) => {
  if (!group) return { ok: false, code: 404, message: 'Group not found' };

  if (group.isRemoved) return { ok: false, code: 404, message: 'Group not found' };

  // Public: anyone can view
  if (group.privacy === 'public') return { ok: true };

  // Private: must be member
  if (group.privacy === 'private') return { ok: true };

  // 🔒 System groups (GBV, etc.)
  if (group.privacy === 'system') return { ok: true };

  // Private/invite: must be member/admin/creator
  const isMember = group.members.some(
    (m) => String(m.user?._id || m.user) === String(user.id)
  );



  const isAdmin = group.admins.some((a) => String(a) === String(userId));
  const isCreator = String(group.createdBy) === String(userId);

  if (!isMember && !isAdmin && !isCreator) {
    return { ok: false, code: 403, message: 'Access denied' };
  }

  return { ok: true };
};

const isGroupAdminOrCreator = (group, userId) => {
  const isAdmin = group.admins.some((a) => String(a) === String(userId));
  const isCreator = String(group.createdBy) === String(userId);
  return isAdmin || isCreator;
};

const isHubModeratorOrAdmin = (hub, user) => {
  if (!hub) return false;
  if (hasRole(user, ['admin'])) return true;
  return hub.moderators?.some((m) => String(m) === String(user.id));
};


const ensureGroupChatExistsAndSynced = async (group) => {
  let chat = null;

  if (group.chat) {
    chat = await Chat.findById(group.chat);
  }

  // 🔒 Normalize member IDs safely
  const memberIds = group.members
    .map((m) => (typeof m === 'object' ? m.user : m))
    .filter(Boolean)
    .map(String);

  if (!chat || chat.isRemoved) {
    chat = await Chat.create({
      type: 'group',
      participants: memberIds,
      messages: []
    });

    group.chat = chat._id;
    await group.save();
    return chat;
  }

  const chatParticipants = chat.participants.map(String);

  const toAdd = memberIds.filter((id) => !chatParticipants.includes(id));
  const toRemove = chatParticipants.filter((id) => !memberIds.includes(id));

  if (toAdd.length || toRemove.length) {
    await Chat.updateOne(
      { _id: chat._id },
      {
        ...(toAdd.length && { $addToSet: { participants: { $each: toAdd } } }),
        ...(toRemove.length && { $pull: { participants: { $in: toRemove } } }),
        $set: { updatedAt: new Date() }
      }
    );
  }

  return chat;
};

const sliceMessagesProjection = (skip, limit) => ({
  messages: { $slice: [skip, limit] }
});

/* =====================================================
   GROUPS
===================================================== */

// 1. Create group
exports.createGroup = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { name, description, avatar, privacy = 'public' } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return bad(res, 'Group name is required');
    }

    if (privacy && !['public', 'private', 'invite', 'system'].includes(privacy)) {
      return bad(res, 'Invalid privacy value');
    }

    const existingGroup = await Group.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      isRemoved: false
    });

    if (existingGroup) {
      return bad(res, 'Group name already exists');
    }

    const group = await Group.create({
      name: name.trim(),
      description: typeof description === 'string' ? description : '',
      avatar: avatar || null,
      createdBy: user.id,
      admins: [user.id],
      members: [
        {
          user: user.id,
          joinedAt: new Date()
        }
      ],

      privacy
    });

    // Ensure a group chat exists immediately
    await ensureGroupChatExistsAndSynced(group);

    return created(res, group, 'Group created');
  } catch (error) {
    return serverError(res, error);
  }
};

// 2. Get groups
exports.getGroups = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { page, limit, skip } = parsePage(req);
    const mine = String(req.query.mine || 'false') === 'true';

    const query = {
      isRemoved: false,
      isArchived: false,
      privacy: { $ne: 'system' },
      ...(mine
        ? { 'members.user': user.id }
        : { privacy: 'public' })
    };

    const [groups, total] = await Promise.all([
      Group.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          'name description avatar privacy members chat createdAt'
        ),

      Group.countDocuments(query)
    ]);

    const data = groups.map((g) => {
      const isMember = g.members.some(
        (m) => String(m.user) === String(user.id)
      );

      return {
        _id: g._id,
        name: g.name,
        description: g.description,
        avatar: g.avatar,
        privacy: g.privacy,
        membersCount: g.members.length,
        isMember,
        chatId: g.chat // ✅ AUTHORITATIVE SOURCE
      };
    });

    return ok(res, data, null, {
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[getGroups]', error);
    return serverError(res, error);
  }
};


// 3. Get group by id (full group info)
exports.getGroupById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return bad(res, 'Invalid group ID');
    }

    const group = await Group.findOne({
      _id: groupId,
      isRemoved: false
    })
      .populate('createdBy', 'profile.fullName profile.avatar')
      .populate('admins', 'profile.fullName profile.avatar')
      .populate('members.user', 'profile.fullName profile.avatar');

    if (!group) return notFound(res, 'Group not found');

    const isMember = group.members.some(
      (m) => String(m.user?._id) === String(userId)
    );

    const isAdmin =
      String(group.createdBy?._id) === String(userId) ||
      group.admins.some((a) => String(a._id) === String(userId));

    const members = group.members.map((m) => ({
      _id: m.user?._id,
      fullName: m.user?.profile?.fullName,
      avatar: m.user?.profile?.avatar,
      joinedAt: m.joinedAt
    }));

    return ok(res, {
      ...group.toObject(),
      members,
      isMember,
      isAdmin,
      membersCount: members.length,
      chatId: group.chat || null
    });
  } catch (err) {
    return serverError(res, err);
  }
};

// 4. Join group
exports.joinGroup = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { groupId } = req.params;

    console.log('[joinGroup]', { groupId, userId });
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return bad(res, 'Invalid group ID');
    }

    const group = await Group.findOne({
      _id: groupId,
      isRemoved: false
    });

    if (!group) return notFound(res, 'Group not found');

    const alreadyMember = group.members.some(
      (m) => String(m.user) === String(userId)
    );

    if (alreadyMember) {
      return bad(res, 'User already a member of this group');
    }

    group.members.push({
      user: userId,
      joinedAt: new Date()
    });

    await group.save();

    // ✅ AUTHORITATIVE chat creation
    const chat = await ensureGroupChatExistsAndSynced(group);

    return ok(res, {
      _id: group._id,
      isMember: true,
      chatId: chat._id,
      membersCount: group.members.length
    });
  } catch (err) {
    console.error('[joinGroup]', err);
    return serverError(res, err);
  }
};

// 6. Leave group
exports.leaveGroup = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { groupId } = req.params;

    console.log("[leaveGroup] userId:", userId);
    console.log("[leaveGroup] groupId:", groupId);

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID",
      });
    }

    const group = await Group.findOne({
      _id: groupId,
      isRemoved: false,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const wasMember = group.members.some(
      (m) => String(m.user) === String(userId)
    );

    if (!wasMember) {
      return res.status(400).json({
        success: false,
        message: "User is not a member of this group",
      });
    }

    group.members = group.members.filter(
      (m) => String(m.user) !== String(userId)
    );

    await group.save();
    await ensureGroupChatExistsAndSynced(group);

    res.json({
      success: true,
      data: {
        _id: group._id,
        isMember: false,
        chatId: null,
        membersCount: group.members.length,
      },
    });
  } catch (err) {
    console.error("[leaveGroup] ❌ ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error leaving group",
    });
  }
};

// 7. Update group
exports.updateGroup = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { groupId } = req.params;
    if (!ensureObjectIdParam(res, groupId, 'groupId')) return;

    const group = await Group.findOne({ _id: groupId, isRemoved: false });
    if (!group) return notFound(res, 'Group not found');

    if (!isGroupAdminOrCreator(group, user.id)) {
      return forbidden(res, 'Only group admins can update the group');
    }

    const allowed = pick(req.body, ['name', 'description', 'avatar', 'privacy', 'isArchived']);
    if (allowed.privacy && !['public', 'private', 'invite', 'system'].includes(allowed.privacy)) {
      return bad(res, 'Invalid privacy value');
    }

    if (allowed.name && typeof allowed.name === 'string') {
      allowed.name = allowed.name.trim();
      if (allowed.name.length < 2) return bad(res, 'Group name too short');

      const exists = await Group.findOne({
        _id: { $ne: groupId },
        name: { $regex: new RegExp(`^${allowed.name}$`, 'i') },
        isRemoved: false
      });

      if (exists) return bad(res, 'Another group with this name already exists');
    }

    Object.assign(group, allowed);
    await group.save();

    return ok(res, group, 'Group updated');
  } catch (error) {
    return serverError(res, error);
  }
};

// 9. Delete group (soft delete)
exports.deleteGroup = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { groupId } = req.params;
    if (!ensureObjectIdParam(res, groupId, 'groupId')) return;

    const group = await Group.findOne({ _id: groupId, isRemoved: false });
    if (!group) return notFound(res, 'Group not found');

    const isCreator = String(group.createdBy) === String(user.id);
    if (!isCreator && !hasRole(user, ['admin'])) {
      return forbidden(res, 'Only the creator (or admin) can delete this group');
    }

    group.isRemoved = true;
    await group.save();

    return ok(res, null, 'Group deleted');
  } catch (error) {
    return serverError(res, error);
  }
};

/* =====================================================
   GET GROUP CONVERSATION (groupId → chatId)
   Used when opening group
===================================================== */
exports.getGroupConversation = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return bad(res, "Invalid groupId");
    }

    /* =============================
       1️⃣ LOAD GROUP
    ============================== */
    const group = await Group.findOne({
      _id: groupId,
      isRemoved: false,
    })
      .populate("members.user", "profile.fullName profile.avatar")
      .populate("admins", "profile.fullName profile.avatar");

    if (!group) return notFound(res, "Group not found");

    /* =============================
       2️⃣ ACCESS CHECK
    ============================== */
    const vis = await ensureGroupVisibility(group, user.id);
    if (!vis.ok) {
      return vis.code === 403
        ? forbidden(res, vis.message)
        : notFound(res, vis.message);
    }

    /* =============================
       3️⃣ ENSURE CHAT EXISTS
    ============================== */
    const chat = await ensureGroupChatExistsAndSynced(group);

    /* =============================
       4️⃣ RETURN AS UNIT
    ============================== */
    return ok(res, {
      group,
      chatId: chat._id,
    });
  } catch (error) {
    console.error("[getGroupConversation]", error);
    return serverError(res, error);
  }
};

/* =====================================================
   GROUP CONVERSATION BY CHAT ID
   🔥 RETURNS: group + chat + messages (UNIT)
===================================================== */
exports.getGroupConversationByChatId = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { chatId } = req.params;
    const { before, limit = 30 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return bad(res, "Invalid chatId");
    }

    /* =============================
       1️⃣ LOAD CHAT
    ============================== */
    const chat = await Chat.findOne({
      _id: chatId,
      type: "group",
      participants: user.id,
      isRemoved: false,
    });

    if (!chat) return notFound(res, "Chat not found");

    let messages = chat.messages || [];

    /* =============================
       2️⃣ SORT NEWEST FIRST
    ============================== */
    messages.sort((a, b) => b.createdAt - a.createdAt);

    /* =============================
       3️⃣ CURSOR PAGINATION
    ============================== */
    if (before) {
      const index = messages.findIndex(
        (m) => String(m._id) === String(before)
      );

      if (index !== -1) {
        messages = messages.slice(index + 1);
      }
    }

    /* =============================
       4️⃣ LIMIT
    ============================== */
    messages = messages.slice(0, Number(limit));

    /* =============================
       5️⃣ RETURN OLDEST → NEWEST
    ============================== */
    messages.reverse();

    /* =============================
       6️⃣ POPULATE MESSAGES
    ============================== */
    const populatedMessages = await Chat.populate(messages, [
      {
        path: "sender",
        select: "profile.fullName profile.avatar",
      },
      {
        path: "replyTo",
        populate: {
          path: "sender",
          select: "profile.fullName profile.avatar",
        },
      },
      {
        path: "reactions.user",
        select: "profile.fullName profile.avatar",
      },
    ]);

    /* =============================
       🔥 7️⃣ FIND GROUP USING CHAT ID
       (CRITICAL FIX FOR YOUR SCHEMA)
    ============================== */
    const group = await Group.findOne({
      chat: chat._id,
      isRemoved: false,
    })
      .populate("members.user", "profile.fullName profile.avatar")
      .populate("admins", "profile.fullName profile.avatar");

    if (!group) return notFound(res, "Group not found");

    /* =============================
       8️⃣ FINAL RESPONSE (UNIT)
    ============================== */
    return ok(res, {
      group,
      chat: {
        _id: chat._id,
        pinnedMessage: chat.pinnedMessage || null,
        messages: populatedMessages,
      },
    });
  } catch (err) {
    console.error("[getGroupConversationByChatId]", err);
    return serverError(res, err);
  }
};

// 5. Send message in group chat
exports.sendGroupMessage = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { groupId, chatId } = req.params;
    if (!ensureObjectIdParam(res, groupId, 'groupId')) return;
    if (!ensureObjectIdParam(res, chatId, 'chatId')) return;

    const chat = await Chat.findOneAndUpdate(
      {
        _id: chatId,
        type: 'group',
        isRemoved: false,
        participants: user.id
      },
      {
        $push: {
          messages: {
            sender: user.id,
            ciphertext: req.body.ciphertext,
            iv: req.body.iv,
            tag: req.body.tag,
            type: req.body.type || 'text',
            replyTo: req.body.replyTo || null
          }
        },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    )
      .populate('messages.sender', 'profile.fullName profile.avatar')
      .populate({
        path: 'messages.replyTo',
        populate: {
          path: 'sender',
          select: 'profile.fullName profile.avatar'
        }
      })
      .populate('messages.reactions.user', 'profile.fullName profile.avatar');

    if (!chat) return notFound(res, 'Chat not found');

    const message = chat.messages.at(-1);

    // ✅ REALTIME — GROUP CHAT
    req.io.to(`chat:${chatId}`).emit("group:message:new", {
      chatId,
      groupId,
      message
    });

    return ok(res, message, 'Message sent');
  } catch (error) {
    return serverError(res, error);
  }
};


// 5. Delete message in group chat
exports.deleteGroupMessage = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { groupId, chatId, messageId } = req.params;
    if (!ensureObjectIdParam(res, groupId, 'groupId')) return;
    if (!ensureObjectIdParam(res, chatId, 'chatId')) return;
    if (!ensureObjectIdParam(res, messageId, 'messageId')) return;

    const group = await Group.findOne({ _id: groupId, isRemoved: false });
    const vis = await ensureGroupVisibility(group, user.id);
    if (!vis.ok) {
      return vis.code === 403 ? forbidden(res, vis.message) : notFound(res, vis.message);
    }

    const chat = await Chat.findOne({
      _id: chatId,
      type: 'group',
      isRemoved: false,
      'messages._id': messageId
    });

    if (!chat) return notFound(res, 'Chat not found');

    const msg = chat.messages.id(messageId);

    const canDelete =
      String(msg.sender) === String(user.id) ||
      isGroupAdminOrCreator(group, user.id) ||
      hasRole(user, ['moderator', 'admin']);

    if (!canDelete) return forbidden(res, 'Not allowed');

    msg.isDeletedForEveryone = true;
    msg.ciphertext = '';
    msg.iv = '';
    msg.tag = '';
    msg.reactions = [];

    await chat.save();

    req.io.to(`chat:${chatId}`).emit('message:deleted', {
      chatId,
      messageId,
      mode: 'everyone'
    });

    return ok(res, null, 'Message deleted');
  } catch (error) {
    return serverError(res, error);
  }
};

/* =====================================================
   MESSAGE REACTIONS
===================================================== */
exports.reactToMessage = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { chatId, messageId } = req.params;
    const { emoji } = req.body; // emoji OPTIONAL

    /**
     * 🚫 IMPORTANT:
     * - NO database mutation
     * - NO socket emission
     * - NO reaction logic execution
     *
     * Reactions are handled AUTHORITATIVELY via socket:
     * socket.on("message:reaction")
     */

    return ok(res, null, "Reaction dispatched via socket");
  } catch (error) {
    return serverError(res, error);
  }
};

/* =====================================================
   PIN MESSAGE (GROUP)
===================================================== */
exports.pinGroupMessage = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { groupId, chatId, messageId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return notFound(res, 'Group not found');

    if (!isGroupAdminOrCreator(group, user.id)) {
      return forbidden(res, 'Only admins can pin');
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return notFound(res, 'Chat not found');

    chat.pinnedMessage = messageId;
    await chat.save();

    req.io.to(`chat:${chatId}`).emit('message:pinned', {
      chatId,
      messageId
    });

    return ok(res, messageId);
  } catch (e) {
    return serverError(res, e);
  }
};


/* =====================================================
   DELETE MESSAGE (SOFT)
===================================================== */
exports.softDeleteMessage = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { chatId, messageId } = req.params;
    const { mode = 'me' } = req.body;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: user.id,
      'messages._id': messageId
    });

    if (!chat) return notFound(res, 'Message not found');

    const msg = chat.messages.id(messageId);

    if (mode === 'everyone') {
      if (String(msg.sender) !== String(user.id)) {
        return forbidden(res, 'Not allowed');
      }

      msg.isDeletedForEveryone = true;
      msg.ciphertext = '';
      msg.iv = '';
      msg.tag = '';
      msg.reactions = [];
    } else {
      msg.deletedFor.addToSet(user.id);
    }

    await chat.save();

    req.io.to(`chat:${chatId}`).emit('message:deleted', {
      chatId,
      messageId,
      mode
    });

    return ok(res);
  } catch (e) {
    return serverError(res, e);
  }
};


exports.markMessageAsRead = async (req, res) => {
  const user = ensureAuthUser(req, res);
  if (!user) return;

  const { chatId, messageId } = req.params;

  const chat = await Chat.findOne({
    _id: chatId,
    participants: user.id,
    'messages._id': messageId
  });

  if (!chat) return notFound(res, 'Message not found');

  const msg = chat.messages.id(messageId);

  const alreadyRead = msg.readBy.some(
    (r) => String(r.user) === String(user.id)
  );

  if (!alreadyRead) {
    msg.readBy.push({ user: user.id });
    await chat.save();
  }

  return ok(res, msg.readBy, 'Message marked as read');
};


/* =====================================================
   HUBS
===================================================== */

// 1. Create hub
exports.createHub = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    // Keep your original rule: only moderators/admin can create hubs
    if (!hasRole(user, ['moderator', 'admin'])) {
      return forbidden(res, 'Only moderators can create hubs');
    }

    const { name, type, region, description, avatar } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return bad(res, 'Hub name is required');
    }

    if (!['regional', 'international', 'global'].includes(type)) {
      return bad(res, 'Invalid hub type');
    }

    if (type === 'regional' && (!region || typeof region !== 'string')) {
      return bad(res, 'region is required for regional hubs');
    }

    const hub = await Hub.create({
      name: name.trim(),
      type,
      region: type === 'regional' ? region : null,
      description: typeof description === 'string' ? description : '',
      avatar: avatar || null,
      moderators: [user.id],
      members: [user.id],
      isRemoved: false
    });

    return created(res, hub, 'Hub created');
  } catch (error) {
    return serverError(res, error);
  }
};

// 4. Get hubs
exports.getHubs = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { page, limit, skip } = parsePage(req);
    const mine = String(req.query.mine || 'false') === 'true';

    /* =====================
       QUERY
    ===================== */
    const query = {
      isRemoved: false,
      ...(mine ? { members: user.id } : {})
    };

    /* =====================
       FETCH
    ===================== */
    const [hubs, total] = await Promise.all([
      Hub.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          'name description avatar type region members createdAt'
        ),

      Hub.countDocuments(query)
    ]);

    /* =====================
       NORMALIZE RESPONSE
    ===================== */
    const data = hubs.map((h) => {
      const members = h.members || [];
      const isMember = members.some(
        (m) => String(m) === String(user.id)
      );

      return {
        _id: h._id,
        name: h.name,
        description: h.description,
        avatar: h.avatar,
        type: h.type,
        region: h.region || null,

        membersCount: members.length, // 🔒 explicit, no reliance on virtual
        isMember,

        createdAt: h.createdAt
      };
    });

    /* =====================
       RESPONSE
    ===================== */
    return ok(res, data, null, {
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[getHubs]', error);
    return serverError(res, error);
  }
};

// 3. Get hub by ID (full hub info)
exports.getHubById = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { id: hubId } = req.params;
    if (!ensureObjectIdParam(res, hubId, 'hubId')) return;

    const hub = await Hub.findOne({
      _id: hubId,
      isRemoved: false
    })
      .populate(
        'moderators',
        'profile.fullName profile.avatar'
      )
      .populate(
        'members',
        'profile.fullName profile.avatar'
      );

    if (!hub) return notFound(res, 'Hub not found');

    const members = hub.members || [];

    const isMember = members.some(
      (m) => String(m?._id || m) === String(user.id)
    );

    const isModerator = isHubModeratorOrAdmin(hub, user);

    return ok(res, {
      _id: hub._id,
      name: hub.name,
      description: hub.description,
      avatar: hub.avatar,
      type: hub.type,
      region: hub.region || null,

      moderators: hub.moderators,
      members,

      membersCount: members.length, // 🔒 explicit, no reliance on virtual
      isMember,
      isModerator,

      createdAt: hub.createdAt,
      updatedAt: hub.updatedAt
    });
  } catch (error) {
    console.error('[getHubById]', error);
    return serverError(res, error);
  }
};

// 2. Join hub
exports.joinHub = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { hubId } = req.params;
    if (!ensureObjectIdParam(res, hubId, 'hubId')) return;

    /* =====================
       ATOMIC ADD (NO DUPES)
    ===================== */
    const hub = await Hub.findOneAndUpdate(
      {
        _id: hubId,
        isRemoved: false,
        members: { $ne: user.id } // prevent duplicates
      },
      {
        $addToSet: { members: user.id }
      },
      { new: true }
    ).select('members name');

    /* =====================
       ALREADY A MEMBER
    ===================== */
    if (!hub) {
      const existing = await Hub.findOne({
        _id: hubId,
        isRemoved: false
      }).select('members');

      if (!existing) return notFound(res, 'Hub not found');

      return ok(
        res,
        {
          _id: hubId,
          isMember: true,
          membersCount: existing.members.length
        },
        'Already a member'
      );
    }

    /* =====================
       SUCCESS RESPONSE
    ===================== */
    return ok(
      res,
      {
        _id: hub._id,
        isMember: true,
        membersCount: hub.members.length
      },
      'Joined hub'
    );
  } catch (error) {
    console.error('[joinHub]', error);
    return serverError(res, error);
  }
};

// 5. Leave hub
exports.leaveHub = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { hubId } = req.params;
    if (!ensureObjectIdParam(res, hubId, 'hubId')) return;

    /* =====================
       LOAD HUB (LIGHT)
    ===================== */
    const hub = await Hub.findOne({
      _id: hubId,
      isRemoved: false
    }).select('members moderators');

    if (!hub) return notFound(res, 'Hub not found');

    const isMember = (hub.members || []).some(
      (m) => String(m) === String(user.id)
    );

    if (!isMember) {
      return ok(
        res,
        {
          _id: hubId,
          isMember: false,
          membersCount: hub.members.length
        },
        'Already not a member'
      );
    }

    /* =====================
       MODERATOR SAFETY CHECK
    ===================== */
    const isModerator = hub.moderators.some(
      (m) => String(m) === String(user.id)
    );

    if (isModerator && !hasRole(user, ['admin'])) {
      const remainingMods = hub.moderators.filter(
        (m) => String(m) !== String(user.id)
      );

      if (remainingMods.length === 0) {
        return bad(
          res,
          'Last moderator cannot leave hub. Assign another moderator first.'
        );
      }
    }

    /* =====================
       ATOMIC REMOVE
    ===================== */
    const updated = await Hub.findOneAndUpdate(
      { _id: hubId, isRemoved: false },
      {
        $pull: {
          members: user.id,
          moderators: user.id
        }
      },
      { new: true }
    ).select('members');

    /* =====================
       RESPONSE
    ===================== */
    return ok(
      res,
      {
        _id: hubId,
        isMember: false,
        membersCount: updated.members.length
      },
      'Left hub'
    );
  } catch (error) {
    console.error('[leaveHub]', error);
    return serverError(res, error);
  }
};

// 6. Update hub
exports.updateHub = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { hubId } = req.params;
    if (!ensureObjectIdParam(res, hubId, 'hubId')) return;

    const hub = await Hub.findOne({
      _id: hubId,
      isRemoved: false
    });

    if (!hub) return notFound(res, 'Hub not found');

    /* =====================
       PERMISSION
    ===================== */
    if (!isHubModeratorOrAdmin(hub, user)) {
      return forbidden(res, 'Only moderators can update hubs');
    }

    /* =====================
       ALLOWED FIELDS
    ===================== */
    const allowed = pick(req.body, [
      'name',
      'description',
      'avatar',
      'type',
      'region'
    ]);

    /* =====================
       VALIDATION
    ===================== */
    if (allowed.type && !['regional', 'international', 'global'].includes(allowed.type)) {
      return bad(res, 'Invalid hub type');
    }

    if (allowed.type === 'regional') {
      if (!allowed.region || typeof allowed.region !== 'string') {
        return bad(res, 'region is required for regional hubs');
      }
    }

    if (allowed.type && allowed.type !== 'regional') {
      allowed.region = null; // 🔒 prevent stale region data
    }

    if (allowed.name) {
      if (typeof allowed.name !== 'string') return bad(res, 'Invalid hub name');
      allowed.name = allowed.name.trim();
      if (allowed.name.length < 2) return bad(res, 'Hub name too short');
    }

    /* =====================
       APPLY UPDATE
    ===================== */
    Object.assign(hub, allowed);
    await hub.save();

    /* =====================
       RESPONSE (LIGHT)
    ===================== */
    return ok(
      res,
      {
        _id: hub._id,
        name: hub.name,
        description: hub.description,
        avatar: hub.avatar,
        type: hub.type,
        region: hub.region || null,
        updatedAt: hub.updatedAt
      },
      'Hub updated'
    );
  } catch (error) {
    console.error('[updateHub]', error);
    return serverError(res, error);
  }
};

// 7. Delete hub (soft delete)
exports.deleteHub = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { hubId } = req.params;
    if (!ensureObjectIdParam(res, hubId, 'hubId')) return;

    /* =====================
       FIND HUB (LIGHT)
    ===================== */
    const hub = await Hub.findOne({
      _id: hubId,
      isRemoved: false
    }).select('_id moderators');

    if (!hub) return notFound(res, 'Hub not found');

    /* =====================
       PERMISSION
    ===================== */
    if (!isHubModeratorOrAdmin(hub, user)) {
      return forbidden(res, 'Only moderators can delete hubs');
    }

    /* =====================
       SOFT DELETE
    ===================== */
    await Hub.updateOne(
      { _id: hubId },
      { $set: { isRemoved: true, updatedAt: new Date() } }
    );

    return ok(res, null, 'Hub deleted');
  } catch (error) {
    console.error('[deleteHub]', error);
    return serverError(res, error);
  }
};

//Toggle Hub Reactions
exports.toggleHubReaction = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { hubId } = req.params;
    const { emoji } = req.body;

    if (!ensureObjectIdParam(res, hubId, 'hubId')) return;
    if (!emoji || typeof emoji !== 'string') {
      return bad(res, 'emoji is required');
    }

    /* =====================
       LOAD HUB (LIGHT)
    ===================== */
    const hub = await Hub.findOne({
      _id: hubId,
      isRemoved: false
    }).select('reactions members');

    if (!hub) return notFound(res, 'Hub not found');

    /* =====================
       OPTIONAL: MEMBER ONLY
    ===================== */
    const isMember = (hub.members || []).some(
      (m) => String(m) === String(user.id)
    );
    if (!isMember) {
      return forbidden(res, 'Only hub members can react');
    }

    /* =====================
       FIND REACTION
    ===================== */
    let reaction = (hub.reactions || []).find(
      (r) => r.emoji === emoji
    );

    /* =====================
       TOGGLE LOGIC
    ===================== */
    if (!reaction) {
      hub.reactions.push({
        emoji,
        users: [user.id],
        count: 1
      });
    } else {
      const hasReacted = (reaction.users || []).some(
        (u) => String(u) === String(user.id)
      );

      if (hasReacted) {
        reaction.users = reaction.users.filter(
          (u) => String(u) !== String(user.id)
        );
        reaction.count = Math.max(0, reaction.count - 1);

        // remove empty reaction bucket
        if (reaction.count === 0) {
          hub.reactions = hub.reactions.filter(
            (r) => r.emoji !== emoji
          );
        }
      } else {
        reaction.users.push(user.id);
        reaction.count += 1;
      }
    }

    await hub.save();

    /* =====================
       RESPONSE
    ===================== */
    return ok(
      res,
      {
        emoji,
        reacted: true,
        reactions: hub.reactions.map((r) => ({
          emoji: r.emoji,
          count: r.count,
          reacted: r.users.some(
            (u) => String(u) === String(user.id)
          )
        }))
      },
      'Reaction updated'
    );
  } catch (error) {
    console.error('[toggleHubReaction]', error);
    return serverError(res, error);
  }
};

/* =====================================================
   CHAT (DM + Group) — Comprehensive message APIs
===================================================== */

// 1. Create chat (DM or group)
exports.createChat = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { type = 'dm', participants = [] } = req.body;
    const userId = String(user.id);

    // ----------------------------------------
    // 1️⃣ Normalize participants
    // ----------------------------------------
    const cleanParticipants = [
      userId,
      ...participants.map(normalizeId)
    ]
      .map(String)
      .filter(Boolean);

    // Deduplicate
    const uniqueParticipants = [...new Set(cleanParticipants)];

    // ----------------------------------------
    // 2️⃣ DM CHAT LOGIC (PRODUCTION SAFE)
    // ----------------------------------------
    if (type === 'dm') {
      if (uniqueParticipants.length !== 2) {
        return bad(res, 'Direct messages require exactly 2 participants');
      }

      const dmKey = [...uniqueParticipants].sort().join('_');

      const chat = await Chat.findOneAndUpdate(
        { type: 'dm', dmKey },
        {
          $setOnInsert: {
            type: 'dm',
            participants: uniqueParticipants,
            dmKey,
            messages: []
          }
        },
        {
          new: true,
          upsert: true
        }
      );

      return created(res, chat);
    }


    // ----------------------------------------
    // 3️⃣ GROUP CHAT LOGIC
    // ----------------------------------------
    if (type === 'group') {
      if (uniqueParticipants.length < 2) {
        return bad(res, 'Group chat requires at least 2 participants');
      }

      const chat = await Chat.create({
        type: 'group',
        participants: uniqueParticipants,
        messages: []
      });

      return created(res, chat);
    }

    // ----------------------------------------
    // 4️⃣ INVALID TYPE
    // ----------------------------------------
    return bad(res, 'Invalid chat type');
  } catch (error) {
    console.error('[createChat] ❌ ERROR:', error);
    return serverError(res, error);
  }
};

// 2. Get chats
exports.getChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await Chat.find({
      participants: userId,
      isRemoved: false,
    })
      .populate("participants", "profile.fullName profile.avatar")
      .sort({ lastMessageAt: -1 })
      .lean();

    res.json({
      success: true,
      data: chats,
    });
  } catch (err) {
    console.error("[getChats] ❌", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chats",
    });
  }
};


// 3. Get chat by Id
// controllers/communityController.js
exports.getChatById = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { chatId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return bad(res, 'Invalid chatId');
    }

    const chat = await Chat.findOne({
      _id: chatId,
      isRemoved: false
    })
      .populate('participants', 'profile.fullName profile.avatar')
      .populate({
        path: 'messages.sender',
        select: 'profile.fullName profile.avatar'
      })
      .populate({
        path: 'messages.replyTo',
        populate: {
          path: 'sender',
          select: 'profile.fullName profile.avatar'
        }
      })
      .populate({
        path: 'messages.reactions.user',
        select: 'profile.fullName profile.avatar'
      })
      .lean();

    if (!chat) return notFound(res, 'Chat not found');

    const isParticipant = chat.participants.some(
      (p) => String(p._id) === String(user.id)
    );
    if (!isParticipant) return forbidden(res, 'Not a participant');

    return ok(res, chat);
  } catch (e) {
    return serverError(res, e);
  }
};

// 4. Get messages (paginated)
exports.getMessages = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { chatId } = req.params;
    const limit = Math.min(50, parseInt(req.query.limit || 30));
    const before = req.query.before;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: user.id,
      isRemoved: false
    });

    if (!chat) return notFound(res, "Chat not found");

    let messages = chat.messages || [];

    // 🔥 newest
    if (!before) {
      messages = messages.slice(-limit);
    }
    // 🔥 older
    else {
      const index = messages.findIndex(
        (m) => String(m._id) === String(before)
      );

      if (index === -1) {
        messages = messages.slice(-limit);
      } else {
        messages = messages.slice(
          Math.max(0, index - limit),
          index
        );
      }
    }

    return ok(res, messages);
  } catch (e) {
    return serverError(res, e);
  }
};


// 7. Get message by Id
exports.getMessageById = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { chatId, messageId } = req.params;
    if (!ensureObjectIdParam(res, chatId, 'chatId')) return;
    if (!ensureObjectIdParam(res, messageId, 'messageId')) return;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: user.id,
      isRemoved: false,
      'messages._id': messageId
    }).populate('messages.sender', 'name avatar');

    if (!chat) return notFound(res, 'Message not found');

    const msg = (chat.messages || []).find((m) => String(m._id) === String(messageId));
    if (!msg) return notFound(res, 'Message not found');

    return ok(res, msg);
  } catch (error) {
    return serverError(res, error);
  }
};

// 5. Send messages (supports text/share; multimedia can be encrypted inside ciphertext as metadata)
exports.sendMessage = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { chatId } = req.params;
    const { ciphertext, iv, tag, type = 'text', replyTo } = req.body;

    const updated = await Chat.findOneAndUpdate(
      { _id: chatId, participants: user.id, isRemoved: false },
      {
        $push: {
          messages: {
            sender: user.id,
            ciphertext,
            iv,
            tag,
            type,
            replyTo: replyTo || null
          }
        },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    )
      .populate({
        path: 'messages.sender',
        select: 'profile.fullName profile.avatar'
      })
      .populate({
        path: 'messages.replyTo',
        populate: {
          path: 'sender',
          select: 'profile.fullName profile.avatar'
        }
      })
      .populate({
        path: 'messages.reactions.user',
        select: 'profile.fullName profile.avatar'
      });

    if (!updated) return notFound(res, 'Chat not found');

    const message = updated.messages.at(-1);

    req.io.to(`chat:${chatId}`).emit('message:new', {
      chatId,
      message
    });

    return ok(res, message);
  } catch (e) {
    return serverError(res, e);
  }
};

// 6. Edit message by ID (overwrite encrypted payload; tracking editedAt needs schema change)
exports.editMessageById = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { chatId, messageId } = req.params;
    if (!ensureObjectIdParam(res, chatId, 'chatId')) return;
    if (!ensureObjectIdParam(res, messageId, 'messageId')) return;

    const { ciphertext, iv, tag, type, sharedPost } = req.body;

    if (!ciphertext || !iv || !tag) return bad(res, 'ciphertext, iv, and tag are required');

    // Only sender (or admin/moderator) can edit
    const chat = await Chat.findOne({
      _id: chatId,
      participants: user.id,
      isRemoved: false,
      'messages._id': messageId
    });

    if (!chat) return notFound(res, 'Message not found');

    const msg = (chat.messages || []).find((m) => String(m._id) === String(messageId));
    if (!msg) return notFound(res, 'Message not found');

    const canEdit =
      String(msg.sender) === String(user.id) || hasRole(user, ['moderator', 'admin']);

    if (!canEdit) return forbidden(res, 'Not allowed to edit this message');

    if (type && !['text', 'share'].includes(type)) return bad(res, 'Invalid message type');

    if ((type || msg.type) === 'share') {
      const pid = sharedPost || msg.sharedPost;
      if (!pid || !isValidObjectId(pid)) return bad(res, 'sharedPost is required for share');
      const postExists = await Post.exists({ _id: pid, isRemoved: false });
      if (!postExists) return notFound(res, 'Post not found');
    }

    const update = {
      'messages.$.ciphertext': ciphertext,
      'messages.$.iv': iv,
      'messages.$.tag': tag
    };

    if (type) update['messages.$.type'] = type;
    if (type === 'share') update['messages.$.sharedPost'] = sharedPost || null;
    if (type === 'text') update['messages.$.sharedPost'] = null;

    const updated = await Chat.findOneAndUpdate(
      { _id: chatId, 'messages._id': messageId },
      { $set: { ...update, updatedAt: new Date() } },
      { new: true }
    ).populate('messages.sender', 'name avatar');

    const updatedMsg = (updated.messages || []).find((m) => String(m._id) === String(messageId));
    return ok(res, updatedMsg, 'Message updated');
  } catch (error) {
    return serverError(res, error);
  }
};

// Delete message by ID
exports.deleteMessageById = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { chatId, messageId } = req.params;
    if (!ensureObjectIdParam(res, chatId, 'chatId')) return;
    if (!ensureObjectIdParam(res, messageId, 'messageId')) return;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: user.id,
      isRemoved: false
    });

    if (!chat) return notFound(res, 'Chat not found');

    const msg = (chat.messages || []).find((m) => String(m._id) === String(messageId));
    if (!msg) return notFound(res, 'Message not found');

    const canDelete =
      String(msg.sender) === String(user.id) || hasRole(user, ['moderator', 'admin']);

    if (!canDelete) return forbidden(res, 'Not allowed to delete this message');

    await Chat.updateOne(
      { _id: chatId },
      { $pull: { messages: { _id: messageId } }, $set: { updatedAt: new Date() } }
    );

    return ok(res, null, 'Message deleted');
  } catch (error) {
    return serverError(res, error);
  }
};

// 8. Share Post in chat (helper wrapper — uses sendMessage semantics)
exports.sharePostInChat = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { chatId } = req.params;
    if (!ensureObjectIdParam(res, chatId, 'chatId')) return;

    const { postId, ciphertext, iv, tag } = req.body;

    if (!postId || !isValidObjectId(postId)) return bad(res, 'postId is required');
    if (!ciphertext || !iv || !tag) {
      // In your earlier version you used placeholder encryption; we require caller to send real encrypted payload.
      return bad(res, 'ciphertext, iv, and tag are required for share');
    }

    const post = await Post.findOne({ _id: postId, isRemoved: false });
    if (!post) return notFound(res, 'Post not found');

    const updatedChat = await Chat.findOneAndUpdate(
      { _id: chatId, isRemoved: false, participants: user.id },
      {
        $push: {
          messages: {
            sender: user.id,
            ciphertext,
            iv,
            tag,
            type: 'share',
            sharedPost: postId
          }
        },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    )
      .populate('messages.sender', 'name avatar')
      .populate('messages.sharedPost');

    if (!updatedChat) return notFound(res, 'Chat not found or access denied');

    return ok(res, updatedChat.messages[updatedChat.messages.length - 1], 'Post shared');
  } catch (error) {
    return serverError(res, error);
  }
};

/* =====================================================
   VOICES
===================================================== */

// 1. Create voice
exports.createVoice = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { title, group, hub, instances = [] } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      return bad(res, 'Voice title is required');
    }

    // If attaching to group/hub, validate membership
    if (group) {
      if (!isValidObjectId(group)) return bad(res, 'Invalid group');
      const g = await Group.findOne({ _id: group, isRemoved: false });
      if (!g) return notFound(res, 'Group not found');

      const vis = await ensureGroupVisibility(g, user.id);
      if (!vis.ok) return forbidden(res, 'No access to this group');
    }

    if (hub) {
      if (!isValidObjectId(hub)) return bad(res, 'Invalid hub');
      const h = await Hub.findOne({ _id: hub, isRemoved: false });
      if (!h) return notFound(res, 'Hub not found');
      const isMember = (h.members || []).some((m) => String(m) === String(user.id));
      if (!isMember && !hasRole(user, ['admin'])) return forbidden(res, 'Not a member of this hub');
    }

    const voice = await Voice.create({
      title: title.trim(),
      host: user.id,
      group: group || null,
      hub: hub || null,
      instances: Array.isArray(instances) ? instances : [],
      isRemoved: false
    });

    return created(res, voice, 'Voice created');
  } catch (error) {
    return serverError(res, error);
  }
};

// 2. Get voices
exports.getVoices = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { page, limit, skip } = parsePage(req);

    const query = { isRemoved: false };

    if (req.query.group) {
      if (!isValidObjectId(req.query.group))
        return bad(res, "Invalid group filter");
      query.group = req.query.group;
    }

    if (req.query.hub) {
      if (!isValidObjectId(req.query.hub))
        return bad(res, "Invalid hub filter");
      query.hub = req.query.hub;
    }

    const [voices, total] = await Promise.all([
      Voice.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

        // ✅ HOST
        .populate({
          path: "host",
          select: "profile.fullName profile.avatar",
        })

        // ✅ SPEAKERS
        .populate({
          path: "instances.speakers",
          select: "profile.fullName profile.avatar",
        })

        // ✅ LISTENERS
        .populate({
          path: "instances.participants",
          select: "profile.fullName profile.avatar",
        }),

      Voice.countDocuments(query),
    ]);

    let data = voices.map((v) => v.toObject());

    if (String(req.query.live || "false") === "true") {
      data = data.filter((v) => v.isLive === true);
    }

    return ok(res, data, null, {
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return serverError(res, error);
  }
};

// 3. Get Voice by id
exports.getVoiceById = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    // ✅ PARAM FIX (matches route)
    const { id: voiceId } = req.params;

    if (!ensureObjectIdParam(res, voiceId, "id")) return;

    const voice = await Voice.findOne({
      _id: voiceId,
      isRemoved: false,
    })

      // ✅ HOST
      .populate({
        path: "host",
        select: "profile.fullName profile.avatar",
      })

      // ✅ SPEAKERS
      .populate({
        path: "instances.speakers",
        select: "profile.fullName profile.avatar",
      })

      // ✅ LISTENERS
      .populate({
        path: "instances.participants",
        select: "profile.fullName profile.avatar",
      })

      // optional context
      .populate("group", "name avatar privacy")
      .populate("hub", "name avatar type region");

    if (!voice) return notFound(res, "Voice not found");

    /* ================= ACCESS CONTROL ================= */

    if (voice.group) {
      const g = await Group.findOne({
        _id: voice.group._id,
        isRemoved: false,
      });

      const vis = await ensureGroupVisibility(g, user.id);
      if (!vis.ok)
        return forbidden(res, "No access to this voice room");
    }

    if (voice.hub) {
      const h = await Hub.findOne({
        _id: voice.hub._id,
        isRemoved: false,
      });

      const isMember = (h.members || []).some(
        (m) => String(m) === String(user.id)
      );

      if (!isMember && !hasRole(user, ["admin"])) {
        return forbidden(res, "No access to this voice room");
      }
    }

    return ok(res, voice);
  } catch (error) {
    return serverError(res, error);
  }
};

// GET voice instance by instanceId (AUTHORITATIVE)
exports.getVoiceInstanceById = async (req, res) => {
  try {
    const user = req.user;
    const { instanceId } = req.params;

    /* ===========================
       1️⃣ VALIDATE instanceId
    =========================== */
    if (!mongoose.Types.ObjectId.isValid(instanceId)) {
      return bad(res, "Invalid instanceId");
    }

    const instanceObjectId = new mongoose.Types.ObjectId(instanceId);

    /* ===========================
       2️⃣ FIND VOICE + POPULATE
    =========================== */
    const voice = await Voice.findOne({
      "instances.instanceId": instanceObjectId,
      isRemoved: false
    })
      // 🎤 HOST
      .populate({
        path: "host",
        select: "profile.fullName profile.avatar"
      })

      // 🎙️ SPEAKERS
      .populate({
        path: "instances.speakers",
        select: "profile.fullName profile.avatar"
      })

      // 👂 LISTENERS
      .populate({
        path: "instances.participants",
        select: "profile.fullName profile.avatar"
      })

      // OPTIONAL CONTEXT
      .populate("group", "name avatar privacy")
      .populate("hub", "name avatar type region");

    if (!voice) {
      return notFound(res, "Voice instance not found");
    }

    /* ===========================
       3️⃣ EXTRACT INSTANCE
    =========================== */
    const instance = voice.instances.find(
      (i) => String(i.instanceId) === String(instanceObjectId)
    );

    if (!instance) {
      return notFound(res, "Instance not found");
    }

    if (instance.status !== "live") {
      return bad(res, "This voice instance is not live");
    }

    /* ===========================
       4️⃣ ROLE RESOLUTION
    =========================== */
    let role = "listener";

    if (
      voice.host &&
      String(voice.host._id) === String(user.id)
    ) {
      role = "host";
    } else if (
      Array.isArray(instance.speakers) &&
      instance.speakers.some(
        (s) => String(s?._id) === String(user.id)
      )
    ) {
      role = "speaker";
    }

    /* ===========================
       5️⃣ NORMALIZED ROOM OBJECT
    =========================== */
    const room = {
      _id: voice._id,
      title: voice.title,
      host: voice.host || null,   // 🔒 always explicit
      group: voice.group || null,
      hub: voice.hub || null
    };

    /* ===========================
       6️⃣ FINAL RESPONSE
    =========================== */
    return ok(res, {
      room,
      instance,
      role,
      chatEnabled: instance.chatEnabled ?? true,
      lockedStage: false
    });
  } catch (e) {
    console.error("❌ getVoiceInstanceById error:", e);
    return serverError(res, e);
  }
};

// 4. Update voice
exports.updateVoice = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { voiceId } = req.params;
    if (!ensureObjectIdParam(res, voiceId, 'voiceId')) return;

    const voice = await Voice.findOne({ _id: voiceId, isRemoved: false });
    if (!voice) return notFound(res, 'Voice not found');

    const isHost = String(voice.host) === String(user.id);
    if (!isHost && !hasRole(user, ['moderator', 'admin'])) {
      return forbidden(res, 'Only host can update voice');
    }

    const allowed = pick(req.body, ['title', 'group', 'hub']);
    if (allowed.title && typeof allowed.title === 'string') {
      allowed.title = allowed.title.trim();
      if (allowed.title.length < 2) return bad(res, 'Title too short');
    }

    Object.assign(voice, allowed);
    await voice.save();

    return ok(res, voice, 'Voice updated');
  } catch (error) {
    return serverError(res, error);
  }
};

// 5. Voice info (alias for getVoiceById but returns richer calculated fields already in virtuals)
exports.getVoiceInfo = async (req, res) => {
  return exports.getVoiceById(req, res);
};

// 6. Add voice instance
exports.addVoiceInstance = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { voiceId } = req.params;
    if (!ensureObjectIdParam(res, voiceId, 'voiceId')) return;

    const { startsAt, endsAt } = req.body;

    if (!startsAt || !endsAt) return bad(res, 'startsAt and endsAt are required');

    const voice = await Voice.findOne({ _id: voiceId, isRemoved: false });
    if (!voice) return notFound(res, 'Voice not found');

    const isHost = String(voice.host) === String(user.id);
    if (!isHost && !hasRole(user, ['moderator', 'admin'])) {
      return forbidden(res, 'Only host can add instances');
    }

    const s = new Date(startsAt);
    const e = new Date(endsAt);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
      return bad(res, 'Invalid startsAt/endsAt dates');
    }
    if (e <= s) return bad(res, 'endsAt must be after startsAt');

    voice.instances.push({
      startsAt: s,
      endsAt: e,
      status: 'scheduled',
      speakers: [user.id],
      participants: [],
      sharedPosts: []
    });

    await voice.save();

    return ok(res, voice.instances[voice.instances.length - 1], 'Instance added');
  } catch (error) {
    return serverError(res, error);
  }
};

// Voice instance status update (scheduled -> live -> ended)
exports.updateVoiceInstanceStatus = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { voiceId, instanceId } = req.params;
    if (!ensureObjectIdParam(res, voiceId, 'voiceId')) return;
    if (!ensureObjectIdParam(res, instanceId, 'instanceId')) return;

    const { status } = req.body;
    if (!['scheduled', 'live', 'ended'].includes(status)) return bad(res, 'Invalid status');

    const voice = await Voice.findOne({ _id: voiceId, isRemoved: false });
    if (!voice) return notFound(res, 'Voice not found');

    const isHost = String(voice.host) === String(user.id);
    if (!isHost && !hasRole(user, ['moderator', 'admin'])) {
      return forbidden(res, 'Only host can update instance status');
    }

    const instance = (voice.instances || []).id(instanceId);
    if (!instance) return notFound(res, 'Instance not found');

    // Enforce simple state transitions
    const current = instance.status;
    const allowedTransitions = {
      scheduled: ['live', 'ended'],
      live: ['ended'],
      ended: []
    };

    if (!allowedTransitions[current].includes(status) && status !== current) {
      return bad(res, `Invalid transition: ${current} -> ${status}`);
    }

    // Ensure only one live instance at a time
    if (status === 'live') {
      const anyOtherLive = (voice.instances || []).some(
        (i) => String(i._id) !== String(instanceId) && i.status === 'live'
      );
      if (anyOtherLive) return bad(res, 'Another instance is already live');
    }

    instance.status = status;
    await voice.save();

    return ok(res, instance, 'Instance status updated');
  } catch (error) {
    return serverError(res, error);
  }
};

// Join voice (adds user to current live instance participants)
exports.joinVoice = async (req, res) => {
  try {
    const user = req.user;
    const { instanceId } = req.params;

    console.log("🎧 joinVoice instanceId:", instanceId);

    if (!mongoose.Types.ObjectId.isValid(instanceId)) {
      return bad(res, "Invalid instance id");
    }

    const instanceObjectId = new mongoose.Types.ObjectId(instanceId);

    const voice = await Voice.findOne({
      "instances.instanceId": instanceObjectId,
      isRemoved: false,
    });

    if (!voice) return notFound(res, "Voice room not found");

    const instance = voice.instances.find(
      (i) => String(i.instanceId) === String(instanceObjectId)
    );

    if (!instance) return notFound(res, "Instance not found");

    if (instance.status !== "live") {
      return bad(res, "This voice instance is not live");
    }

    /* =====================================================
       ✅ PREVENT DUPLICATES (SPEAKERS + PARTICIPANTS)
    ===================================================== */
    const alreadyJoined =
      (instance.participants || []).some(
        (p) => String(p) === String(user.id)
      ) ||
      (instance.speakers || []).some(
        (s) => String(s) === String(user.id)
      );

    if (!alreadyJoined) {
      instance.participants.push(user.id);
      await voice.save();
    }

    console.log("✅ User joined instance:", {
      userId: user.id,
      instanceId,
    });

    return ok(
      res,
      {
        roomId: voice._id,
        instanceId: instance.instanceId,
      },
      "Joined voice instance"
    );
  } catch (e) {
    console.error("❌ joinVoice error:", e);
    return serverError(res, e);
  }
};

// Leave voice
exports.leaveVoice = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { voiceId } = req.params;
    if (!ensureObjectIdParam(res, voiceId, 'voiceId')) return;

    const voice = await Voice.findOne({ _id: voiceId, isRemoved: false });
    if (!voice) return notFound(res, 'Voice not found');

    const instance = (voice.instances || []).find((i) => i.status === 'live');
    if (!instance) return bad(res, 'No live instance available');

    instance.participants = (instance.participants || []).filter(
      (p) => String(p) !== String(user.id)
    );
    await voice.save();

    return ok(res, instance, 'Left voice');
  } catch (error) {
    return serverError(res, error);
  }
};

// 7. Delete voice instance
exports.deleteVoiceInstance = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { voiceId, instanceId } = req.params;
    if (!ensureObjectIdParam(res, voiceId, 'voiceId')) return;
    if (!ensureObjectIdParam(res, instanceId, 'instanceId')) return;

    const voice = await Voice.findOne({ _id: voiceId, isRemoved: false });
    if (!voice) return notFound(res, 'Voice not found');

    const isHost = String(voice.host) === String(user.id);
    if (!isHost && !hasRole(user, ['moderator', 'admin'])) {
      return forbidden(res, 'Only host can delete instances');
    }

    const instance = (voice.instances || []).id(instanceId);
    if (!instance) return notFound(res, 'Instance not found');

    if (instance.status === 'live') {
      return bad(res, 'Cannot delete a live instance. End it first.');
    }

    voice.instances = (voice.instances || []).filter((i) => String(i._id) !== String(instanceId));
    await voice.save();

    return ok(res, null, 'Instance deleted');
  } catch (error) {
    return serverError(res, error);
  }
};

/* =====================================================
   REPORTS / MODERATION
===================================================== */

exports.reportContent = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { targetType, targetId, reason } = req.body;

    if (!['post', 'comment', 'chat'].includes(targetType)) {
      return bad(res, 'Invalid targetType');
    }
    if (!targetId || !isValidObjectId(targetId)) return bad(res, 'Invalid targetId');
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return bad(res, 'Reason is required');
    }

    // Verify target exists
    let targetExists = false;

    if (targetType === 'post') {
      targetExists = await Post.exists({ _id: targetId, isRemoved: false });
    } else if (targetType === 'comment') {
      targetExists = await Post.exists({
        'comments._id': targetId,
        'comments.isRemoved': false
      });
    } else if (targetType === 'chat') {
      targetExists = await Chat.exists({ _id: targetId, isRemoved: false });
    }

    if (!targetExists) return notFound(res, 'Target content not found');

    // Prevent duplicate active report
    const existingReport = await Report.findOne({
      reporter: user.id,
      targetType,
      targetId,
      resolved: false
    });

    if (existingReport) return bad(res, 'You already reported this content');

    const report = await Report.create({
      reporter: user.id,
      targetType,
      targetId,
      reason: reason.trim()
    });

    return created(res, report, 'Report submitted');
  } catch (error) {
    return serverError(res, error);
  }
};

exports.getModerationQueue = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    if (!hasRole(user, ['moderator', 'admin'])) {
      return forbidden(res, 'Moderator role required');
    }

    const { page, limit, skip } = parsePage(req);
    const resolved = String(req.query.resolved || 'false') === 'true';

    const query = { resolved };

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('reporter', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(query)
    ]);

    return ok(res, reports, null, {
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    return serverError(res, error);
  }
};

// Resolve report (mark resolved + audit trail)
exports.resolveReport = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    if (!hasRole(user, ['moderator', 'admin'])) {
      return forbidden(res, 'Moderator role required');
    }

    const { reportId } = req.params;
    if (!ensureObjectIdParam(res, reportId, 'reportId')) return;

    const report = await Report.findById(reportId);
    if (!report) return notFound(res, 'Report not found');

    report.resolved = true;
    report.resolvedBy = user.id;
    report.resolvedAt = new Date();
    await report.save();

    return ok(res, report, 'Report resolved');
  } catch (error) {
    return serverError(res, error);
  }
};