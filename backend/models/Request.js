const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  // Module that created this request
  module: {
    type: String,
    required: true,
    enum: ['admin', 'client', 'employee', 'pm', 'sales', 'channel-partner'],
    trim: true
  },
  // Type of request
  type: {
    type: String,
    required: true,
    enum: [
      'approval',
      'feedback',
      'confirmation',
      'payment-recovery',
      'hold-work',
      'accelerate-work',
      'increase-cost',
      'access-request',
      'timeline-extension',
      'budget-approval',
      'resource-allocation',
      'withdrawal-request',
      'information-request',
      'issue'
    ],
    trim: true
  },
  // Request title
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  // Request description
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  // Category for organization
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  // Who created this request (polymorphic - can be Admin, Client, Employee, PM, or Sales)
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'requestedByModel'
  },
  requestedByModel: {
    type: String,
    required: true,
    enum: ['Admin', 'Client', 'Employee', 'PM', 'Sales', 'ChannelPartner']
  },
  // Who is the recipient (polymorphic - can be Admin, Client, Employee, PM, Sales, or ChannelPartner)
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientModel'
  },
  recipientModel: {
    type: String,
    required: true,
    enum: ['Admin', 'Client', 'Employee', 'PM', 'Sales', 'ChannelPartner']
  },
  // Related project (optional for non-project requests)
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  // Related client (optional for non-client requests)
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  // Amount field (for payment-recovery requests only)
  amount: {
    type: Number,
    min: 0
  },
  // Metadata for storing additional request-specific data (e.g., installmentId, paidDate)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Request status
  status: {
    type: String,
    enum: ['pending', 'responded', 'approved', 'rejected'],
    default: 'pending'
  },
  // Response details
  response: {
    type: {
      type: String,
      enum: ['approve', 'reject', 'request_changes']
    },
    message: {
      type: String,
      trim: true,
      maxlength: [2000, 'Response message cannot exceed 2000 characters']
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: false
    },
    respondedByModel: {
      type: String,
      enum: ['Admin', 'Client', 'Employee', 'PM', 'Sales', 'ChannelPartner']
    },
    respondedDate: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
requestSchema.index({ module: 1, status: 1 });
requestSchema.index({ type: 1 });
requestSchema.index({ requestedBy: 1, requestedByModel: 1 });
requestSchema.index({ recipient: 1, recipientModel: 1 });
requestSchema.index({ client: 1 });
requestSchema.index({ project: 1 });
requestSchema.index({ priority: 1 });
requestSchema.index({ createdAt: -1 });
requestSchema.index({ status: 1, priority: 1 });

// Virtual for checking if request is pending
requestSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

// Method to respond to request
requestSchema.methods.respond = function(responderId, responderModel, responseType, message) {
  if (!['approve', 'reject', 'request_changes'].includes(responseType)) {
    throw new Error('Invalid response type');
  }

  this.status = responseType === 'approve' ? 'approved' : 
                responseType === 'reject' ? 'rejected' : 'responded';
  
  this.response = {
    type: responseType,
    message: message || '',
    respondedBy: responderId,
    respondedByModel: responderModel,
    respondedDate: new Date()
  };

  return this.save();
};

// Remove sensitive data from JSON output
requestSchema.methods.toJSON = function() {
  const request = this.toObject();
  return request;
};

module.exports = mongoose.model('Request', requestSchema);

