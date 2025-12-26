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

  // Private/invite: must be member/admin/creator
  const isMember = group.members.some(
    (m) => String(m.user?._id) === String(user.id)
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

  if (!chat || chat.isRemoved) {
    chat = await Chat.create({
      type: 'group',
      participants: group.members.map(m => m.user),
      messages: []
    });

    group.chat = chat._id;
    await group.save();
  }

  const memberIds = group.members.map((m) => String(m.user));
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

    if (privacy && !['public', 'private', 'invite'].includes(privacy)) {
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
    const userId = req.user?.id || req.user?._id;
    const { groupId } = req.params;

    console.log("[getGroupById] userId:", userId);
    console.log("[getGroupById] groupId:", groupId);

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID",
      });
    }

    const group = await Group.findOne({
      _id: groupId,
      isRemoved: false,
    })
      .populate("createdBy", "profile.fullName profile.avatar")
      .populate("admins", "profile.fullName profile.avatar")
      .lean();

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const isMember = userId
      ? group.members.some(
          (m) => String(m.user) === String(userId)
        )
      : false;

    const isAdmin = userId
      ? String(group.createdBy?._id) === String(userId) ||
        group.admins.some((a) => String(a._id) === String(userId))
      : false;

    const members = await User.find({
      _id: { $in: group.members.map((m) => m.user) },
    }).select("profile.fullName profile.avatar");

    const chat = isMember
      ? await Chat.findOne({ group: group._id })
      : null;

    res.json({
      success: true,
      data: {
        ...group,
        isMember,
        isAdmin,
        membersCount: group.members.length,
        members: members.map((u, i) => ({
          _id: u._id,
          fullName: u.profile.fullName,
          avatar: u.profile.avatar,
          joinedAt: group.members[i]?.joinedAt,
        })),
        chatId: group.chat || null,
        posts: [],
      },
    });
  } catch (err) {
    console.error("[getGroupById] ❌ ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error loading group",
    });
  }
};

// 4. Join group
exports.joinGroup = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { groupId } = req.params;

    console.log("[joinGroup] userId:", userId);
    console.log("[joinGroup] groupId:", groupId);

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

    const alreadyMember = group.members.some(
      (m) => String(m.user) === String(userId)
    );

    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: "User already a member of this group",
      });
    }

    group.members.push({
      user: userId,
      joinedAt: new Date(),
    });

    await group.save();

    // Ensure group chat exists
    let chat = await Chat.findOne({ group: group._id });

    if (!chat) {
      chat = await Chat.create({
        type: "group",
        group: group._id,
        participants: group.members.map((m) => m.user),
      });
    }

    res.json({
      success: true,
      data: {
        _id: group._id,
        isMember: true,
        chatId: chat._id,
        membersCount: group.members.length,
      },
    });
  } catch (err) {
    console.error("[joinGroup] ❌ ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error joining group",
    });
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
    if (allowed.privacy && !['public', 'private', 'invite'].includes(allowed.privacy)) {
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
   GROUP CONVERSATION (Chat type = 'group')
   send message, get messages, delete message
===================================================== */

// 5. Get group conversation info (chat id + basic)
exports.getGroupConversation = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { groupId } = req.params;
    if (!ensureObjectIdParam(res, groupId, 'groupId')) return;

    const group = await Group.findOne({ _id: groupId, isRemoved: false });
    const vis = await ensureGroupVisibility(group, user.id);
    if (!vis.ok) {
      return vis.code === 403 ? forbidden(res, vis.message) : notFound(res, vis.message);
    }

    const chat = await ensureGroupChatExistsAndSynced(group);
    return ok(res, { chatId: chat._id, groupId: group._id });
  } catch (error) {
    return serverError(res, error);
  }
};

/* =====================================================
   GROUP CONVERSATION BY CHAT ID (🔥 REQUIRED)
===================================================== */

exports.getGroupConversationByChatId = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { chatId } = req.params;
    if (!ensureObjectIdParam(res, chatId, 'chatId')) return;

    // 1️⃣ Find group by chatId
    const group = await Group.findOne({
      chat: chatId,
      isRemoved: false
    }).lean();

    if (!group) {
      return notFound(res, 'Group not found for this chat');
    }

    // 2️⃣ Visibility check
    const vis = await ensureGroupVisibility(group, user.id);
    if (!vis.ok) {
      return vis.code === 403
        ? forbidden(res, vis.message)
        : notFound(res, vis.message);
    }

    // 3️⃣ Load chat with populated messages
    const chat = await Chat.findOne({
      _id: chatId,
      type: 'group',
      isRemoved: false
    }).populate('messages.sender', 'profile.fullName profile.avatar');

    if (!chat) {
      return notFound(res, 'Chat not found');
    }

    return ok(res, {
      group,
      chat
    });
  } catch (error) {
    console.error('[getGroupConversationByChatId]', error);
    return serverError(res, error);
  }
};


// 5. Get messages (paginated)
exports.getGroupMessages = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { groupId, chatId } = req.params;
    if (!ensureObjectIdParam(res, groupId, 'groupId')) return;
    if (!ensureObjectIdParam(res, chatId, 'chatId')) return;

    const group = await Group.findOne({ _id: groupId, isRemoved: false });
    const vis = await ensureGroupVisibility(group, user.id);
    if (!vis.ok) {
      return vis.code === 403 ? forbidden(res, vis.message) : notFound(res, vis.message);
    }

    // Ensure chat belongs to group snapshot (synced participants)
    await ensureGroupChatExistsAndSynced(group);

    const { page, limit, skip } = parsePage(req);

    const chat = await Chat.findOne(
      {
        _id: chatId,
        type: 'group',
        isRemoved: false
      },
      sliceMessagesProjection(skip, limit)
    ).populate('messages.sender', 'profile.fullName profile.avatar');

    if (!chat) return notFound(res, 'Chat not found');

    // 🔐 explicit access check
    const isParticipant = chat.participants.some(
      (p) => String(p) === String(user.id)
    );

    if (!isParticipant) {
      return forbidden(res, 'Not a participant in this chat');
    }

    const totalMessages = await Chat.findById(chatId).select('messages').lean();
    const total = totalMessages?.messages?.length || 0;

    return ok(res, chat.messages || [], null, {
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    return serverError(res, error);
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

    const { ciphertext, iv, tag, type = 'text', sharedPost } = req.body;

    if (!ciphertext || !iv || !tag) return bad(res, 'ciphertext, iv, and tag are required');
    if (!['text', 'share'].includes(type)) return bad(res, 'Invalid message type');

    const group = await Group.findOne({ _id: groupId, isRemoved: false });
    const vis = await ensureGroupVisibility(group, user.id);
    if (!vis.ok) {
      return vis.code === 403 ? forbidden(res, vis.message) : notFound(res, vis.message);
    }

    // Ensure synced
    await ensureGroupChatExistsAndSynced(group);

    // Validate shared post if share
    if (type === 'share') {
      if (!sharedPost || !isValidObjectId(sharedPost)) return bad(res, 'sharedPost is required');
      const postExists = await Post.exists({ _id: sharedPost, isRemoved: false });
      if (!postExists) return notFound(res, 'Post not found');
    }

    const updated = await Chat.findOneAndUpdate(
      { _id: chatId, type: 'group', isRemoved: false, participants: user.id },
      {
        $push: {
          messages: {
            sender: user.id,
            ciphertext,
            iv,
            tag,
            type,
            sharedPost: type === 'share' ? sharedPost : null
          }
        },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    ).populate('messages.sender', 'name avatar');

    if (!updated) return notFound(res, 'Chat not found or access denied');

    return ok(res, updated.messages[updated.messages.length - 1], 'Message sent');
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

    const chat = await Chat.findOne({ _id: chatId, type: 'group', isRemoved: false });
    if (!chat) return notFound(res, 'Chat not found');

    // Find message to authorize deletion
    const msg = (chat.messages || []).find((m) => String(m._id) === String(messageId));
    if (!msg) return notFound(res, 'Message not found');

    const canDelete =
      String(msg.sender) === String(user.id) ||
      isGroupAdminOrCreator(group, user.id) ||
      hasRole(user, ['moderator', 'admin']);

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

/* =====================================================
   MESSAGE REACTIONS
===================================================== */
exports.reactToMessage = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { chatId, messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string') {
      return bad(res, 'emoji is required');
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: user.id,
      'messages._id': messageId
    });

    if (!chat) return notFound(res, 'Message not found');

    const msg = chat.messages.id(messageId);

    // Toggle reaction (WhatsApp-style)
    const existing = msg.reactions.find(
      (r) => String(r.user) === String(user.id) && r.emoji === emoji
    );

    if (existing) {
      msg.reactions = msg.reactions.filter(
        (r) => !(String(r.user) === String(user.id) && r.emoji === emoji)
      );
    } else {
      msg.reactions.push({ user: user.id, emoji });
    }

    await chat.save();

    return ok(res, msg.reactions, 'Reaction updated');
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
    if (!ensureObjectIdParam(res, groupId, 'groupId')) return;
    if (!ensureObjectIdParam(res, chatId, 'chatId')) return;
    if (!ensureObjectIdParam(res, messageId, 'messageId')) return;

    const group = await Group.findOne({ _id: groupId, isRemoved: false });
    if (!group) return notFound(res, 'Group not found');

    if (!isGroupAdminOrCreator(group, user.id)) {
      return forbidden(res, 'Only admins can pin messages');
    }

    const chat = await Chat.findOne({ _id: chatId, type: 'group' });
    if (!chat) return notFound(res, 'Chat not found');

    chat.pinnedMessage = messageId;
    await chat.save();

    return ok(res, messageId, 'Message pinned');
  } catch (error) {
    return serverError(res, error);
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
      const canDelete =
        String(msg.sender) === String(user.id) ||
        hasRole(user, ['admin', 'moderator']);

      if (!canDelete) return forbidden(res, 'Not allowed');

      msg.isDeletedForEveryone = true;
    } else {
      msg.deletedFor.addToSet(user.id);
    }

    await chat.save();

    return ok(res, null, 'Message deleted');
  } catch (error) {
    return serverError(res, error);
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

    const query = {
      isRemoved: false,
      ...(mine ? { members: user.id } : {})
    };

    const [hubs, total] = await Promise.all([
      Hub.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Hub.countDocuments(query)
    ]);

    const data = hubs.map((h) => ({
      _id: h._id,
      name: h.name,
      description: h.description,
      avatar: h.avatar,
      type: h.type,
      region: h.region,
      membersCount: h.membersCount, // virtual
      isMember: (h.members || []).some((m) => String(m) === String(user.id))
    }));

    return ok(res, data, null, {
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    return serverError(res, error);
  }
};

// 3. Get hub by ID (full hub info)
exports.getHubById = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { hubId } = req.params;
    if (!ensureObjectIdParam(res, hubId, 'hubId')) return;

    const hub = await Hub.findOne({ _id: hubId, isRemoved: false })
      .populate('moderators', 'name avatar')
      .populate({ path: 'members', select: 'name avatar' });

    if (!hub) return notFound(res, 'Hub not found');

    const isMember = (hub.members || []).some((m) => String(m._id || m) === String(user.id));
    const isModerator = isHubModeratorOrAdmin(hub, user);

    return ok(res, { ...hub.toObject(), isMember, isModerator });
  } catch (error) {
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

    const hub = await Hub.findOne({ _id: hubId, isRemoved: false });
    if (!hub) return notFound(res, 'Hub not found');

    const already = (hub.members || []).some((m) => String(m) === String(user.id));
    if (already) return ok(res, hub, 'Already a member');

    hub.members.push(user.id);
    await hub.save();

    return ok(res, hub, 'Joined hub');
  } catch (error) {
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

    const hub = await Hub.findOne({ _id: hubId, isRemoved: false });
    if (!hub) return notFound(res, 'Hub not found');

    // Prevent last moderator from leaving (unless admin)
    const isModerator = isHubModeratorOrAdmin(hub, user);
    if (isModerator && !hasRole(user, ['admin'])) {
      const moderatorCount = (hub.moderators || []).length;
      if (moderatorCount <= 1) {
        return bad(res, 'Last moderator cannot leave hub. Assign another moderator first.');
      }
    }

    hub.members = (hub.members || []).filter((m) => String(m) !== String(user.id));
    hub.moderators = (hub.moderators || []).filter((m) => String(m) !== String(user.id));
    await hub.save();

    return ok(res, hub, 'Left hub');
  } catch (error) {
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

    const hub = await Hub.findOne({ _id: hubId, isRemoved: false });
    if (!hub) return notFound(res, 'Hub not found');

    if (!isHubModeratorOrAdmin(hub, user) && !hasRole(user, ['moderator', 'admin'])) {
      return forbidden(res, 'Only moderators can update hubs');
    }

    const allowed = pick(req.body, ['name', 'description', 'avatar', 'type', 'region']);
    if (allowed.type && !['regional', 'international', 'global'].includes(allowed.type)) {
      return bad(res, 'Invalid hub type');
    }

    if (allowed.type === 'regional' && (!allowed.region || typeof allowed.region !== 'string')) {
      return bad(res, 'region is required for regional hubs');
    }

    if (allowed.name && typeof allowed.name === 'string') {
      allowed.name = allowed.name.trim();
      if (allowed.name.length < 2) return bad(res, 'Hub name too short');
    }

    Object.assign(hub, allowed);
    await hub.save();

    return ok(res, hub, 'Hub updated');
  } catch (error) {
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

    const hub = await Hub.findOne({ _id: hubId, isRemoved: false });
    if (!hub) return notFound(res, 'Hub not found');

    if (!isHubModeratorOrAdmin(hub, user) && !hasRole(user, ['admin'])) {
      return forbidden(res, 'Only moderators can delete hubs');
    }

    hub.isRemoved = true;
    await hub.save();

    return ok(res, null, 'Hub deleted');
  } catch (error) {
    return serverError(res, error);
  }
};

/* =====================================================
   CHAT (DM + Group) — Comprehensive message APIs
===================================================== */

// 1. Create chat (DM or group)
exports.createChat = async (req, res) => {
  try {
    const { type = 'dm', participants = [] } = req.body;
    const userId = req.user.id;

    const cleanParticipants = [
      userId,
      ...participants.map(normalizeId)
    ].filter((v, i, arr) => v && arr.indexOf(v) === i);

    if (type === 'dm' && cleanParticipants.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Direct messages require exactly 2 participants'
      });
    }

    if (type === 'dm') {
      const existing = await Chat.findOne({
        type: 'dm',
        participants: {
          $all: cleanParticipants,
          $size: cleanParticipants.length
        },
        isRemoved: false
      });

      if (existing) {
        return res.json({
          success: true,
          data: existing,
          existing: true
        });
      }
    }

    const chat = await Chat.create({
      type,
      participants: cleanParticipants,
      messages: []
    });

    res.status(201).json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('CREATE CHAT ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating chat'
    });
  }
};


// 2. Get chats
exports.getChats = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { page, limit, skip } = parsePage(req);
    const { type } = req.query;

    const query = {
      participants: user.id,
      isRemoved: false,
      ...(type ? { type } : {})
    };

    const [chats, total] = await Promise.all([
      Chat.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Chat.countDocuments(query)
    ]);

    // unreadCount cannot be truly computed without a read state model; keep stable shape.
    const data = chats.map((c) => ({
      ...c.toObject(),
      unreadCount: 0
    }));

    return ok(res, data, null, {
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    return serverError(res, error);
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
      return res.status(400).json({ success: false, message: 'Invalid chatId' });
    }

    // 1️⃣ Fetch chat WITHOUT participant filter
    const chat = await Chat.findOne({
      _id: chatId,
      isRemoved: false
    }).populate('messages.sender', 'profile.fullName profile.avatar');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // 2️⃣ Explicit participant check (robust)
    const isParticipant = chat.participants.some(
      (p) => String(p) === String(user.id)
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this chat'
      });
    }

    return res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('[getChatById]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


// 4. Get messages (paginated)
exports.getMessages = async (req, res) => {
  try {
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { chatId } = req.params;
    if (!ensureObjectIdParam(res, chatId, 'chatId')) return;

    const { page, limit, skip } = parsePage(req);

    const chat = await Chat.findOne(
      { _id: chatId, participants: user.id, isRemoved: false },
      sliceMessagesProjection(skip, limit)
    ).populate('messages.sender', 'name avatar');

    if (!chat) return notFound(res, 'Chat not found or access denied');

    const totalDoc = await Chat.findById(chatId).select('messages').lean();
    const total = totalDoc?.messages?.length || 0;

    return ok(res, chat.messages || [], null, {
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    return serverError(res, error);
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
    if (!ensureObjectIdParam(res, chatId, 'chatId')) return;

    const { ciphertext, iv, tag, type = 'text', sharedPost } = req.body;

    if (!ciphertext || !iv || !tag) return bad(res, 'ciphertext, iv, and tag are required');
    if (!['text', 'share'].includes(type)) return bad(res, 'Invalid message type');

    if (type === 'share') {
      if (!sharedPost || !isValidObjectId(sharedPost)) return bad(res, 'sharedPost is required');
      const postExists = await Post.exists({ _id: sharedPost, isRemoved: false });
      if (!postExists) return notFound(res, 'Post not found');
    }

    const updatedChat = await Chat.findOneAndUpdate(
      { _id: chatId, isRemoved: false, participants: user.id },
      {
        $push: {
          messages: {
            sender: user.id,
            ciphertext,
            iv,
            tag,
            type,
            sharedPost: type === 'share' ? sharedPost : null
          }
        },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    ).populate('messages.sender', 'name avatar');

    if (!updatedChat) return notFound(res, 'Chat not found or access denied');

    const newMsg = updatedChat.messages[updatedChat.messages.length - 1];
    return ok(res, newMsg, 'Message sent');
  } catch (error) {
    return serverError(res, error);
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

    // Optional filters: ?group=, ?hub=, ?live=true
    const query = { isRemoved: false };

    if (req.query.group) {
      if (!isValidObjectId(req.query.group)) return bad(res, 'Invalid group filter');
      query.group = req.query.group;
    }

    if (req.query.hub) {
      if (!isValidObjectId(req.query.hub)) return bad(res, 'Invalid hub filter');
      query.hub = req.query.hub;
    }

    const [voices, total] = await Promise.all([
      Voice.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Voice.countDocuments(query)
    ]);

    let data = voices.map((v) => v.toObject());

    if (String(req.query.live || 'false') === 'true') {
      data = data.filter((v) => v.isLive === true);
    }

    return ok(res, data, null, {
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
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

    const { voiceId } = req.params;
    if (!ensureObjectIdParam(res, voiceId, 'voiceId')) return;

    const voice = await Voice.findOne({ _id: voiceId, isRemoved: false })
      .populate('host', 'name avatar')
      .populate('group', 'name avatar privacy')
      .populate('hub', 'name avatar type region');

    if (!voice) return notFound(res, 'Voice not found');

    // If voice tied to group/hub, enforce access for private contexts
    if (voice.group) {
      const g = await Group.findOne({ _id: voice.group._id, isRemoved: false });
      const vis = await ensureGroupVisibility(g, user.id);
      if (!vis.ok) return forbidden(res, 'No access to this voice room');
    }

    if (voice.hub) {
      const h = await Hub.findOne({ _id: voice.hub._id, isRemoved: false });
      const isMember = (h.members || []).some((m) => String(m) === String(user.id));
      if (!isMember && !hasRole(user, ['admin'])) return forbidden(res, 'No access to this voice room');
    }

    return ok(res, voice);
  } catch (error) {
    return serverError(res, error);
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
    const user = ensureAuthUser(req, res);
    if (!user) return;

    const { voiceId } = req.params;
    if (!ensureObjectIdParam(res, voiceId, 'voiceId')) return;

    const voice = await Voice.findOne({ _id: voiceId, isRemoved: false });
    if (!voice) return notFound(res, 'Voice not found');

    const instance = (voice.instances || []).find((i) => i.status === 'live');
    if (!instance) return bad(res, 'No live instance available');

    const already = (instance.participants || []).some((p) => String(p) === String(user.id));
    if (already) return ok(res, instance, 'Already joined');

    instance.participants.push(user.id);
    await voice.save();

    return ok(res, instance, 'Joined voice');
  } catch (error) {
    return serverError(res, error);
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
