const mongoose = require('mongoose');

const employeeRewardSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee ID is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true,
    maxlength: [200, 'Reason cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: ['Performance Reward', 'Team Collaboration', 'Client Satisfaction', 'Task Completion', 'Milestone Achievement', 'Project Completion', 'Other'],
    default: 'Performance Reward'
  },
  dateAwarded: {
    type: Date,
    default: Date.now
  },
  month: {
    type: String,
    required: [true, 'Reward month is required (YYYY-MM)'],
    match: [/^\d{4}-\d{2}$/, 'Please enter a valid month format (YYYY-MM)']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Created by admin is required']
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: {
    type: Date
  },
  paidAt: {
    type: Date,
    default: Date.now
  },
  rewardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reward',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
employeeRewardSchema.index({ employeeId: 1 });
employeeRewardSchema.index({ status: 1 });
employeeRewardSchema.index({ dateAwarded: -1 });
employeeRewardSchema.index({ createdAt: -1 });
employeeRewardSchema.index({ employeeId: 1, dateAwarded: -1 });
employeeRewardSchema.index({ rewardId: 1, employeeId: 1 });

// Static method to get rewards by Employee
employeeRewardSchema.statics.getByEmployee = function (employeeId) {
  return this.find({ employeeId })
    .populate('createdBy', 'name')
    .populate('approvedBy', 'name')
    .sort({ dateAwarded: -1 });
};

// Static method to get rewards by status
employeeRewardSchema.statics.getByStatus = function (status) {
  return this.find({ status })
    .populate('employeeId', 'name email')
    .populate('createdBy', 'name')
    .populate('approvedBy', 'name')
    .sort({ dateAwarded: -1 });
};

// Post-save hook to create finance transaction when Employee reward is created/updated with 'paid' status
employeeRewardSchema.post('save', async function (doc) {
  // Only create transaction if status is 'paid'
  if (doc.status === 'paid') {
    try {
      const { createOutgoingTransaction } = require('../utils/financeTransactionHelper');
      const AdminFinance = require('./AdminFinance');

      // Check if transaction already exists
      const existing = await AdminFinance.findOne({
        recordType: 'transaction',
        'metadata.sourceType': 'employeeReward',
        'metadata.sourceId': doc._id.toString()
      });

      if (!existing) {
        await createOutgoingTransaction({
          amount: doc.amount,
          category: 'Employee Reward',
          transactionDate: doc.paidAt || doc.dateAwarded || new Date(),
          createdBy: doc.createdBy,
          employee: doc.employeeId, // Employee model reference
          description: `Employee Reward: ${doc.reason} (${doc.category})`,
          metadata: {
            sourceType: 'employeeReward',
            sourceId: doc._id.toString()
          },
          checkDuplicate: true
        });
      }
    } catch (error) {
      // Log error but don't fail the save
      console.error('Error creating finance transaction for Employee reward:', error);
    }
  }
});

module.exports = mongoose.model('EmployeeReward', employeeRewardSchema);

