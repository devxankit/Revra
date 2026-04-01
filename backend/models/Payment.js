const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client is required']
  },
  milestone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Milestone'
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Payment amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']
  },
  paymentType: {
    type: String,
    required: [true, 'Payment type is required'],
    enum: ['advance', 'milestone', 'final', 'additional']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'credit_card', 'debit_card', 'paypal', 'stripe', 'check', 'cash', 'other'],
    default: 'bank_transfer'
  },
  paidAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PM',
    required: [true, 'Payment record creator is required']
  }
}, {
  timestamps: true
});

// Indexes for better performance
paymentSchema.index({ project: 1 });
paymentSchema.index({ client: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentType: 1 });
paymentSchema.index({ paidAt: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual for checking if payment is overdue
paymentSchema.virtual('isOverdue').get(function() {
  if (!this.createdAt) return false;
  // Consider payment overdue if it's been pending for more than 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return this.status === 'pending' && this.createdAt < thirtyDaysAgo;
});

// Method to mark payment as paid
paymentSchema.methods.markPaid = function(transactionId, paymentMethod) {
  this.status = 'completed';
  this.paidAt = new Date();
  if (transactionId) this.transactionId = transactionId;
  if (paymentMethod) this.paymentMethod = paymentMethod;
  return this.save();
};

// Method to mark payment as failed
paymentSchema.methods.markFailed = function(notes) {
  this.status = 'failed';
  if (notes) this.notes = notes;
  return this.save();
};

// Method to mark payment as refunded
paymentSchema.methods.markRefunded = function(notes) {
  this.status = 'refunded';
  if (notes) this.notes = notes;
  return this.save();
};

// Method to check if payment is overdue (using virtual property instead)
// paymentSchema.methods.isOverdue = function() {
//   if (!this.createdAt) return false;
//   const thirtyDaysAgo = new Date();
//   thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
//   return this.status === 'pending' && this.createdAt < thirtyDaysAgo;
// };

// Static method to get payment statistics for a project
paymentSchema.statics.getProjectPaymentStats = async function(projectId) {
  try {
    const stats = await this.aggregate([
      { $match: { project: mongoose.Types.ObjectId(projectId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    const result = {
      total: 0,
      pending: 0,
      completed: 0,
      failed: 0,
      refunded: 0,
      totalAmount: 0,
      pendingAmount: 0,
      completedAmount: 0
    };
    
    stats.forEach(stat => {
      result[stat._id] = stat.count;
      result.total += stat.count;
      result.totalAmount += stat.totalAmount;
      
      if (stat._id === 'pending') {
        result.pendingAmount = stat.totalAmount;
      } else if (stat._id === 'completed') {
        result.completedAmount = stat.totalAmount;
      }
    });
    
    return result;
  } catch (error) {
    throw new Error('Failed to get payment statistics');
  }
};

// Static method to get payment statistics for a client
paymentSchema.statics.getClientPaymentStats = async function(clientId) {
  try {
    const stats = await this.aggregate([
      { $match: { client: mongoose.Types.ObjectId(clientId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    const result = {
      total: 0,
      pending: 0,
      completed: 0,
      failed: 0,
      refunded: 0,
      totalAmount: 0,
      pendingAmount: 0,
      completedAmount: 0
    };
    
    stats.forEach(stat => {
      result[stat._id] = stat.count;
      result.total += stat.count;
      result.totalAmount += stat.totalAmount;
      
      if (stat._id === 'pending') {
        result.pendingAmount = stat.totalAmount;
      } else if (stat._id === 'completed') {
        result.completedAmount = stat.totalAmount;
      }
    });
    
    return result;
  } catch (error) {
    throw new Error('Failed to get client payment statistics');
  }
};

// Pre-save middleware to validate milestone belongs to project
paymentSchema.pre('save', async function(next) {
  if (this.milestone) {
    try {
      const milestone = await this.constructor.model('Milestone').findById(this.milestone);
      if (!milestone || !milestone.project.equals(this.project)) {
        return next(new Error('Milestone does not belong to the specified project'));
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Remove sensitive data from JSON output
paymentSchema.methods.toJSON = function() {
  const payment = this.toObject();
  return payment;
};

module.exports = mongoose.model('Payment', paymentSchema);

