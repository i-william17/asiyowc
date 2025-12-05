const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a program title'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  image: {
    type: String,
    default: 'https://res.cloudinary.com/demo/image/upload/v1234567/program-placeholder.jpg'
  },
  category: {
    type: String,
    enum: ['Leadership', 'Finance', 'Wellness', 'Advocacy', 'Education', 'Business', 'Technology', 'Creative', 'Community'],
    required: true
  },
  subcategory: [String],
  tags: [String],

  duration: {
    value: { type: Number, default: 1 },
    unit: {
      type: String,
      enum: ['days', 'weeks', 'months'],
      default: 'weeks'
    },
    estimatedHours: Number
  },

  startDate: Date,
  endDate: Date,

  status: {
    type: String,
    enum: ['draft', 'upcoming', 'active', 'completed', 'archived', 'cancelled'],
    default: 'draft'
  },

  featured: { type: Boolean, default: false },

  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },

  requirements: [{ title: String, description: String }],
  prerequisites: [String],
  benefits: [{ title: String, description: String }],
  learningOutcomes: [String],

  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  coOrganizers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: String
  }],

  // ============================================================
  // MODULES — completedBy REMOVED (we now track in participants)
  // ============================================================
  modules: [{
    title: { type: String, required: true },
    description: String,
    content: String,
    videoUrl: String,
    resources: [{
      title: String,
      url: String,
      type: { type: String, enum: ['pdf', 'video', 'link', 'document'] }
    }],
    duration: Number, // minutes
    order: Number,

    quiz: {
      questions: [{
        question: String,
        options: [String],
        correctAnswer: Number,
        points: Number
      }],
      passingScore: Number
    }
  }],

  // ============================================================
  // PARTICIPANTS — single source of truth for progress
  // ============================================================
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    enrolledAt: { type: Date, default: Date.now },

    status: {
      type: String,
      enum: ['enrolled', 'active', 'paused', 'completed', 'dropped'],
      default: 'enrolled'
    },

    progress: { type: Number, default: 0, min: 0, max: 100 },
    lastActive: Date,
    completedAt: Date,

    certificate: {
      id: String,
      issuedAt: Date,
      downloadUrl: String,
      verified: Boolean
    },

    grades: [{
      moduleId: mongoose.Schema.Types.ObjectId,
      score: Number,
      maxScore: Number,
      passed: Boolean,
      completedAt: Date
    }],

    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      review: String,
      submittedAt: Date
    },

    // SINGLE SOURCE OF MODULE COMPLETION
    completedModules: [{
      moduleOrder: Number,
      completedAt: Date
    }],

    // Auto filled by middleware
    certificateIssued: { type: Boolean, default: false },

    // Free enrollment or paid
    purchaseStatus: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free'
    }
  }],

  // ============================================================
  // WAITING LIST
  // ============================================================
  capacity: {
    type: Number,
    default: 0 // unlimited
  },

  waitingList: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    notified: { type: Boolean, default: false }
  }],

  // ============================================================
  // PRICE & PAYMENTS
  // ============================================================
  price: {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    paymentPlan: {
      enabled: Boolean,
      installments: Number,
      interval: String
    },
    scholarship: {
      available: Boolean,
      spots: Number,
      criteria: String
    }
  },

  // ============================================================
  // BADGES
  // ============================================================
  badges: [{
    name: String,
    description: String,
    criteria: String,
    image: String,
    type: { type: String, enum: ['completion', 'excellence', 'participation'] }
  }],

  // ============================================================
  // MILESTONES
  // ============================================================
  milestones: [{
    title: String,
    description: String,
    rewardPoints: Number,
    achievedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],

  // ============================================================
  // DISCUSSION FORUM
  // ============================================================
  discussionForum: {
    enabled: { type: Boolean, default: true },
    threads: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Thread' }]
  },

  // ============================================================
  // PROGRAM RESOURCES
  // ============================================================
  resources: [{
    title: String,
    description: String,
    type: { type: String, enum: ['ebook', 'worksheet', 'template', 'checklist'] },
    url: String,
    downloads: { type: Number, default: 0 }
  }],

  // ============================================================
  // LIVE SESSIONS & SCHEDULE
  // ============================================================
  schedule: {
    liveSessions: [{
      title: String,
      description: String,
      dateTime: Date,
      duration: Number,
      meetingLink: String,
      recordingUrl: String,
      attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }],
    officeHours: [{
      day: String,
      time: String,
      duration: Number
    }]
  },

  // ============================================================
  // ANALYTICS
  // ============================================================
  analytics: {
    views: { type: Number, default: 0 },
    enrollments: { type: Number, default: 0 },
    completionRate: Number,
    averageRating: Number,
    totalRatings: { type: Number, default: 0 }
  },

  // ============================================================
  // SETTINGS
  // ============================================================
  settings: {
    autoEnroll: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false },
    allowWithdrawal: { type: Boolean, default: true },
    publicVisibility: { type: Boolean, default: true },
    notifications: {
      enrollment: { type: Boolean, default: true },
      progress: { type: Boolean, default: true },
      liveSession: { type: Boolean, default: true }
    }
  },

  // ============================================================
  // METADATA
  // ============================================================
  metadata: {
    languages: [String],
    targetAudience: [String],
    skillLevel: [String],
    accreditation: String,
    partnerOrganizations: [String]
  },

  // ============================================================
  // PUBLIC REVIEWS (separate from participant feedback)
  // ============================================================
  reviews: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5 },
    reviewText: { type: String, maxlength: 500 },
    createdAt: { type: Date, default: Date.now }
  }],


  // ============================================================
  // INLINE COMMENTS (THREAD MODEL)
  // ============================================================
  comments: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 500 },
    parent: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdAt: { type: Date, default: Date.now }
  }],


}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================================
// VIRTUALS
// ============================================================
programSchema.virtual('isFull').get(function () {
  return this.capacity > 0 && this.participants.length >= this.capacity;
});

programSchema.virtual('availableSpots').get(function () {
  return this.capacity > 0 ? this.capacity - this.participants.length : 'Unlimited';
});

programSchema.virtual('durationInWeeks').get(function () {
  if (this.duration.unit === 'weeks') return this.duration.value;
  if (this.duration.unit === 'months') return this.duration.value * 4;
  if (this.duration.unit === 'days') return Math.ceil(this.duration.value / 7);
  return 0;
});

// ============================================================
// INDEXES
// ============================================================
programSchema.index({ title: 'text', description: 'text', tags: 'text' });
programSchema.index({ category: 1, status: 1 });
programSchema.index({ organizer: 1, createdAt: -1 });
programSchema.index({ 'participants.user': 1 });
programSchema.index({ featured: 1, status: 1 });
programSchema.index({ startDate: 1, endDate: 1 });

// ============================================================
// PROGRESS & CERTIFICATE AUTO-CALC MIDDLEWARE
// ============================================================
programSchema.pre('save', function (next) {
  const program = this;
  const totalModules = program.modules.length;

  program.participants = program.participants.map(p => {
    const completed = p.completedModules?.length || 0;

    // Auto-progress calculation
    const progress = totalModules > 0
      ? Math.round((completed / totalModules) * 100)
      : 0;

    p.progress = progress;

    // Auto-issue certificate when done
    if (progress === 100) {
      p.certificateIssued = true;
      if (!p.completedAt) p.completedAt = new Date();
    }

    return p;
  });

  // Update analytics
  const totalP = program.participants.length;
  const completedP = program.participants.filter(p => p.progress === 100).length;

  if (totalP > 0) {
    program.analytics.completionRate = (completedP / totalP) * 100;
  }

  next();
});

module.exports = mongoose.model('Program', programSchema);
