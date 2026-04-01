const mongoose = require('mongoose');

const adminFinanceSchema = new mongoose.Schema({
  // Record type: transaction, budget, invoice, expense
  // Note: Accounts are managed separately via Account model (backend/models/Account.js)
  recordType: {
    type: String,
    required: true,
    enum: ['transaction', 'budget', 'invoice', 'expense'],
    index: true
  },
  
  // Common fields for all record types
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'pending', 'paid', 'failed', 'cancelled', 'inactive'],
    default: 'pending',
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // ========== TRANSACTION FIELDS ==========
  // For recordType: 'transaction'
  transactionType: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: function() { return this.recordType === 'transaction'; }
  },
  category: {
    type: String,
    trim: true,
    required: function() { return this.recordType === 'transaction' || this.recordType === 'expense'; }
  },
  amount: {
    type: Number,
    required: function() { 
      return ['transaction', 'invoice', 'expense'].includes(this.recordType); 
    },
    min: [0, 'Amount cannot be negative']
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: function() { return this.recordType === 'invoice'; }
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  vendor: {
    type: String,
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'UPI', 'Credit Card', 'Debit Card', 'Cash', 'Cheque', 'Other'],
    default: 'Bank Transfer'
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  
  // ========== BUDGET FIELDS ==========
  // For recordType: 'budget'
  budgetName: {
    type: String,
    trim: true,
    required: function() { return this.recordType === 'budget'; }
  },
  budgetCategory: {
    type: String,
    trim: true,
    required: function() { return this.recordType === 'budget'; }
  },
  allocatedAmount: {
    type: Number,
    min: [0, 'Allocated amount cannot be negative'],
    required: function() { return this.recordType === 'budget'; }
  },
  spentAmount: {
    type: Number,
    default: 0,
    min: [0, 'Spent amount cannot be negative']
  },
  remainingAmount: {
    type: Number,
    default: function() {
      if (this.recordType === 'budget') {
        return this.allocatedAmount - (this.spentAmount || 0);
      }
      return 0;
    },
    min: [0, 'Remaining amount cannot be negative']
  },
  startDate: {
    type: Date,
    required: function() { return this.recordType === 'budget'; }
  },
  endDate: {
    type: Date,
    required: function() { return this.recordType === 'budget'; }
  },
  budgetProjects: [{
    type: String,
    trim: true
  }],
  
  // ========== INVOICE FIELDS ==========
  // For recordType: 'invoice'
  invoiceNumber: {
    type: String,
    trim: true,
    unique: true, // unique: true creates an index automatically
    sparse: true,
    required: function() { return this.recordType === 'invoice'; }
  },
  issueDate: {
    type: Date,
    default: Date.now,
    required: function() { return this.recordType === 'invoice'; }
  },
  dueDate: {
    type: Date,
    required: function() { return this.recordType === 'invoice'; }
  },
  paidDate: {
    type: Date
  },
  
  // ========== EXPENSE FIELDS ==========
  // For recordType: 'expense'
  expenseCategory: {
    type: String,
    trim: true,
    required: function() { return this.recordType === 'expense'; }
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  
  // Reference to Account model for transactions/invoices that use specific accounts
  // Accounts are managed separately via Account model (backend/models/Account.js)
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
adminFinanceSchema.index({ recordType: 1, status: 1 });
adminFinanceSchema.index({ recordType: 1, createdAt: -1 });
adminFinanceSchema.index({ transactionType: 1, transactionDate: -1 });
adminFinanceSchema.index({ client: 1, recordType: 1 });
adminFinanceSchema.index({ project: 1, recordType: 1 });
// Note: invoiceNumber index is created automatically by unique: true, so we don't need explicit index
adminFinanceSchema.index({ account: 1 });

// Virtual for calculating remaining amount for budgets
adminFinanceSchema.virtual('budgetRemaining').get(function() {
  if (this.recordType === 'budget') {
    return this.allocatedAmount - this.spentAmount;
  }
  return null;
});

// Pre-save middleware to calculate remaining amount for budgets
adminFinanceSchema.pre('save', function(next) {
  if (this.recordType === 'budget') {
    this.remainingAmount = this.allocatedAmount - this.spentAmount;
  }
  next();
});

// Method to generate invoice number
adminFinanceSchema.statics.generateInvoiceNumber = async function() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  // Find the latest invoice for this year
  const latestInvoice = await this.findOne({
    recordType: 'invoice',
    invoiceNumber: new RegExp(`^${prefix}`)
  }).sort({ invoiceNumber: -1 });
  
  let sequence = 1;
  if (latestInvoice) {
    const match = latestInvoice.invoiceNumber.match(/\d+$/);
    if (match) {
      sequence = parseInt(match[0]) + 1;
    }
  }
  
  return `${prefix}${String(sequence).padStart(3, '0')}`;
};

// Method to mark invoice as paid
adminFinanceSchema.methods.markInvoicePaid = function() {
  if (this.recordType === 'invoice') {
    this.status = 'paid';
    this.paidDate = new Date();
  }
  return this.save();
};

// Method to mark expense as approved
adminFinanceSchema.methods.approveExpense = function(adminId) {
  if (this.recordType === 'expense') {
    this.status = 'paid';
    this.approvedBy = adminId;
    this.approvedAt = new Date();
  }
  return this.save();
};

// Method to mark expense as rejected
adminFinanceSchema.methods.rejectExpense = function(adminId, reason) {
  if (this.recordType === 'expense') {
    this.status = 'cancelled';
    this.approvedBy = adminId;
    this.approvedAt = new Date();
    this.rejectionReason = reason;
  }
  return this.save();
};

// Note: Account management (create, update, delete) should be done via Account model
// This model only references accounts for transactions/invoices

// Static method to get finance statistics
adminFinanceSchema.statics.getFinanceStatistics = async function(timeFilter = 'all') {
  const now = new Date();
  let dateFilter = {};
  
  switch (timeFilter) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      dateFilter = { $gte: start, $lte: end };
      break;
    }
    case 'week': {
      // Last 7 days including today
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      dateFilter = { $gte: start, $lte: end };
      break;
    }
    case 'month': {
      // Current calendar month
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      dateFilter = { $gte: start, $lte: end };
      break;
    }
    case 'year': {
      // Current calendar year
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      dateFilter = { $gte: start, $lte: end };
      break;
    }
  }
  
  const matchFilter = timeFilter !== 'all' 
    ? { transactionDate: dateFilter, recordType: 'transaction' }
    : { recordType: 'transaction' };
  
  const stats = await this.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$transactionType',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  const incoming = stats.find(s => s._id === 'incoming') || { totalAmount: 0, count: 0 };
  const outgoing = stats.find(s => s._id === 'outgoing') || { totalAmount: 0, count: 0 };
  
  return {
    totalRevenue: incoming.totalAmount,
    totalExpenses: outgoing.totalAmount,
    netProfit: incoming.totalAmount - outgoing.totalAmount,
    incomingCount: incoming.count,
    outgoingCount: outgoing.count
  };
};

module.exports = mongoose.model('AdminFinance', adminFinanceSchema);

