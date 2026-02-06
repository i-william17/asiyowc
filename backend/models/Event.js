const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['workshop', 'conference', 'networking', 'social', 'training', 'webinar'],
    required: true
  },
  image: {
    url: String,
    publicId: String
  },
  type: {
    type: String,
    enum: ['virtual', 'in-person', 'hybrid'],
    default: 'virtual'
  },
  location: {
    address: String,
    city: String,
    country: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    },
    onlineLink: String,
    platform: String // 'zoom', 'teams', 'google-meet', etc.
  },
  dateTime: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    },
    timezone: {
      type: String,
      default: 'Africa/Nairobi'
    }
  },
  capacity: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['registered', 'attended', 'cancelled'],
      default: 'registered'
    },
    checkInAt: Date
  }],
  price: {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'KES' },
    isFree: { type: Boolean, default: true }
  },
  tags: [String],
  requirements: [String],
  agenda: [{
    time: String,
    title: String,
    description: String,
    speaker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  speakers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String,
    bio: String
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'community', 'private'],
    default: 'community'
  },
  registration: {
    requiresApproval: { type: Boolean, default: false },
    deadline: Date,
    maxAttendees: Number
  },
  statistics: {
    views: { type: Number, default: 0 },
    registrations: { type: Number, default: 0 },
    attendance: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes
eventSchema.index({ organizer: 1 });
eventSchema.index({ category: 1, status: 1 });
eventSchema.index({ type: 1 });
eventSchema.index({ 'dateTime.start': 1, 'dateTime.end': 1 });
eventSchema.index({ 'attendees.user': 1 });
eventSchema.index({ createdAt: -1 });

// Virtual for registration count
eventSchema.virtual('registrationCount').get(function() {
  return this.attendees.filter(attendee => attendee.status === 'registered').length;
});

// Virtual for attendance count
eventSchema.virtual('attendanceCount').get(function() {
  return this.attendees.filter(attendee => attendee.status === 'attended').length;
});

// Virtual for event status based on date
eventSchema.virtual('timeStatus').get(function() {
  const now = new Date();
  if (now < this.dateTime.start) return 'upcoming';
  if (now >= this.dateTime.start && now <= this.dateTime.end) return 'ongoing';
  return 'completed';
});

// Methods
eventSchema.methods.registerAttendee = function(userId) {
  const existingRegistration = this.attendees.find(
    attendee => attendee.user.toString() === userId.toString()
  );
  
  if (existingRegistration) {
    throw new Error('User already registered for this event');
  }
  
  if (this.capacity > 0 && this.registrationCount >= this.capacity) {
    throw new Error('Event has reached maximum capacity');
  }
  
  if (this.registration.deadline && new Date() > this.registration.deadline) {
    throw new Error('Registration deadline has passed');
  }
  
  this.attendees.push({
    user: userId,
    registeredAt: new Date(),
    status: this.registration.requiresApproval ? 'pending' : 'registered'
  });
  
  this.statistics.registrations += 1;
};

eventSchema.methods.checkInAttendee = function(userId) {
  const attendee = this.attendees.find(
    attendee => attendee.user.toString() === userId.toString()
  );
  
  if (!attendee) {
    throw new Error('User is not registered for this event');
  }
  
  if (attendee.status !== 'registered') {
    throw new Error('Cannot check in user with current status: ' + attendee.status);
  }
  
  attendee.status = 'attended';
  attendee.checkInAt = new Date();
  this.statistics.attendance += 1;
};

eventSchema.methods.isUserRegistered = function(userId) {
  return this.attendees.some(
    attendee => attendee.user.toString() === userId.toString() && 
    attendee.status === 'registered'
  );
};

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;