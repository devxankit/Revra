const mongoose = require('mongoose');

const cpLeadSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  name: {
    type: String,
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  status: {
    type: String,
    enum: ['new', 'connected', 'not_converted', 'not_picked', 'lost', 'followup', 'converted'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low', 'urgent'],
    default: 'medium'
  },
  source: {
    type: String,
    enum: ['manual', 'bulk_upload'],
    default: 'manual'
  },
  value: {
    type: Number,
    min: 0,
    default: 0
  },
  lastContactDate: {
    type: Date
  },
  nextFollowUpDate: {
    type: Date
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChannelPartner',
    required: true
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadCategory',
    required: [true, 'Category is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Creator is required'],
    refPath: 'creatorModel'
  },
  creatorModel: {
    type: String,
    required: true,
    enum: ['ChannelPartner', 'Admin']
  },
  // Lead sharing - two-way sharing with Sales Team Leads
  sharedWithSales: [{
    salesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sales'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChannelPartner'
    }
  }],
  sharedFromSales: [{
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sales'
    }
  }],
  // Link to lead profile
  leadProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CPLeadProfile'
  },
  // Follow-up tracking
  followUps: [{
    scheduledDate: Date,
    scheduledTime: String,
    type: { type: String, enum: ['call', 'email', 'meeting', 'whatsapp', 'visit', 'demo'], default: 'call' },
    notes: String,
    priority: { type: String, enum: ['high', 'medium', 'low', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
    completedAt: Date,
    createdAt: { type: Date, default: Date.now }
  }],
  // Activity/interaction log
  activities: [{
    type: { type: String, enum: ['call', 'email', 'whatsapp', 'meeting', 'note', 'status_change', 'followup_added', 'followup_completed', 'followup_cancelled', 'followup_rescheduled', 'shared', 'unshared'], default: 'note' },
    description: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'activityCreatorModel' },
    activityCreatorModel: { type: String, enum: ['ChannelPartner', 'Sales'] },
    timestamp: { type: Date, default: Date.now }
  }],
  // Lost lead reason
  lostReason: {
    type: String,
    maxlength: [500, 'Lost reason cannot exceed 500 characters']
  },
  // Conversion data (when converted to client)
  convertedToClient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  convertedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
cpLeadSchema.index({ assignedTo: 1 });
// One lead per phone per channel partner (same phone can exist for different CPs)
cpLeadSchema.index({ assignedTo: 1, phone: 1 }, { unique: true });
cpLeadSchema.index({ category: 1 });
cpLeadSchema.index({ status: 1 });
cpLeadSchema.index({ createdBy: 1 });
cpLeadSchema.index({ 'sharedWithSales.salesId': 1 });
cpLeadSchema.index({ createdAt: -1 });

// Method to update status
cpLeadSchema.methods.updateStatus = function(newStatus) {
  const validTransitions = {
    'new': ['connected', 'not_picked', 'lost'],
    'connected': ['not_converted', 'followup', 'converted', 'lost'],
    'not_picked': ['connected', 'followup', 'lost'],
    'followup': ['connected', 'not_converted', 'converted', 'lost'],
    'not_converted': ['connected', 'followup', 'converted', 'lost'],
    'converted': [], // Final state
    'lost': ['connected'] // Can be recovered
  };

  if (!validTransitions[this.status] || !validTransitions[this.status].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
  }

  this.status = newStatus;
  if (newStatus === 'converted' || newStatus === 'lost') {
    this.lastContactDate = new Date();
  }
  return this.save();
};

// Method to add follow-up
cpLeadSchema.methods.addFollowUp = function(followUpData) {
  this.followUps.push({
    ...followUpData,
    createdAt: new Date()
  });
  return this.save();
};

// Method to add activity
cpLeadSchema.methods.addActivity = function(activityData) {
  this.activities.push({
    ...activityData,
    timestamp: new Date()
  });
  return this.save();
};

// Method to share with Sales
cpLeadSchema.methods.shareWithSales = function(salesId, cpId) {
  // Check if already shared
  const alreadyShared = this.sharedWithSales.some(
    share => share.salesId.toString() === salesId.toString()
  );
  
  if (!alreadyShared) {
    this.sharedWithSales.push({
      salesId,
      sharedBy: cpId,
      sharedAt: new Date()
    });
    this.addActivity({
      type: 'shared',
      description: `Lead shared with Sales Team Lead`,
      performedBy: cpId,
      activityCreatorModel: 'ChannelPartner'
    });
  }
  return this.save();
};

// Method to unshare with Sales
cpLeadSchema.methods.unshareWithSales = function(salesId, cpId) {
  this.sharedWithSales = this.sharedWithSales.filter(
    share => share.salesId.toString() !== salesId.toString()
  );
  this.addActivity({
    type: 'unshared',
    description: `Lead unshared with Sales Team Lead`,
    performedBy: cpId,
    activityCreatorModel: 'ChannelPartner'
  });
  return this.save();
};

module.exports = mongoose.model('CPLead', cpLeadSchema);
