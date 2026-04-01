const mongoose = require('mongoose');

const cpWalletSchema = new mongoose.Schema({
  channelPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChannelPartner',
    required: [true, 'Channel Partner ID is required'],
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes
// Note: channelPartner index is created automatically by unique: true, so we don't need explicit index

// Transaction schema (embedded or separate - using separate for better querying)
const cpWalletTransactionSchema = new mongoose.Schema({
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CPWallet',
    required: true
  },
  channelPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChannelPartner',
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  transactionType: {
    type: String,
    enum: ['commission', 'incentive', 'reward', 'withdrawal', 'refund', 'adjustment'],
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  reference: {
    type: {
      type: String,
      enum: ['lead_conversion', 'client_payment', 'reward', 'incentive', 'withdrawal_request', 'manual_adjustment', 'other']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  balanceAfter: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Indexes for transactions
cpWalletTransactionSchema.index({ wallet: 1 });
cpWalletTransactionSchema.index({ channelPartner: 1 });
cpWalletTransactionSchema.index({ createdAt: -1 });
cpWalletTransactionSchema.index({ transactionType: 1 });
cpWalletTransactionSchema.index({ status: 1 });

// Withdrawal request schema
const cpWithdrawalRequestSchema = new mongoose.Schema({
  channelPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChannelPartner',
    required: true
  },
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CPWallet',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  bankDetails: {
    accountHolderName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true },
    bankName: { type: String, required: true },
    branch: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'processed', 'cancelled'],
    default: 'pending'
  },
  processedAt: Date,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  rejectionReason: String,
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CPWalletTransaction'
  }
}, {
  timestamps: true
});

// Indexes for withdrawal requests
cpWithdrawalRequestSchema.index({ channelPartner: 1 });
cpWithdrawalRequestSchema.index({ status: 1 });
cpWithdrawalRequestSchema.index({ createdAt: -1 });

// Method to update wallet balance
cpWalletSchema.methods.updateBalance = async function(amount, type) {
  if (type === 'credit') {
    this.balance += amount;
    this.totalEarned += amount;
  } else if (type === 'debit') {
    if (this.balance < amount) {
      throw new Error('Insufficient balance');
    }
    this.balance -= amount;
    this.totalWithdrawn += amount;
  }
  return this.save();
};

module.exports = {
  CPWallet: mongoose.model('CPWallet', cpWalletSchema),
  CPWalletTransaction: mongoose.model('CPWalletTransaction', cpWalletTransactionSchema),
  CPWithdrawalRequest: mongoose.model('CPWithdrawalRequest', cpWithdrawalRequestSchema)
};
