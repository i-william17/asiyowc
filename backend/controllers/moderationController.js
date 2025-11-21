const Post = require('../models/Post');
const User = require('../models/User');

exports.getFlaggedContent = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const flaggedPosts = await Post.find({
      'moderation.status': 'flagged'
    })
    .populate('author', 'profile firstName lastName avatar')
    .populate('moderation.flaggedBy.user', 'profile firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Post.countDocuments({ 'moderation.status': 'flagged' });

    res.json({
      success: true,
      data: {
        posts: flaggedPosts,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.moderatePost = async (req, res) => {
  try {
    const { action, notes } = req.body;
    const { id } = req.params;

    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    post.moderation.status = action; // 'approved' or 'rejected'
    post.moderation.moderatedBy = req.user.id;
    post.moderation.moderationNotes = notes;

    await post.save();

    res.json({
      success: true,
      message: `Post ${action} successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getModerationStats = async (req, res) => {
  try {
    const [pendingCount, flaggedCount, approvedCount, rejectedCount] = await Promise.all([
      Post.countDocuments({ 'moderation.status': 'pending' }),
      Post.countDocuments({ 'moderation.status': 'flagged' }),
      Post.countDocuments({ 'moderation.status': 'approved' }),
      Post.countDocuments({ 'moderation.status': 'rejected' })
    ]);

    res.json({
      success: true,
      data: {
        pending: pendingCount,
        flagged: flaggedCount,
        approved: approvedCount,
        rejected: rejectedCount,
        total: pendingCount + flaggedCount + approvedCount + rejectedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};