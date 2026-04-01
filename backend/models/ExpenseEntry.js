const mongoose = require('mongoose');

const expenseEntrySchema = new mongoose.Schema({
  // Reference to recurring expense
  recurringExpenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringExpense',
    required: true
  },
  
  // Period for this entry (YYYY-MM format for monthly/quarterly, YYYY for yearly)
  period: {
    type: String,
    required: true
  },
  
  // Amount for this period
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Due date for this entry
  dueDate: {
    type: Date,
    required: true
  },
  
  // Payment status
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'skipped'],
    default: 'pending'
  },
  
  // Payment details (when paid)
  paidDate: {
    type: Date,
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'auto_debit', 'credit_card', 'cheque', 'cash', 'other'],
    default: null
  },
  paymentReference: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: ''
  },
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, {
  timestamps: true
});

// Indexes
expenseEntrySchema.index({ recurringExpenseId: 1, period: 1 }, { unique: true });
expenseEntrySchema.index({ period: 1 });
expenseEntrySchema.index({ status: 1 });
expenseEntrySchema.index({ dueDate: 1 });

module.exports = mongoose.model('ExpenseEntry', expenseEntrySchema);

