// models/Post.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  isRemoved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'link', 'program', 'voice', 'hub']
    ,
    default: 'text'
  },
  content: {
    text: {
      type: String,
      maxlength: 5000
    },
    imageUrl: {
      type: String // S3/Cloudinary URL
    },
    videoUrl: {
      type: String // S3/Cloudinary URL
    },
    linkUrl: {
      type: String
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'content.refModel'
    },
    refModel: {
      type: String,
      enum: ['Program', 'Voice', 'Hub', null]
    }
  },
  visibility: {
    type: String,
    enum: ['public', 'group', 'hub'],
    default: 'public'
  },
  sharedTo: {
    groups: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    }],
    hubs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub'
    }]
  },
  reactions: {
    type: Map,
    of: Number,
    default: {}
  },
  comments: [commentSchema],
  commentsCount: {
    type: Number,
    default: 0
  },
  sharesCount: {
    type: Number,
    default: 0
  },
  isRemoved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Optimized indexes for feed queries
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ visibility: 1, createdAt: -1 });
postSchema.index({ 'sharedTo.groups': 1, createdAt: -1 });
postSchema.index({ 'sharedTo.hubs': 1, createdAt: -1 });
postSchema.index({ isRemoved: 1 });

module.exports = mongoose.model('Post', postSchema);