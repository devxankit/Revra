const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  // Employee reference (can be Employee, Sales, or PM)
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'employeeModel'
  },
  employeeModel: {
    type: String,
    required: true,
    enum: ['Employee', 'Sales', 'PM', 'Admin']
  },
  employeeName: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['employee', 'sales', 'project-manager', 'hr', 'accountant', 'pem', 'admin'],
    required: true
  },
  
  // Salary period
  month: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}$/ // YYYY-MM format
  },
  
  // Salary amount (from fixedSalary)
  fixedSalary: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Payment date calculation
  paymentDate: {
    type: Date,
    required: true
  },
  // Day of month for payment (based on joining date)
  paymentDay: {
    type: Number,
    required: true,
    min: 1,
    max: 31
  },
  
  // Payment status
  status: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  
  // Payment details (when marked as paid)
  paidDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'upi', 'cheque', 'other'],
    default: null
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Incentive fields (for sales team)
  incentiveAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  incentiveStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  incentivePaidDate: {
    type: Date
  },
  
  // Reward fields (for sales and dev teams)
  rewardAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  rewardStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  rewardPaidDate: {
    type: Date
  },
  
  // Source of this salary record (for audit/UX)
  // e.g. 'set-salary', 'auto-next-month', 'bulk-generate', 'manual'
  source: {
    type: String,
    trim: true,
    default: 'set-salary'
  },
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Index for efficient queries
salarySchema.index({ employeeId: 1, month: 1 }, { unique: true });
salarySchema.index({ month: 1 });
salarySchema.index({ status: 1 });
salarySchema.index({ paymentDate: 1 });
salarySchema.index({ employeeModel: 1, employeeId: 1 });

module.exports = mongoose.model('Salary', salarySchema);

