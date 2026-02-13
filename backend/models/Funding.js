const mongoose = require('mongoose');

const fundingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Funding title is required'],
    trim: true
  },
  provider: {
    type: String,
    required: [true, 'Provider name is required'],
    trim: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Provider ID is required']
  },
  description: {
    type: String,
    required: [true, 'Funding description is required']
  },
  amount: {
    type: String,
    required: [true, 'Funding amount is required']
  },
  type: {
    type: String,
    required: [true, 'Funding type is required'],
    enum: ['grant', 'loan', 'scholarship', 'fellowship', 'prize']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['technology', 'agriculture', 'education', 'healthcare', 'women', 'youth', 'other']
  },
  eligibility: {
    type: String,
    trim: true
  },
  deadline: {
    type: Date,
    required: [true, 'Application deadline is required']
  },
  applicationProcess: [{
    type: String,
    trim: true
  }],
  applicationCount: {
    type: Number,
    default: 0
  },
  awardedCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'coming_soon', 'completed'],
    default: 'open'
  },
  focusAreas: [{
    type: String,
    trim: true
  }],
  requirements: [{
    type: String,
    trim: true
  }],
  contactEmail: {
    type: String,
    required: [true, 'Contact email is required'],
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  website: {
    type: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  views: {
    type: Number,
    default: 0
  },
  favoritesCount: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
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
fundingSchema.index({ title: 'text', description: 'text', focusAreas: 'text' });
fundingSchema.index({ type: 1, category: 1, status: 1 });
fundingSchema.index({ deadline: 1, status: 1 });
fundingSchema.index({ isVerified: 1, createdAt: -1 });

// Virtual for time left
fundingSchema.virtual('timeLeft').get(function() {
  if (this.status !== 'open') return 'Closed';
  
  const now = new Date();
  const diffInMs = this.deadline - now;
  
  if (diffInMs <= 0) return 'Closed';
  
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  if (diffInDays > 30) return `${Math.floor(diffInDays / 30)} months left`;
  if (diffInDays > 0) return `${diffInDays} days left`;
  
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  if (diffInHours > 0) return `${diffInHours} hours left`;
  
  return 'Less than an hour left';
});

module.exports = mongoose.model('Funding', fundingSchema);