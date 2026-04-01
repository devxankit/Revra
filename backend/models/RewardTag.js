const mongoose = require('mongoose');

const rewardTagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tag name is required'],
    trim: true,
    unique: true,
    maxlength: [30, 'Tag name cannot exceed 30 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [120, 'Tag description cannot exceed 120 characters']
  },
  color: {
    type: String,
    trim: true,
    match: [/^#[0-9A-Fa-f]{6}$/, 'Tag color must be a valid hex code'],
    default: '#2563eb'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Note: name index is created automatically by unique: true, so we don't need explicit index
rewardTagSchema.index({ isActive: 1 });

module.exports = mongoose.model('RewardTag', rewardTagSchema);

