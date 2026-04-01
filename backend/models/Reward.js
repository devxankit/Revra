const mongoose = require('mongoose');

const criteriaSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['points', 'completionRatio', 'leadsConverted', 'target'],
    required: [true, 'Criteria type is required']
  },
  value: {
    type: Number,
    min: [0, 'Criteria value cannot be negative']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [160, 'Criteria description cannot exceed 160 characters']
  }
}, { _id: false });

const rewardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Reward name is required'],
    trim: true,
    maxlength: [80, 'Reward name cannot exceed 80 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [180, 'Reward description cannot exceed 180 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Reward amount is required'],
    min: [1, 'Reward amount must be at least 1']
  },
  team: {
    type: String,
    enum: ['dev', 'pm', 'sales'],
    required: [true, 'Team is required']
  },
  criteria: {
    type: criteriaSchema,
    required: [true, 'Reward criteria is required']
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RewardTag'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  startsOn: {
    type: Date
  },
  endsOn: {
    type: Date
  }
}, {
  timestamps: true
});

rewardSchema.index({ team: 1, isActive: 1 });
rewardSchema.index({ 'criteria.type': 1 });
rewardSchema.index({ createdAt: -1 });

rewardSchema.pre('validate', function(next) {
  if (this.team === 'dev' && !['points', 'completionRatio'].includes(this.criteria.type)) {
    this.invalidate('criteria.type', 'Development rewards must use points or task completion ratio criteria');
  }

  if (this.team === 'pm' && this.criteria.type !== 'completionRatio') {
    this.invalidate('criteria.type', 'PM rewards must use task completion ratio criteria');
  }

  if (this.team === 'sales' && !['leadsConverted', 'target'].includes(this.criteria.type)) {
    this.invalidate('criteria.type', 'Sales rewards must use leadsConverted or target criteria');
  }

  if ((this.criteria.type === 'points' || this.criteria.type === 'completionRatio' || this.criteria.type === 'leadsConverted' || this.criteria.type === 'target') &&
      (this.criteria.value === undefined || this.criteria.value === null)) {
    this.invalidate('criteria.value', 'Criteria value is required for the selected criteria type');
  }

  if (this.startsOn && this.endsOn && this.startsOn > this.endsOn) {
    this.invalidate('endsOn', 'End date cannot be earlier than start date');
  }

  next();
});

module.exports = mongoose.model('Reward', rewardSchema);

