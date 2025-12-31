const mongoose = require('mongoose');
const Post = require('../models/Post');
const Group = require('../models/Group');
const Hub = require('../models/Hub');
const Report = require('../models/Report');
const { deleteFromCloudinary } = require('../middleware/upload');

/* =========================================================================
  UTIL: pagination parsing
======================================================================== */
function parsePagination(req) {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/* =========================================================================
  UTIL: normalize arrays from req.body
======================================================================== */
function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function normalizeSharedTo(req) {
  // Supports JSON body: { sharedTo: { groups: [], hubs: [] } }
  // And multipart bracket form: sharedTo[groups][], sharedTo[hubs][]
  const groups = req.body?.sharedTo?.groups
    ? toArray(req.body.sharedTo.groups)
    : req.body['sharedTo[groups][]']
      ? toArray(req.body['sharedTo[groups][]'])
      : [];

  const hubs = req.body?.sharedTo?.hubs
    ? toArray(req.body.sharedTo.hubs)
    : req.body['sharedTo[hubs][]']
      ? toArray(req.body['sharedTo[hubs][]'])
      : [];

  return { groups, hubs };
}

function normalizeContent(req) {
  // Supports JSON body: { content: { text, linkUrl } }
  // And multipart bracket form: content[text], content[linkUrl]
  return {
    text: req.body?.content?.text ?? req.body['content[text]'],
    linkUrl: req.body?.content?.linkUrl ?? req.body['content[linkUrl]']
  };
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/* =========================================================================
  ACCESS HELPERS
======================================================================== */
async function getAccessibleGroups(userId) {
  const groups = await Group.find({
    isRemoved: false,
    isArchived: false,
    $or: [
      { 'members.user': userId },
      { admins: userId },
      { createdBy: userId },
      { privacy: 'public' }
    ]
  }).select('_id');

  return groups.map(g => g._id);
}


async function getAccessibleHubs(userId) {
  const hubs = await Hub.find({
    isRemoved: false,
    members: userId
  }).select('_id');

  return hubs.map(h => h._id);
}


async function assertGroupPostAccess(userId, groupId) {
  if (!isValidObjectId(groupId)) return false;

  const group = await Group.findOne({
    _id: groupId,
    isRemoved: false,
    isArchived: false,
    $or: [
      { 'members.user': userId },   // ✅ FIX
      { admins: userId },
      { createdBy: userId },
      { privacy: 'public' }
    ]
  }).select('_id');

  return !!group;
}


async function assertHubPostAccess(userId, hubId) {
  if (!isValidObjectId(hubId)) return false;

  const hub = await Hub.findOne({
    _id: hubId,
    isRemoved: false,
    members: userId
  }).select('_id');

  return !!hub;
}

async function checkPostAccess(post, userId) {
  if (!post || post.isRemoved) return false;
  if (post.visibility === 'public') return true;
  if (post.author && post.author.equals(userId)) return true;

  if (post.visibility === 'group') {
    const groups = await getAccessibleGroups(userId);
    const postGroups = (post.sharedTo?.groups || []).map(g => (g?._id ? g._id : g));
    return postGroups.some(g => groups.some(ug => ug.equals(g)));
  }

  if (post.visibility === 'hub') {
    const hubs = await getAccessibleHubs(userId);
    const postHubs = (post.sharedTo?.hubs || []).map(h => (h?._id ? h._id : h));
    return postHubs.some(h => hubs.some(uh => uh.equals(h)));
  }

  return false;
}

/* =========================================================================
  RULES: validate visibility + sharedTo consistency
======================================================================== */
function assertVisibilityConsistency(visibility, sharedTo) {
  const groupsLen = sharedTo?.groups?.length || 0;
  const hubsLen = sharedTo?.hubs?.length || 0;

  if (visibility === 'group' && groupsLen === 0) {
    return { ok: false, message: 'visibility=group requires sharedTo.groups' };
  }
  if (visibility === 'hub' && hubsLen === 0) {
    return { ok: false, message: 'visibility=hub requires sharedTo.hubs' };
  }
  // public can have empty or non-empty sharedTo, but we enforce a rule below in share/unshare
  return { ok: true };
}

/* =========================================================================
  MEDIA
======================================================================== */
function extractMedia(req) {
  if (!req.file) return null;

  return {
    url: req.file.path,
    publicId: req.file.filename,
    mimetype: req.file.mimetype
  };
}

/* =========================================================================
  CREATE POST
======================================================================== */
exports.createPost = async (req, res) => {
  let media = null;

  try {
    const author = req.user.id;

    const content = normalizeContent(req);
    const sharedTo = normalizeSharedTo(req);

    const visibility = req.body.visibility || 'public';
    const type = req.body.type || 'text';

    // Consistency checks first
    const consistency = assertVisibilityConsistency(visibility, sharedTo);
    if (!consistency.ok) {
      return res.status(400).json({ success: false, message: consistency.message });
    }

    // Access enforcement (only if actually targeting group/hub visibility)
    if (visibility === 'group') {
      for (const gid of sharedTo.groups) {
        const ok = await assertGroupPostAccess(author, gid);
        if (!ok) return res.status(403).json({ success: false, message: `No access to group ${gid}` });
      }
    }

    if (visibility === 'hub') {
      for (const hid of sharedTo.hubs) {
        const ok = await assertHubPostAccess(author, hid);
        if (!ok) return res.status(403).json({ success: false, message: `No access to hub ${hid}` });
      }
    }

    const postData = {
      author,
      type: req.body.type || type,
      visibility,
      content: {
        ...(req.body.content || {})   // ✅ PRESERVE imageUrl / videoUrl
      },
      sharedTo: {
        groups: sharedTo.groups || [],
        hubs: sharedTo.hubs || []
      }
    };

    /* ✅ MERGE TEXT / LINK */
    if (content.text !== undefined) {
      postData.content.text = content.text;
    }

    if (content.linkUrl !== undefined) {
      postData.content.linkUrl = content.linkUrl;
    }

    const post = await Post.create(postData);
    return res.status(201).json({ success: true, data: post });
  } catch (error) {
    // cleanup uploaded media if create fails
    if (media?.publicId) {
      await deleteFromCloudinary(media.publicId).catch(() => { });
    }
    return res.status(500).json({ success: false, message: 'Create failed', error: error.message });
  }
};

/* =========================================================================
  UPDATE POST
======================================================================== */
exports.updatePost = async (req, res) => {
  let newMedia = null;

  try {
    const userId = req.user.id;
    const postId = req.params.postId;

    const post = await Post.findOne({ _id: postId, isRemoved: false });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (!post.author.equals(userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Parse possible updates
    const incomingContent = normalizeContent(req);
    const incomingSharedTo = req.body.sharedTo || req.body['sharedTo[groups][]'] || req.body['sharedTo[hubs][]']
      ? normalizeSharedTo(req)
      : null;

    const nextVisibility = req.body.visibility || post.visibility;
    const nextSharedTo = incomingSharedTo
      ? { groups: incomingSharedTo.groups || [], hubs: incomingSharedTo.hubs || [] }
      : (post.sharedTo?.toObject ? post.sharedTo.toObject() : (post.sharedTo || { groups: [], hubs: [] }));

    // Enforce consistency if visibility/sharedTo touched
    if (req.body.visibility || incomingSharedTo) {
      const consistency = assertVisibilityConsistency(nextVisibility, nextSharedTo);
      if (!consistency.ok) {
        return res.status(400).json({ success: false, message: consistency.message });
      }
    }

    // Enforce access if moving into groups/hubs
    if ((req.body.visibility || incomingSharedTo) && nextVisibility === 'group') {
      for (const gid of nextSharedTo.groups) {
        const ok = await assertGroupPostAccess(userId, gid);
        if (!ok) return res.status(403).json({ success: false, message: `No access to group ${gid}` });
      }
    }
    if ((req.body.visibility || incomingSharedTo) && nextVisibility === 'hub') {
      for (const hid of nextSharedTo.hubs) {
        const ok = await assertHubPostAccess(userId, hid);
        if (!ok) return res.status(403).json({ success: false, message: `No access to hub ${hid}` });
      }
    }

    // Media replace
    newMedia = extractMedia(req);
    if (newMedia) {
      if (post.content?.mediaPublicId) {
        await deleteFromCloudinary(post.content.mediaPublicId).catch(() => { });
      }

      const isVideo = newMedia.mimetype.startsWith('video/');
      post.type = isVideo ? 'video' : 'image';
      post.content.imageUrl = isVideo ? null : newMedia.url;
      post.content.videoUrl = isVideo ? newMedia.url : null;
      post.content.mediaPublicId = newMedia.publicId;
      post.content.mediaMime = newMedia.mimetype;
    }

    // Content updates (only when provided)
    if (incomingContent.text !== undefined) post.content.text = incomingContent.text;
    if (incomingContent.linkUrl !== undefined) post.content.linkUrl = incomingContent.linkUrl;

    // Other updates
    if (req.body.type) post.type = req.body.type;
    if (req.body.visibility) post.visibility = req.body.visibility;
    if (incomingSharedTo) post.sharedTo = nextSharedTo;

    await post.save();
    return res.json({ success: true, data: post });
  } catch (error) {
    // cleanup newly uploaded media on failure
    if (newMedia?.publicId) {
      await deleteFromCloudinary(newMedia.publicId).catch(() => { });
    }
    return res.status(500).json({ success: false, message: 'Update failed', error: error.message });
  }
};

/* =========================================================================
  DELETE POST
======================================================================== */
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.postId, isRemoved: false });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (!post.author.equals(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (post.content?.mediaPublicId) {
      await deleteFromCloudinary(post.content.mediaPublicId).catch(() => { });
    }

    post.isRemoved = true;
    await post.save();
    return res.json({ success: true, message: 'Post removed' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Delete failed', error: error.message });
  }
};

/* =========================================================================
  SHARE / UNSHARE
  - Enforces consistency:
    * share into groups => visibility becomes 'group'
    * share into hubs   => visibility becomes 'hub'
    * disallow mixing groups + hubs in one call (keeps visibility deterministic)
======================================================================== */
exports.sharePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;

    const groups = toArray(req.body.groups);
    const hubs = toArray(req.body.hubs);

    if (groups.length === 0 && hubs.length === 0) {
      return res.status(400).json({ success: false, message: 'Provide groups or hubs to share to' });
    }

    // keep visibility deterministic (optional but safest)
    if (groups.length > 0 && hubs.length > 0) {
      return res.status(400).json({ success: false, message: 'Share to either groups OR hubs in one request' });
    }

    const post = await Post.findOne({ _id: postId, isRemoved: false });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    // Must be able to access the post you're sharing
    if (!(await checkPostAccess(post, userId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Validate target access
    if (groups.length > 0) {
      for (const g of groups) {
        const ok = await assertGroupPostAccess(userId, g);
        if (!ok) return res.status(403).json({ success: false, message: `No access to group ${g}` });
      }
    }

    if (hubs.length > 0) {
      for (const h of hubs) {
        const ok = await assertHubPostAccess(userId, h);
        if (!ok) return res.status(403).json({ success: false, message: `No access to hub ${h}` });
      }
    }

    // Visibility consistency
    const nextVisibility = groups.length > 0 ? 'group' : 'hub';

    const update = {
      $inc: { sharesCount: 1 },
      $set: { visibility: nextVisibility }
    };

    update.$addToSet = {};
    if (groups.length > 0) update.$addToSet['sharedTo.groups'] = { $each: groups };
    if (hubs.length > 0) update.$addToSet['sharedTo.hubs'] = { $each: hubs };

    const updated = await Post.findByIdAndUpdate(post._id, update, { new: true });
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Share failed', error: error.message });
  }
};

exports.unsharePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;

    const groups = toArray(req.body.groups);
    const hubs = toArray(req.body.hubs);

    if (groups.length === 0 && hubs.length === 0) {
      return res.status(400).json({ success: false, message: 'Provide groups or hubs to unshare from' });
    }

    const post = await Post.findOne({ _id: postId, isRemoved: false });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    // Only author can unshare (your current rule)
    if (!post.author.equals(userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Pull requested destinations
    const pullUpdate = { $pull: {} };
    if (groups.length > 0) pullUpdate.$pull['sharedTo.groups'] = { $in: groups };
    if (hubs.length > 0) pullUpdate.$pull['sharedTo.hubs'] = { $in: hubs };

    await Post.findByIdAndUpdate(post._id, pullUpdate, { new: false });

    // Re-fetch and fix visibility if needed
    const updated = await Post.findOne({ _id: postId, isRemoved: false });
    if (!updated) return res.status(404).json({ success: false, message: 'Post not found' });

    const remainingGroups = (updated.sharedTo?.groups || []).length;
    const remainingHubs = (updated.sharedTo?.hubs || []).length;

    // If nothing remains, fallback to public (prevents invisible posts)
    if (remainingGroups === 0 && remainingHubs === 0) {
      updated.visibility = 'public';
      updated.sharedTo = { groups: [], hubs: [] };
      await updated.save();
      return res.json({ success: true, data: updated });
    }

    // If visibility no longer matches remaining destinations, correct it
    if (remainingGroups === 0 && remainingHubs > 0 && updated.visibility !== 'hub') {
      updated.visibility = 'hub';
      await updated.save();
    } else if (remainingHubs === 0 && remainingGroups > 0 && updated.visibility !== 'group') {
      updated.visibility = 'group';
      await updated.save();
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unshare failed', error: error.message });
  }
};

/* =========================================================================
  REACTIONS
  - Validates emoji
  - Enforces post access
  - Prevents negative counts
======================================================================== */
function normalizeEmoji(raw) {
  if (typeof raw !== 'string') return null;
  const emoji = raw.trim();
  if (!emoji) return null;
  if (emoji.length > 64) return null;
  return emoji;
}

exports.reactToPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;
    const emoji = normalizeEmoji(req.body.emoji);

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'emoji is required' });
    }

    const post = await Post.findOne({ _id: postId, isRemoved: false });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    if (!(await checkPostAccess(post, userId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const key = `reactions.${emoji}`;
    const updated = await Post.findByIdAndUpdate(
      postId,
      { $inc: { [key]: 1 } },
      { new: true }
    );

    return res.json({ success: true, data: updated.reactions });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'React failed', error: error.message });
  }
};

exports.removeReaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;
    const emoji = normalizeEmoji(req.body.emoji);

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'emoji is required' });
    }

    const post = await Post.findOne({ _id: postId, isRemoved: false });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    if (!(await checkPostAccess(post, userId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const current =
      (post.reactions?.get?.(emoji)) ??
      (post.reactions?.[emoji]) ??
      0;

    if (current <= 0) {
      return res.json({ success: true, data: post.reactions });
    }

    const key = `reactions.${emoji}`;
    const updated = await Post.findByIdAndUpdate(
      postId,
      { $inc: { [key]: -1 } },
      { new: true }
    );

    return res.json({ success: true, data: updated.reactions });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Remove react failed', error: error.message });
  }
};

/* =========================================================================
  ADD COMMENT (embedded)
======================================================================== */
exports.addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    const { text, parentCommentId = null } = req.body;

    /* ================= VALIDATION ================= */
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Text required'
      });
    }

    /* ================= LOAD POST ================= */
    const post = await Post.findOne({
      _id: postId,
      isRemoved: false
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    /* ================= ACCESS CHECK ================= */
    const allowed = await checkPostAccess(post, userId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    /* ================= ADD COMMENT ================= */
    post.comments.push({
      author: userId,
      text: text.trim(),
      parent: parentCommentId || null
    });

    post.commentsCount = (post.commentsCount || 0) + 1;

    await post.save();

    /* ================= POPULATE CORRECTLY ================= */
    await post.populate({
      path: 'comments.author',
      select: 'profile.fullName profile.avatar'
    });

    /* ================= RETURN LAST COMMENT ================= */
    const comment = post.comments[post.comments.length - 1];

    return res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('[addComment]', error);

    return res.status(500).json({
      success: false,
      message: 'Comment failed'
    });
  }
};

/* =========================================================================
  EDIT COMMENT (embedded)
======================================================================== */
exports.editComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId, commentId } = req.params;
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, message: 'text is required' });
    }

    const post = await Post.findOne({ _id: postId, isRemoved: false });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const hasAccess = await checkPostAccess(post, userId);
    if (!hasAccess) return res.status(403).json({ success: false, message: 'Access denied' });

    const comment = post.comments.id(commentId);
    if (!comment || comment.isRemoved) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (!comment.author.equals(userId)) {
      return res.status(403).json({ success: false, message: 'Not allowed to edit this comment' });
    }

    comment.text = text;
    await post.save();

    return res.json({ success: true, data: comment });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error editing comment', error: error.message });
  }
};

/* =========================================================================
  REMOVE COMMENT (soft remove)
======================================================================== */
exports.removeComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId, commentId } = req.params;

    const post = await Post.findOne({ _id: postId, isRemoved: false });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const hasAccess = await checkPostAccess(post, userId);
    if (!hasAccess) return res.status(403).json({ success: false, message: 'Access denied' });

    const comment = post.comments.id(commentId);
    if (!comment || comment.isRemoved) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (!comment.author.equals(userId)) {
      return res.status(403).json({ success: false, message: 'Not allowed to remove this comment' });
    }

    comment.isRemoved = true;
    post.commentsCount = Math.max((post.commentsCount || 0) - 1, 0);

    await post.save();
    return res.json({ success: true, message: 'Comment removed' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error removing comment', error: error.message });
  }
};

/* =========================================================================
  GET POST BY ID (with access)
======================================================================== */
exports.getPostById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const post = await Post.findOne({ _id: postId, isRemoved: false })
      .populate({
        path: 'author',
        select: 'profile.fullName profile.avatar'
      })
      .populate('sharedTo.groups', 'name avatar privacy')
      .populate('sharedTo.hubs', 'name type region')
      .lean();

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const hasAccess = await checkPostAccess(post, userId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.json({
      success: true,
      data: {
        ...post,
        author: {
          _id: post.author?._id,
          fullName: post.author?.profile?.fullName || 'Unknown User',
          avatar: post.author?.profile?.avatar || null
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching post',
      error: error.message
    });
  }
};


/* =========================================================================
  GET COMMENTS
======================================================================== */
exports.getComments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const post = await Post.findOne({ _id: postId, isRemoved: false })
      .populate({
        path: 'comments.author',
        select: 'profile.fullName profile.avatar'
      })
      .lean();

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (!(await checkPostAccess(post, userId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.json({
      success: true,
      data: post.comments.filter(c => !c.isRemoved)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: error.message
    });
  }
};


/* =========================================================================
  GET COMMUNITY FEED (public + group + hub + own posts)
======================================================================== */
exports.getFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, skip } = parsePagination(req);
    const { type, groupId, hubId } = req.query;

    const query = { isRemoved: false };

    const userGroups = await getAccessibleGroups(userId);
    const userHubs = await getAccessibleHubs(userId);

    query.$or = [
      { visibility: 'public' },
      { author: userId },
      { visibility: 'group', 'sharedTo.groups': { $in: userGroups } },
      { visibility: 'hub', 'sharedTo.hubs': { $in: userHubs } }
    ];

    if (groupId) {
      const gid = mongoose.Types.ObjectId(groupId);
      if (!userGroups.some(g => g.equals(gid))) {
        return res.status(403).json({ success: false, message: 'Access denied to this group' });
      }
      query['sharedTo.groups'] = gid;
    }

    if (hubId) {
      const hid = mongoose.Types.ObjectId(hubId);
      if (!userHubs.some(h => h.equals(hid))) {
        return res.status(403).json({ success: false, message: 'Access denied to this hub' });
      }
      query['sharedTo.hubs'] = hid;
    }

    if (type) query.type = type;

    const posts = await Post.find(query)
      .populate({
        path: 'author',
        select: 'profile.fullName profile.avatar'
      })
      .populate('sharedTo.groups', 'name avatar privacy')
      .populate('sharedTo.hubs', 'name type region')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const normalized = posts.map(p => {
      const likesArray = p.reactions?.likes || [];
      const hasLiked = likesArray.some(
        id => String(id) === String(userId)
      );

      return {
        ...p,
        likesCount: p.likesCount || likesArray.length,
        userHasLiked: hasLiked,
        author: {
          _id: p.author?._id,
          fullName: p.author?.profile?.fullName || 'Unknown User',
          avatar: p.author?.profile?.avatar || null
        }
      };
    });

    const total = await Post.countDocuments(query);

    return res.json({
      success: true,
      data: normalized,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[FEED ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching feed',
      error: error.message
    });
  }
};

/* =========================================================================
  TOGGLE LIKE (Instagram-style)
======================================================================== */
exports.toggleLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const post = await Post.findOne({
      _id: postId,
      isRemoved: false
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const alreadyLiked = post.reactions.likes.some(
      id => String(id) === String(userId)
    );

    if (alreadyLiked) {
      // UNLIKE
      post.reactions.likes.pull(userId);
      post.likesCount = Math.max((post.likesCount || 1) - 1, 0);
    } else {
      // LIKE
      post.reactions.likes.push(userId);
      post.likesCount = (post.likesCount || 0) + 1;
    }

    await post.save();

    return res.json({
      success: true,
      data: {
        postId: post._id,
        liked: !alreadyLiked,
        likesCount: post.likesCount
      }
    });
  } catch (error) {
    console.error('[toggleLike] error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle like'
    });
  }
};

/* =========================================================================
  TOGGLE COMMENT LIKE
======================================================================== */
exports.toggleLikeComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId, commentId } = req.params;

    const post = await Post.findOne({ _id: postId, isRemoved: false });
    if (!post) return res.status(404).json({ success: false });

    const comment = post.comments.id(commentId);
    if (!comment || comment.isRemoved) {
      return res.status(404).json({ success: false });
    }

    comment.likes = comment.likes || [];
    comment.likesCount = comment.likesCount || 0;

    const idx = comment.likes.findIndex(
      id => String(id) === String(userId)
    );

    let liked;

    if (idx === -1) {
      comment.likes.push(userId);
      comment.likesCount += 1;
      liked = true;
    } else {
      comment.likes.splice(idx, 1);
      comment.likesCount = Math.max(comment.likesCount - 1, 0);
      liked = false;
    }

    await post.save();

    return res.json({
      success: true,
      data: {
        liked,
        likesCount: comment.likesCount
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Comment like failed',
      error: error.message
    });
  }
};


/* =========================================================================
  GET PUBLIC HIGHLIGHTS (Home-safe read)
======================================================================== */
exports.getPublicHighlights = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const { type } = req.query;

    const query = { isRemoved: false, visibility: 'public' };
    if (type) query.type = type;

    const posts = await Post.find(query)
      .populate({
        path: 'author',
        select: 'profile.fullName profile.avatar'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-comments')
      .lean();

    const normalized = posts.map(p => ({
      ...p,
      author: {
        _id: p.author?._id,
        fullName: p.author?.profile?.fullName || 'Unknown User',
        avatar: p.author?.profile?.avatar || null
      }
    }));

    const total = await Post.countDocuments(query);

    return res.json({
      success: true,
      data: normalized,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching highlights',
      error: error.message
    });
  }
};

/* =========================================================================
  REPORT POST
======================================================================== */
exports.reportPost = async (req, res) => {
  try {
    const reporterId = req.user.id;
    const { postId } = req.params;
    const { reason } = req.body;

    /* ================= VALIDATION ================= */
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reason required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    /* ================= TARGET EXISTS ================= */
    const post = await Post.findOne({
      _id: postId,
      isRemoved: false
    }).select('_id');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    /* ================= DUPLICATE PREVENTION ================= */
    const alreadyReported = await Report.exists({
      reporter: reporterId,
      targetType: 'post',
      targetId: postId
    });

    if (alreadyReported) {
      return res.status(409).json({
        success: false,
        message: 'You have already reported this post'
      });
    }

    /* ================= CREATE REPORT ================= */
    const report = await Report.create({
      reporter: reporterId,
      targetType: 'post',
      targetId: postId,
      reason: reason.trim()
    });

    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: {
        id: report._id,
        status: report.status,
        createdAt: report.createdAt
      }
    });
  } catch (error) {
    console.error('[REPORT POST ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Report failed'
    });
  }
};

