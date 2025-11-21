import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['direct', 'group'],
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    lastRead: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  name: {
    type: String,
    required: function() {
      return this.type === 'group';
    },
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  image: {
    url: String,
    publicId: String
  },
  settings: {
    privacy: {
      type: String,
      enum: ['public', 'private', 'invite-only'],
      default: 'private'
    },
    allowInvites: {
      type: Boolean,
      default: true
    },
    allowMedia: {
      type: Boolean,
      default: true
    },
    adminOnlyMessages: {
      type: Boolean,
      default: false
    }
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    text: {
      type: String,
      maxlength: [5000, 'Message too long']
    },
    media: [{
      url: String,
      publicId: String,
      type: {
        type: String,
        enum: ['image', 'video', 'audio', 'document']
      },
      caption: String
    }]
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'system'],
    default: 'text'
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date
}, {
  timestamps: true
});

// Indexes
conversationSchema.index({ 'participants.user': 1 });
conversationSchema.index({ type: 1, updatedAt: -1 });
conversationSchema.index({ lastMessage: 1 });

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ createdAt: -1 });

// Virtual for unread count per user
conversationSchema.virtual('unreadCount', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'conversation',
  count: true
});

// Methods
conversationSchema.methods.addParticipant = function(userId, role = 'member') {
  const existingParticipant = this.participants.find(
    participant => participant.user.toString() === userId.toString()
  );
  
  if (existingParticipant) {
    if (!existingParticipant.isActive) {
      existingParticipant.isActive = true;
      existingParticipant.joinedAt = new Date();
    }
    return;
  }
  
  this.participants.push({
    user: userId,
    role,
    joinedAt: new Date()
  });
};

conversationSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(
    participant => participant.user.toString() === userId.toString()
  );
  
  if (participant) {
    participant.isActive = false;
  }
};

conversationSchema.methods.isUserParticipant = function(userId) {
  return this.participants.some(
    participant => 
      participant.user.toString() === userId.toString() && 
      participant.isActive
  );
};

messageSchema.methods.markAsRead = function(userId) {
  const alreadyRead = this.readBy.some(
    read => read.user.toString() === userId.toString()
  );
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
  }
};

messageSchema.methods.addReaction = function(userId, emoji) {
  const existingReaction = this.reactions.find(
    reaction => reaction.user.toString() === userId.toString()
  );
  
  if (existingReaction) {
    if (existingReaction.emoji === emoji) {
      // Remove reaction if same emoji
      this.reactions = this.reactions.filter(
        reaction => reaction.user.toString() !== userId.toString()
      );
    } else {
      // Update reaction
      existingReaction.emoji = emoji;
      existingReaction.createdAt = new Date();
    }
  } else {
    // Add new reaction
    this.reactions.push({
      user: userId,
      emoji,
      createdAt: new Date()
    });
  }
};

const Conversation = mongoose.model('Conversation', conversationSchema);
const Message = mongoose.model('Message', messageSchema);

export { Conversation, Message };