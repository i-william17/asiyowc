const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true
  },
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Company ID is required']
  },
  description: {
    type: String,
    required: [true, 'Job description is required']
  },
  type: {
    type: String,
    required: [true, 'Job type is required'],
    enum: ['full-time', 'part-time', 'contract', 'remote', 'internship']
  },
  location: {
    type: String,
    required: [true, 'Location is required']
  },
  salary: {
    type: String,
    required: [true, 'Salary information is required']
  },
  requirements: [{
    type: String,
    trim: true
  }],
  skills: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    required: [true, 'Job category is required'],
    enum: ['technology', 'marketing', 'finance', 'healthcare', 'education', 'other']
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'executive'],
    default: 'mid'
  },
  applicationDeadline: {
    type: Date
  },
  applicationCount: {
    type: Number,
    default: 0
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contactEmail: {
    type: String,
    required: [true, 'Contact email is required'],
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  status: {
    type: String,
    enum: ['active', 'filled', 'closed', 'expired'],
    default: 'active'
  },
  views: {
    type: Number,
    default: 0
  },
  isRemote: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
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
jobSchema.index({ title: 'text', description: 'text', skills: 'text' });
jobSchema.index({ type: 1, location: 1, category: 1 });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ isRemote: 1, createdAt: -1 });

// Virtual for time since posting
jobSchema.virtual('posted').get(function() {
  const now = new Date();
  const diffInHours = Math.floor((now - this.createdAt) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} months ago`;
});

module.exports = mongoose.model('Job', jobSchema);