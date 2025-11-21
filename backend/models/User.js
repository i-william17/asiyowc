const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
    index: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    validate: {
      validator: function(v) {
        return /^\+?[\d\s-()]+$/.test(v);
      },
      message: 'Please provide a valid phone number'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters'],
    default: ''
  },
  avatar: {
    url: { type: String, default: null },
    publicId: { type: String, default: null }
  },
  role: {
    type: String,
    enum: ['mentor', 'entrepreneur', 'advocate', 'changemaker', 'professional', 'student'],
    required: true
  },
  location: {
    country: { type: String, default: '' },
    city: { type: String, default: '' },
    region: {
      type: String,
      enum: ['kenya', 'africa', 'global'],
      default: 'global'
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  interests: [{
    type: String,
    enum: [
      'leadership', 'finance', 'health', 'advocacy',
      'entrepreneurship', 'education', 'technology',
      'arts', 'mentorship', 'community', 'wellness'
    ]
  }],
  badges: [{
    type: String,
    enum: [
      'mentor', 'advocate', 'entrepreneur', 'changemaker',
      'pioneer', 'ally', 'visionary', 'leader',
      'innovator', 'educator', 'mentee'
    ]
  }],
  isVerified: {
    email: { type: Boolean, default: false },
    phone: { type: Boolean, default: false }
  },
  verification: {
    emailToken: String,
    phoneToken: String,
    phoneTokenExpires: Date,
    emailTokenExpires: Date
  },
  twoFactorAuth: {
    enabled: { type: Boolean, default: false },
    secret: String
  },
  devices: [{
    deviceId: String,
    deviceName: String,
    lastActive: Date,
    token: String,
    platform: String
  }],
  privacySettings: {
    profileVisibility: {
      type: String,
      enum: ['public', 'community', 'private'],
      default: 'community'
    },
    showOnlineStatus: { type: Boolean, default: true },
    allowDMs: { type: Boolean, default: true },
    showLocation: { type: Boolean, default: false },
    dataSharing: { type: Boolean, default: true }
  },
  notifications: {
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    marketing: { type: Boolean, default: false }
  },
  statistics: {
    postsCount: { type: Number, default: 0 },
    connectionsCount: { type: Number, default: 0 },
    programsCompleted: { type: Number, default: 0 },
    impactScore: { type: Number, default: 0 },
    totalContributions: { type: Number, default: 0 },
    mentorshipSessions: { type: Number, default: 0 }
  },
  socialLinks: {
    website: String,
    linkedin: String,
    twitter: String,
    instagram: String
  },
  preferences: {
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'KES' },
    timezone: { type: String, default: 'Africa/Nairobi' }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ 'location.region': 1 });
userSchema.index({ interests: 1 });
userSchema.index({ 'statistics.impactScore': -1 });
userSchema.index({ createdAt: -1 });

// Virtual
userSchema.virtual('profileUrl').get(function() {
  return `/users/${this._id}/profile`;
});

// Password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Update lastActive
userSchema.pre('save', function(next) {
  if (this.isModified('lastActive')) {
    this.lastActive = new Date();
  }
  next();
});

// Methods
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.generateVerificationToken = function() {
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  this.verification.phoneToken = token;
  this.verification.phoneTokenExpires = Date.now() + 10 * 60 * 1000;
  return token;
};

userSchema.methods.generateEmailVerificationToken = function() {
  const token = Math.random().toString(36).substring(2, 15)
              + Math.random().toString(36).substring(2, 15);
  this.verification.emailToken = token;
  this.verification.emailTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
  return token;
};

userSchema.methods.incrementStat = async function(stat, value = 1) {
  this.statistics[stat] += value;
  await this.save();
};

userSchema.methods.addBadge = async function(badge) {
  if (!this.badges.includes(badge)) {
    this.badges.push(badge);
    await this.save();
  }
};

// Statics
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone });
};

userSchema.statics.getLeaderboard = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ 'statistics.impactScore': -1 })
    .limit(limit)
    .select('fullName avatar role statistics.impactScore badges');
};

const User = mongoose.model('User', userSchema);

module.exports = User;
