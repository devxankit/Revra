const mongoose = require('mongoose');

const allowanceSchema = new mongoose.Schema({
  // Employee reference (can be Employee, Sales, or PM)
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'employeeModel'
  },
  employeeModel: {
    type: String,
    required: true,
    enum: ['Employee', 'Sales', 'PM']
  },
  employeeName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Item details
  itemType: {
    type: String,
    required: true,
    enum: ['laptop', 'monitor', 'smartphone', 'headphones', 'wifi', 'car', 'other'],
    trim: true
  },
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  serialNumber: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Dates
  issueDate: {
    type: Date,
    required: [true, 'Issue date is required']
  },
  returnDate: {
    type: Date,
    default: null
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'returned', 'lost'],
    default: 'active'
  },
  
  // Financial value
  value: {
    type: Number,
    required: [true, 'Item value is required'],
    min: [0, 'Value cannot be negative']
  },
  
  // Additional notes
  remarks: {
    type: String,
    trim: true,
    maxlength: [500, 'Remarks cannot exceed 500 characters'],
    default: ''
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

// Indexes for efficient queries
allowanceSchema.index({ employeeId: 1, employeeModel: 1 });
allowanceSchema.index({ status: 1 });
allowanceSchema.index({ itemType: 1 });
allowanceSchema.index({ issueDate: 1 });

module.exports = mongoose.model('Allowance', allowanceSchema);

