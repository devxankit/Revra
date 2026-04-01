const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  accountName: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true,
    maxlength: [100, 'Account name cannot exceed 100 characters']
  },
  bankName: {
    type: String,
    required: [true, 'Bank name is required'],
    trim: true,
    maxlength: [100, 'Bank name cannot exceed 100 characters']
  },
  accountNumber: {
    type: String,
    required: [true, 'Account number is required'],
    trim: true
  },
  ifscCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  branchName: {
    type: String,
    trim: true,
    maxlength: [100, 'Branch name cannot exceed 100 characters']
  },
  accountType: {
    type: String,
    enum: ['current', 'savings', 'business', 'corporate'],
    default: 'current'
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
accountSchema.index({ isActive: 1 });
accountSchema.index({ accountType: 1 });
accountSchema.index({ createdBy: 1 });

// Update lastUsed when account is referenced in transactions
accountSchema.methods.updateLastUsed = function() {
  this.lastUsed = new Date();
  return this.save();
};

module.exports = mongoose.model('Account', accountSchema);


