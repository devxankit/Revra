const mongoose = require('mongoose');

const incentiveSchema = new mongoose.Schema({
  salesEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sales',
    required: [true, 'Sales employee is required']
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
  dateAwarded: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'conversion-pending', 'conversion-current'],
    default: 'pending'
  },
  // Conversion-based incentive fields
  isConversionBased: {
    type: Boolean,
    default: false
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  currentBalance: {
    type: Number,
    min: 0,
    default: 0
  },
  pendingBalance: {
    type: Number,
    min: 0,
    default: 0
  },
  pendingMovedToCurrentAt: {
    type: Date
  },
  // Team incentive fields
  teamLeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sales'
  },
  teamMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sales'
  },
  isTeamLeadIncentive: {
    type: Boolean,
    default: false
  },
  isTeamMemberIncentive: {
    type: Boolean,
    default: false
  },
  originalIncentiveId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incentive'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: function() {
      // Not required for conversion-based incentives
      return !this.isConversionBased;
    }
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: {
    type: Date
  },
  paidAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
incentiveSchema.index({ salesEmployee: 1 });
incentiveSchema.index({ status: 1 });
incentiveSchema.index({ dateAwarded: -1 });
incentiveSchema.index({ createdAt: -1 });
incentiveSchema.index({ isConversionBased: 1 });
incentiveSchema.index({ projectId: 1 });
incentiveSchema.index({ clientId: 1 });
incentiveSchema.index({ leadId: 1 });
incentiveSchema.index({ teamLeadId: 1 });
incentiveSchema.index({ teamMemberId: 1 });
incentiveSchema.index({ isTeamLeadIncentive: 1 });
incentiveSchema.index({ isTeamMemberIncentive: 1 });
incentiveSchema.index({ originalIncentiveId: 1 });

// Virtual for days since awarded
incentiveSchema.virtual('daysSinceAwarded').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.dateAwarded);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to approve incentive
incentiveSchema.methods.approve = function(adminId) {
  if (this.status !== 'pending') {
    throw new Error('Only pending incentives can be approved');
  }
  
  this.status = 'approved';
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  return this.save();
};

// Method to mark as paid
incentiveSchema.methods.markAsPaid = function() {
  if (this.status !== 'approved') {
    throw new Error('Only approved incentives can be marked as paid');
  }
  
  this.status = 'paid';
  this.paidAt = new Date();
  return this.save();
};

// Method to move pending balance to current balance (for conversion-based incentives)
incentiveSchema.methods.movePendingToCurrent = async function(amount) {
  if (!this.isConversionBased) {
    throw new Error('This method is only for conversion-based incentives');
  }
  
  if (amount > this.pendingBalance) {
    throw new Error('Cannot move more than available pending balance');
  }
  
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  
  this.pendingBalance = Math.max(0, this.pendingBalance - amount);
  this.currentBalance += amount;
  this.pendingMovedToCurrentAt = new Date();
  
  // Update status if all pending is moved
  if (this.pendingBalance === 0 && this.currentBalance > 0) {
    this.status = 'conversion-current';
  }
  
  await this.save();
  
  // Update Sales model's currentIncentive field
  try {
    const Sales = mongoose.model('Sales');
    const salesEmployee = await Sales.findById(this.salesEmployee);
    if (salesEmployee) {
      await salesEmployee.updateCurrentIncentive();
    }
  } catch (error) {
    console.error('Error updating Sales currentIncentive after moving pending:', error);
    // Don't throw - the incentive update succeeded
  }
  
  return this;
};

// Static method to get incentives by sales employee
incentiveSchema.statics.getBySalesEmployee = function(salesId) {
  return this.find({ salesEmployee: salesId })
    .populate('createdBy', 'name')
    .populate('approvedBy', 'name')
    .sort({ dateAwarded: -1 });
};

// Static method to get incentives by status
incentiveSchema.statics.getByStatus = function(status) {
  return this.find({ status })
    .populate('salesEmployee', 'name email')
    .populate('createdBy', 'name')
    .populate('approvedBy', 'name')
    .sort({ dateAwarded: -1 });
};

// Static method to get incentive statistics
incentiveSchema.statics.getIncentiveStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    },
    {
      $group: {
        _id: null,
        totalIncentives: { $sum: '$count' },
        totalAmount: { $sum: '$totalAmount' },
        statusBreakdown: {
          $push: {
            status: '$_id',
            count: '$count',
            amount: '$totalAmount'
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalIncentives: 1,
        totalAmount: 1,
        statusBreakdown: 1,
        averageAmount: {
          $divide: ['$totalAmount', '$totalIncentives']
        }
      }
    }
  ]);
};

// Static method to get monthly incentive summary
incentiveSchema.statics.getMonthlySummary = function(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  return this.aggregate([
    {
      $match: {
        dateAwarded: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: '$salesEmployee',
        totalAmount: { $sum: '$amount' },
        incentiveCount: { $sum: 1 },
        averageAmount: { $avg: '$amount' }
      }
    },
    {
      $lookup: {
        from: 'sales',
        localField: '_id',
        foreignField: '_id',
        as: 'salesEmployee'
      }
    },
    {
      $unwind: '$salesEmployee'
    },
    {
      $project: {
        salesEmployee: {
          name: '$salesEmployee.name',
          email: '$salesEmployee.email'
        },
        totalAmount: 1,
        incentiveCount: 1,
        averageAmount: 1
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
};

// Pre-save middleware to update sales employee's current incentive
incentiveSchema.pre('save', async function(next) {
  // For conversion-based incentives, recalculate total incentive from all conversion-based incentives
  if (this.isConversionBased) {
    try {
      const Sales = mongoose.model('Sales');
      const salesEmployee = await Sales.findById(this.salesEmployee);
      if (salesEmployee) {
        // Recalculate currentIncentive as sum of all conversion-based incentives
        await salesEmployee.updateCurrentIncentive();
      }
    } catch (error) {
      console.error('Error updating Sales currentIncentive in pre-save hook:', error);
      // Don't fail the save operation
    }
  }
  // Note: Manual incentives are no longer supported, but keeping this for backward compatibility
  // if any old manual incentives exist
  if (this.isNew && this.status === 'approved' && !this.isConversionBased) {
    const Sales = mongoose.model('Sales');
    await Sales.findByIdAndUpdate(this.salesEmployee, {
      $inc: { currentIncentive: this.amount }
    });
  }
  next();
});

// Pre-remove middleware to update sales employee's current incentive
incentiveSchema.pre('deleteOne', { document: true, query: false }, async function() {
  // For conversion-based incentives, recalculate total incentive
  if (this.isConversionBased) {
    try {
      const Sales = mongoose.model('Sales');
      const salesEmployee = await Sales.findById(this.salesEmployee);
      if (salesEmployee) {
        await salesEmployee.updateCurrentIncentive();
      }
    } catch (error) {
      console.error('Error updating Sales currentIncentive in pre-remove hook:', error);
    }
  }
  // Handle old manual incentives for backward compatibility
  if (this.status === 'approved' && !this.isConversionBased) {
    const Sales = mongoose.model('Sales');
    await Sales.findByIdAndUpdate(this.salesEmployee, {
      $inc: { currentIncentive: -this.amount }
    });
  }
});

// Remove sensitive data from JSON output
incentiveSchema.methods.toJSON = function() {
  const incentive = this.toObject();
  return incentive;
};

module.exports = mongoose.model('Incentive', incentiveSchema);
