const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  userName: {
    type: String,
    required: [true, 'User name is required']
  },
  avatar: {
    type: String
  },
  skill: {
    type: String,
    required: [true, 'Skill is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Skill category is required'],
    enum: ['design', 'marketing', 'development', 'finance', 'writing', 'consulting', 'other']
  },
  proficiency: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'intermediate'
  },
  offer: {
    type: String,
    required: [true, 'Offer description is required'],
    trim: true
  },
  exchangeFor: {
    type: String,
    required: [true, 'Exchange description is required'],
    trim: true
  },
  about: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Location is required']
  },
  remoteWork: {
    type: Boolean,
    default: true
  },
  portfolioLinks: [{
    type: String
  }],
  experience: {
    years: {
      type: Number,
      default: 0,
      min: 0
    },
    description: String
  },
  availability: {
    status: {
      type: String,
      enum: ['available', 'busy', 'unavailable'],
      default: 'available'
    },
    hoursPerWeek: Number
  },
  requests: [{
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'hidden'],
    default: 'active'
  },
  views: {
    type: Number,
    default: 0
  },
  favoritesCount: {
    type: Number,
    default: 0
  },
  responseRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  languages: [{
    language: String,
    proficiency: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
skillSchema.index({ skill: 'text', offer: 'text', exchangeFor: 'text', tags: 'text' });
skillSchema.index({ category: 1, proficiency: 1, location: 1 });
skillSchema.index({ user: 1, createdAt: -1 });
skillSchema.index({ status: 1, 'rating.average': -1 });
skillSchema.index({ remoteWork: 1, 'availability.status': 1 });

// Virtual for active requests
skillSchema.virtual('activeRequestsCount').get(function() {
  return this.requests.filter(req => req.status === 'pending').length;
});

module.exports = mongoose.model('Skill', skillSchema);