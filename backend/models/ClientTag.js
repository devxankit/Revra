const mongoose = require('mongoose');

const clientTagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tag name is required'],
    trim: true,
    unique: true,
    maxlength: [30, 'Tag name cannot exceed 30 characters']
  },
  color: {
    type: String,
    required: [true, 'Tag color is required'],
    trim: true,
    match: [/^#[0-9A-Fa-f]{6}$/, 'Tag color must be a valid hex code'],
    default: '#3b82f6'
  },
  description: {
    type: String,
    trim: true,
    maxlength: [120, 'Tag description cannot exceed 120 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Created by admin is required']
  }
}, {
  timestamps: true
});

// Index for better performance (name already has index from unique: true)
clientTagSchema.index({ isActive: 1 });

module.exports = mongoose.model('ClientTag', clientTagSchema);
