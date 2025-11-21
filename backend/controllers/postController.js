const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');

exports.createPost = async (req, res) => {
  try {
    const { content, type, category, visibility, group } = req.body;
    const images = req.files ? req.files.map(file => file.path) : [];

    const post = await Post.create({
      author: req.user.id,
      content: {
        text: content.text,
        images
      },
      type,
      category,
      visibility,
      group
    });

    // Update user's post count
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.postsCount': 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: { post }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    
    const query = { 
      'moderation.status': 'approved',
      visibility: 'public'
    };
    
    if (category && category !== 'All') {
      query.category = category;
    }

    const posts = await Post.find(query)
      .populate('author', 'profile firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts,
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

exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const alreadyLiked = post.engagement.likes.includes(req.user.id);
    
    if (alreadyLiked) {
      post.engagement.likes.pull(req.user.id);
    } else {
      post.engagement.likes.push(req.user.id);
      
      // Create notification for post author
      if (post.author.toString() !== req.user.id) {
        await Notification.create({
          recipient: post.author,
          type: 'post_like',
          title: 'New Like',
          message: `${req.user.profile.firstName} liked your post`,
          relatedEntity: {
            type: 'post',
            id: post._id
          }
        });
      }
    }

    await post.save();

    res.json({
      success: true,
      message: alreadyLiked ? 'Post unliked' : 'Post liked',
      data: { likes: post.engagement.likes.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    post.engagement.comments.push({
      user: req.user.id,
      text
    });

    await post.save();

    // Create notification for post author
    if (post.author.toString() !== req.user.id) {
      await Notification.create({
        recipient: post.author,
        type: 'post_comment',
        title: 'New Comment',
        message: `${req.user.profile.firstName} commented on your post`,
        relatedEntity: {
          type: 'post',
          id: post._id
        }
      });
    }

    // Populate the new comment
    await post.populate('engagement.comments.user', 'profile firstName lastName avatar');

    const newComment = post.engagement.comments[post.engagement.comments.length - 1];

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: { comment: newComment }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.flagPost = async (req, res) => {
  try {
    const { reason } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    post.moderation.flaggedBy.push({
      user: req.user.id,
      reason,
      timestamp: new Date()
    });

    post.moderation.status = 'flagged';
    await post.save();

    res.json({
      success: true,
      message: 'Post flagged for moderation'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};