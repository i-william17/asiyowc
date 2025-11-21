const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    maxlength: 5000,
    trim: true
  },
  image: {
    url: String,
    publicId: String,
    caption: String
  },
  category: {
    type: String,
    enum: ['leadership', 'finance', 'wellness', 'advocacy', 'legacy', 'general'],
    default: 'general'
  },
  tags: [String],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  savedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  shares: {
    count: { type: Number, default: 0 },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  visibility: {
    type: String,
    enum: ['public', 'community', 'private'],
    default: 'community'
  },
  moderation: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'pending'
    },
    flaggedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reason: String,
      createdAt: Date
    }],
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: Date,
    notes: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ 'moderation.status': 1 });
postSchema.index({ tags: 1 });
postSchema.index({ createdAt: -1 });

// Virtual for comments count
postSchema.virtual('commentsCount').get(function () {
  return this.comments.length;
});

// Virtual for likes count
postSchema.virtual('likesCount').get(function () {
  return this.likes.length;
});

// Methods
postSchema.methods.toggleLike = function (userId) {
  const index = this.likes.indexOf(userId);
  if (index > -1) {
    this.likes.splice(index, 1);
    return false; // unliked
  } else {
    this.likes.push(userId);
    return true; // liked
  }
};

postSchema.methods.flag = function (userId, reason) {
  this.moderation.flaggedBy.push({
    user: userId,
    reason,
    createdAt: new Date()
  });

  if (this.moderation.flaggedBy.length >= 3) {
    this.moderation.status = 'flagged';
  }
};

postSchema.methods.addComment = function (userId, content) {
  this.comments.push({
    user: userId,
    content,
    createdAt: new Date()
  });
};

postSchema.methods.toggleSave = function (userId) {
  const index = this.savedBy.indexOf(userId);
  if (index > -1) {
    this.savedBy.splice(index, 1);
    return false; // unsaved
  } else {
    this.savedBy.push(userId);
    return true; // saved
  }
};

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
