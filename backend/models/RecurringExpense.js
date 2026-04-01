const mongoose = require('mongoose');

const recurringExpenseSchema = new mongoose.Schema({
  // Basic information
  name: {
    type: String,
    required: [true, 'Expense name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['rent', 'utilities', 'maintenance', 'software', 'insurance', 'marketing', 'travel', 'other'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  vendor: {
    type: String,
    trim: true,
    maxlength: [100, 'Vendor name cannot exceed 100 characters'],
    default: ''
  },
  
  // Financial details
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'auto_debit', 'credit_card', 'cheque', 'cash', 'other'],
    default: 'bank_transfer'
  },
  
  // Date range
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    default: null // null means ongoing indefinitely
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'paused'],
    default: 'active'
  },
  
  // Payment tracking
  lastPaidDate: {
    type: Date,
    default: null
  },
  nextDueDate: {
    type: Date,
    default: null
  },
  
  // Calculated fields
  dayOfMonth: {
    type: Number,
    min: 1,
    max: 31,
    default: 1 // Day of month when payment is due (for monthly/quarterly)
  },
  
  // Auto-pay settings
  autoPay: {
    type: Boolean,
    default: false // If true, automatically mark ExpenseEntry as paid when due date arrives
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

// Calculate next due date based on frequency and last paid date
recurringExpenseSchema.methods.calculateNextDueDate = function() {
  const now = new Date();
  let nextDue = new Date();
  
  if (!this.lastPaidDate) {
    // If never paid, use start date
    nextDue = new Date(this.startDate);
  } else {
    nextDue = new Date(this.lastPaidDate);
  }
  
  switch (this.frequency) {
    case 'monthly':
      nextDue.setMonth(nextDue.getMonth() + 1);
      // Ensure day of month doesn't exceed month's days
      const lastDayOfMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
      nextDue.setDate(Math.min(this.dayOfMonth, lastDayOfMonth));
      break;
    case 'quarterly':
      nextDue.setMonth(nextDue.getMonth() + 3);
      const lastDayOfQuarter = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
      nextDue.setDate(Math.min(this.dayOfMonth, lastDayOfQuarter));
      break;
    case 'yearly':
      nextDue.setFullYear(nextDue.getFullYear() + 1);
      break;
  }
  
  return nextDue;
};

// Indexes for efficient queries
recurringExpenseSchema.index({ status: 1 });
recurringExpenseSchema.index({ category: 1 });
recurringExpenseSchema.index({ frequency: 1 });
recurringExpenseSchema.index({ startDate: 1 });
recurringExpenseSchema.index({ nextDueDate: 1 });

module.exports = mongoose.model('RecurringExpense', recurringExpenseSchema);

