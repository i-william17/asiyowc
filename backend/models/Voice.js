// models/Voice.js
const mongoose = require('mongoose');

const voiceInstanceSchema = new mongoose.Schema({
  startsAt: {
    type: Date,
    required: true,
  },
  endsAt: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended'],
    default: 'scheduled',
  },
  speakers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  sharedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
  }],
});

const voiceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
    },
    hub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
    },
    instances: [voiceInstanceSchema],
    isRemoved: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* =====================================================
   VIRTUALS (UI REQUIRED)
===================================================== */

// Active / current instance (live preferred)
voiceSchema.virtual('currentInstance').get(function () {
  if (!this.instances || this.instances.length === 0) return null;

  return (
    this.instances.find(i => i.status === 'live') ||
    this.instances[this.instances.length - 1]
  );
});

// Is room live (for LIVE badge)
voiceSchema.virtual('isLive').get(function () {
  const instance = this.currentInstance;
  return instance ? instance.status === 'live' : false;
});

// Listener count (participants in current instance)
voiceSchema.virtual('listenersCount').get(function () {
  const instance = this.currentInstance;
  return instance && instance.participants
    ? instance.participants.length
    : 0;
});

// Speakers count
voiceSchema.virtual('speakersCount').get(function () {
  const instance = this.currentInstance;
  return instance && instance.speakers
    ? instance.speakers.length
    : 0;
});

// Total joined users (speakers + listeners)
voiceSchema.virtual('participantsCount').get(function () {
  const instance = this.currentInstance;
  if (!instance) return 0;

  const speakers = instance.speakers || [];
  const listeners = instance.participants || [];

  return speakers.length + listeners.length;
});

/* =====================================================
   INDEXES (UNCHANGED)
===================================================== */
voiceSchema.index({ 'instances.startsAt': 1 });
voiceSchema.index({ host: 1 });
voiceSchema.index({ group: 1, hub: 1 });

module.exports = mongoose.model('Voice', voiceSchema);
