const mongoose = require('mongoose');

const savingsPodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Pod name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  category: {
    type: String,
    enum: ['emergency', 'investment', 'education', 'business', 'personal', 'group'],
    default: 'group'
  },
  goal: {
    targetAmount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'KES'
    },
    description: String,
    deadline: Date
  },
  contributionSettings: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom'],
      default: 'monthly'
    },
    amount: {
      type: Number,
      required: true
    },
    autoDeduct: {
      type: Boolean,
      default: false
    }
  },
  currentBalance: {
    type: Number,
    default: 0
  },
  contributions: [{
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    method: {
      type: String,
      enum: ['mpesa', 'bank', 'cash', 'mobile'],
      default: 'mpesa'
    },
    transactionId: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed'
    }
  }],
  withdrawals: [{
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    purpose: String,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid'],
      default: 'pending'
    }
  }],
  settings: {
    privacy: {
      type: String,
      enum: ['public', 'private', 'invite-only'],
      default: 'invite-only'
    },
    maxMembers: {
      type: Number,
      default: 20
    },
    allowWithdrawals: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active'
  },
  statistics: {
    totalContributions: { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 },
    activeMembers: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes
savingsPodSchema.index({ creator: 1 });
savingsPodSchema.index({ 'members.user': 1 });
savingsPodSchema.index({ category: 1, status: 1 });
savingsPodSchema.index({ createdAt: -1 });

// Virtual for progress percentage
savingsPodSchema.virtual('progress').get(function() {
  if (this.goal.targetAmount === 0) return 0;
  return (this.currentBalance / this.goal.targetAmount) * 100;
});

// Virtual for active members count
savingsPodSchema.virtual('activeMembersCount').get(function() {
  return this.members.filter(member => member.isActive).length;
});

// Methods
savingsPodSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(
    member => member.user.toString() === userId.toString()
  );

  if (existingMember) {
    throw new Error('User is already a member of this pod');
  }

  if (this.members.length >= this.settings.maxMembers) {
    throw new Error('Pod has reached maximum members');
  }

  this.members.push({
    user: userId,
    role,
    joinedAt: new Date()
  });

  this.statistics.activeMembers += 1;
};

savingsPodSchema.methods.removeMember = function(userId) {
  const memberIndex = this.members.findIndex(
    member => member.user.toString() === userId.toString()
  );

  if (memberIndex === -1) {
    throw new Error('User is not a member of this pod');
  }

  this.members[memberIndex].isActive = false;
  this.statistics.activeMembers -= 1;
};

savingsPodSchema.methods.addContribution = function(userId, amount, method = 'mpesa') {
  const member = this.members.find(
    member => member.user.toString() === userId.toString() && member.isActive
  );

  if (!member) {
    throw new Error('User is not an active member of this pod');
  }

  this.contributions.push({
    member: userId,
    amount,
    method,
    date: new Date(),
    status: 'completed'
  });

  this.currentBalance += amount;
  this.statistics.totalContributions += amount;
};

savingsPodSchema.methods.requestWithdrawal = function(userId, amount, purpose) {
  const member = this.members.find(
    member => member.user.toString() === userId.toString() && member.isActive
  );

  if (!member) {
    throw new Error('User is not an active member of this pod');
  }

  if (amount > this.currentBalance) {
    throw new Error('Insufficient pod balance');
  }

  if (amount > this.getMemberBalance(userId)) {
    throw new Error('Withdrawal amount exceeds your contributions');
  }

  this.withdrawals.push({
    member: userId,
    amount,
    purpose,
    date: new Date(),
    status: this.settings.requireApproval ? 'pending' : 'approved'
  });
};

savingsPodSchema.methods.getMemberBalance = function(userId) {
  const totalContributions = this.contributions
    .filter(contribution =>
      contribution.member.toString() === userId.toString() &&
      contribution.status === 'completed'
    )
    .reduce((sum, contribution) => sum + contribution.amount, 0);

  const totalWithdrawals = this.withdrawals
    .filter(withdrawal =>
      withdrawal.member.toString() === userId.toString() &&
      (withdrawal.status === 'approved' || withdrawal.status === 'paid')
    )
    .reduce((sum, withdrawal) => sum + withdrawal.amount, 0);

  return totalContributions - totalWithdrawals;
};

const SavingsPod = mongoose.model('SavingsPod', savingsPodSchema);

module.exports = SavingsPod;
