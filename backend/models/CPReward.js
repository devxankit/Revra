const mongoose = require('mongoose');

const cpRewardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Reward name is required'],
    trim: true,
    maxlength: [100, 'Reward name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  level: {
    type: String,
    required: [true, 'Level is required'],
    trim: true,
    maxlength: [50, 'Level cannot exceed 50 characters']
  },
  requirement: {
    type: {
      type: String,
      enum: ['conversions'],
      default: 'conversions',
      required: [true, 'Requirement type is required']
    },
    value: {
      type: Number,
      required: [true, 'Requirement value is required'],
      min: [0, 'Requirement value must be positive']
    },
    description: {
      type: String,
      trim: true
    }
  },
  rewardAmount: {
    type: Number,
    required: [true, 'Reward amount is required'],
    min: [0, 'Reward amount must be positive']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
cpRewardSchema.index({ isActive: 1 });
cpRewardSchema.index({ level: 1 });
cpRewardSchema.index({ order: 1 });
cpRewardSchema.index({ 'requirement.type': 1 });

module.exports = mongoose.model('CPReward', cpRewardSchema);
