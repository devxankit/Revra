const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const salesSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  role: {
    type: String,
    enum: ['employee'],
    default: 'employee'
  },
  team: {
    type: String,
    enum: ['sales'],
    required: [true, 'Team is required']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  joiningDate: {
    type: Date,
    required: [true, 'Joining date is required']
  },
  document: {
    public_id: String,
    secure_url: String,
    originalName: String,
    original_filename: String,
    format: String,
    size: Number,
    bytes: Number,
    width: Number,
    height: Number,
    resource_type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  // Sales specific fields
  salesTarget: {
    type: Number,
    min: 0,
    default: 0
  },
  // Multiple targets with dates (admin can define any number of targets)
  salesTargets: [{
    targetNumber: {
      type: Number,
      required: true,
      min: 1
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    reward: {
      type: Number,
      min: 0,
      default: 0
    },
    targetDate: {
      type: Date,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  currentSales: {
    type: Number,
    min: 0,
    default: 0
  },
  commissionRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  // Reward points (admin-defined)
  reward: {
    type: Number,
    min: 0,
    default: 0
  },
  // Incentive amount per converted client (admin-defined)
  incentivePerClient: {
    type: Number,
    min: 0,
    default: 0
  },
  // Fixed monthly salary (admin-defined)
  fixedSalary: {
    type: Number,
    min: 0,
    default: 0
  },
  skills: [{
    type: String,
    trim: true
  }],
  experience: {
    type: Number,
    min: 0,
    default: 0
  },
  leadsManaged: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  }],
  clientsManaged: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  }],
  // Incentive management fields
  currentIncentive: {
    type: Number,
    min: 0,
    default: 0
  },
  incentiveHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incentive'
  }],
  // Team incentive fields
  teamLeadIncentive: {
    type: Number,
    min: 0,
    default: 0
  },
  // Fixed incentive amount per client conversion for team leads (admin-set)
  teamLeadIncentivePerClient: {
    type: Number,
    min: 0,
    default: 0
  },
  // Lead statistics
  leadStats: {
    totalAssigned: { type: Number, default: 0 },
    contacted: { type: Number, default: 0 },
    converted: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
  },
  // Last activity timestamp
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  // Team management fields
  isTeamLead: {
    type: Boolean,
    default: false
  },
  teamMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sales'
  }],
  // Team lead specific target and reward
  teamLeadTarget: {
    type: Number,
    min: 0,
    default: 0
  },
  teamLeadTargetReward: {
    type: Number,
    min: 0,
    default: 0
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  // FCM Tokens for push notifications
  fcmTokens: {
    type: [String],
    default: []
  },
  fcmTokenMobile: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Index for better performance
// Indexes are automatically created by unique: true in schema definition

// Virtual for account lock status
salesSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
salesSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
salesSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Increment login attempts
salesSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
salesSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

// Method to update lead statistics
salesSchema.methods.updateLeadStats = async function() {
  try {
    const Lead = this.constructor.model('Lead');
    
    // Count leads by status
    const stats = await Lead.aggregate([
      { $match: { assignedTo: this._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Initialize stats
    const leadStats = {
      totalAssigned: 0,
      contacted: 0,
      converted: 0,
      lost: 0,
      conversionRate: 0
    };
    
    // Process stats
    stats.forEach(stat => {
      leadStats.totalAssigned += stat.count;
      
      switch (stat._id) {
        case 'connected':
        case 'hot':
        case 'today_followup':
        case 'quotation_sent':
        case 'dq_sent':
        case 'app_client':
        case 'web':
        case 'demo_requested':
          leadStats.contacted += stat.count;
          break;
        case 'converted':
          leadStats.converted += stat.count;
          break;
        case 'lost':
          leadStats.lost += stat.count;
          break;
      }
    });
    
    // Calculate conversion rate
    if (leadStats.totalAssigned > 0) {
      leadStats.conversionRate = Math.round((leadStats.converted / leadStats.totalAssigned) * 100);
    }
    
    // Update the sales employee's stats
    this.leadStats = leadStats;
    await this.save();
    
    return leadStats;
  } catch (error) {
    throw new Error('Failed to update lead statistics');
  }
};

// Method to add activity to a lead
salesSchema.methods.addActivity = async function(leadId, activityType, description) {
  try {
    const Lead = this.constructor.model('Lead');
    const lead = await Lead.findById(leadId);
    
    if (!lead) {
      throw new Error('Lead not found');
    }
    
    // Add activity to lead
    await lead.addActivity({
      type: activityType,
      description: description,
      performedBy: this._id
    });
    
    // Update last activity timestamp
    this.lastActivityAt = new Date();
    await this.save();
    
    return lead;
  } catch (error) {
    throw new Error('Failed to add activity');
  }
};

// Method to calculate total incentive from conversion-based incentives
// This calculates currentIncentive as sum of (currentBalance + pendingBalance) from all conversion-based incentives
salesSchema.methods.calculateTotalIncentive = async function() {
  try {
    const Incentive = mongoose.model('Incentive');
    
    // Aggregate all conversion-based incentives for this sales employee
    const result = await Incentive.aggregate([
      {
        $match: {
          salesEmployee: this._id,
          isConversionBased: true
        }
      },
      {
        $group: {
          _id: null,
          totalCurrentBalance: { $sum: '$currentBalance' },
          totalPendingBalance: { $sum: '$pendingBalance' },
          totalAmount: { $sum: { $add: ['$currentBalance', '$pendingBalance'] } }
        }
      }
    ]);
    
    // Return total (currentBalance + pendingBalance) or 0 if no incentives
    return result.length > 0 ? result[0].totalAmount : 0;
  } catch (error) {
    console.error('Error calculating total incentive:', error);
    return 0;
  }
};

// Method to update currentIncentive field from conversion-based incentives
salesSchema.methods.updateCurrentIncentive = async function() {
  try {
    const totalIncentive = await this.calculateTotalIncentive();
    this.currentIncentive = totalIncentive;
    await this.save();
    return totalIncentive;
  } catch (error) {
    console.error('Error updating current incentive:', error);
    throw error;
  }
};

// Remove password from JSON output
salesSchema.methods.toJSON = function() {
  const sales = this.toObject();
  delete sales.password;
  delete sales.loginAttempts;
  delete sales.lockUntil;
  return sales;
};

module.exports = mongoose.model('Sales', salesSchema);
