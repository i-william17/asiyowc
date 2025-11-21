const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Program title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Program description is required'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [500, 'Short description cannot be more than 500 characters']
  },
  category: {
    type: String,
    enum: ['leadership', 'finance', 'wellness', 'advocacy', 'entrepreneurship', 'education'],
    required: true
  },
  image: {
    url: String,
    publicId: String
  },
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  price: {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'KES' },
    isFree: { type: Boolean, default: true }
  },
  modules: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    duration: String,
    content: String,
    resources: [{
      title: String,
      url: String,
      type: String
    }],
    order: Number,
    isPublished: { type: Boolean, default: false }
  }],
  requirements: [String],
  learningOutcomes: [String],
  badges: [String],
  maxParticipants: {
    type: Number,
    default: 0
  },
  enrolledUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completedAt: Date,
    certificateIssued: { type: Boolean, default: false }
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'completed'],
    default: 'draft'
  },
  startDate: Date,
  endDate: Date,
  isFeatured: {
    type: Boolean,
    default: false
  },
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  statistics: {
    views: { type: Number, default: 0 },
    enrollments: { type: Number, default: 0 },
    completions: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes
programSchema.index({ category: 1, status: 1 });
programSchema.index({ mentor: 1 });
programSchema.index({ isFeatured: 1, status: 1 });
programSchema.index({ 'enrolledUsers.user': 1 });
programSchema.index({ createdAt: -1 });

// Virtuals
programSchema.virtual('enrollmentCount').get(function() {
  return this.enrolledUsers.length;
});

programSchema.virtual('completionCount').get(function() {
  return this.enrolledUsers.filter(enrollment => enrollment.completedAt).length;
});

// Methods
programSchema.methods.enrollUser = function(userId) {
  const existingEnrollment = this.enrolledUsers.find(
    enrollment => enrollment.user.toString() === userId.toString()
  );

  if (existingEnrollment) {
    throw new Error('User already enrolled in this program');
  }

  if (this.maxParticipants > 0 && this.enrolledUsers.length >= this.maxParticipants) {
    throw new Error('Program has reached maximum participants');
  }

  this.enrolledUsers.push({
    user: userId,
    enrolledAt: new Date()
  });

  this.statistics.enrollments += 1;
};

programSchema.methods.updateProgress = function(userId, progress) {
  const enrollment = this.enrolledUsers.find(
    enrollment => enrollment.user.toString() === userId.toString()
  );

  if (!enrollment) {
    throw new Error('User not enrolled in this program');
  }

  enrollment.progress = Math.min(100, Math.max(0, progress));

  if (progress >= 100 && !enrollment.completedAt) {
    enrollment.completedAt = new Date();
    enrollment.certificateIssued = true;
    this.statistics.completions += 1;
  }
};

programSchema.methods.addRating = function(rating) {
  const newTotal = this.ratings.average * this.ratings.count + rating;
  this.ratings.count += 1;
  this.ratings.average = newTotal / this.ratings.count;
};

module.exports = mongoose.model('Program', programSchema);
