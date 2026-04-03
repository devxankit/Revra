const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true, // unique: true creates an index automatically, no need for explicit index
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
    enum: ['new', 'connected', 'hot', 'converted', 'lost', 'not_picked', 'followup', 'quotation_sent', 'dq_sent', 'app_client', 'web', 'demo_requested', 'not_interested'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low', 'urgent'],
    default: 'medium'
  },
  source: {
    type: String,
    enum: ['manual', 'bulk_upload', 'channel_partner', 'website_form', 'referral', 'walk_in'],
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
    ref: 'Sales'
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
    enum: ['Admin', 'Sales']
  },
  // Demo request info (optional, used by sales demo-requests page)
  demoRequest: {
    status: { type: String, enum: ['pending', 'scheduled', 'completed', 'cancelled'], default: undefined },
    preferredDate: { type: Date },
    preferredTime: { type: String },
    notes: { type: String, trim: true },
    updatedAt: { type: Date }
  },
  // Link to lead profile (when lead gets contacted and profiled)
  leadProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadProfile'
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
  // Meeting tracking
  meetings: [{
    scheduledDate: Date,
    scheduledTime: String,
    type: { type: String, enum: ['in-person', 'video', 'phone'] },
    location: String,
    assignee: String,
    notes: String,
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'], default: 'scheduled' },
    completedAt: Date,
    createdAt: { type: Date, default: Date.now }
  }],
  // Lost lead reason
  lostReason: {
    type: String,
    maxlength: [500, 'Lost reason cannot exceed 500 characters']
  },
  // Transfer history
  transferHistory: [{
    fromSales: { type: mongoose.Schema.Types.ObjectId, ref: 'Sales' },
    toSales: { type: mongoose.Schema.Types.ObjectId, ref: 'Sales' },
    transferredAt: { type: Date, default: Date.now },
    reason: String
  }],
  // When this sales lead was shared with channel partner(s) – used to exclude from New Leads list
  sharedWithCP: [{
    sharedAt: { type: Date, default: Date.now }
  }],
  // Activity/interaction log
  activities: [{
    type: { type: String, enum: ['call', 'email', 'whatsapp', 'meeting', 'note', 'status_change', 'followup_added', 'followup_completed', 'followup_cancelled', 'followup_rescheduled'] },
    description: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Sales' },
    timestamp: { type: Date, default: Date.now }
  }],
  // Conversion timestamp (for accurate filtering)
  convertedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
// Note: phone index is created automatically by unique: true, so we don't need explicit index
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ category: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ priority: 1 });
leadSchema.index({ createdAt: -1 });

// Virtual for formatted phone number
leadSchema.virtual('formattedPhone').get(function () {
  if (this.phone && this.phone.length === 10) {
    return `+91 ${this.phone.slice(0, 5)} ${this.phone.slice(5)}`;
  }
  return this.phone;
});

// Virtual for days since last contact
leadSchema.virtual('daysSinceLastContact').get(function () {
  if (!this.lastContactDate) return null;
  const now = new Date();
  const diffTime = Math.abs(now - this.lastContactDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for days until next follow-up
leadSchema.virtual('daysUntilFollowUp').get(function () {
  if (!this.nextFollowUpDate) return null;
  const now = new Date();
  const diffTime = this.nextFollowUpDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to update status
leadSchema.methods.updateStatus = function (newStatus) {
  const validTransitions = {
    'new': ['connected', 'not_picked', 'not_interested', 'lost'],
    'connected': ['hot', 'followup', 'quotation_sent', 'dq_sent', 'app_client', 'web', 'demo_requested', 'not_interested', 'lost'],
    'not_picked': ['connected', 'followup', 'not_interested', 'lost'],
    'followup': ['connected', 'hot', 'quotation_sent', 'dq_sent', 'app_client', 'web', 'demo_requested', 'not_interested', 'lost'],
    'quotation_sent': ['connected', 'hot', 'dq_sent', 'app_client', 'web', 'demo_requested', 'converted', 'not_interested', 'lost'],
    'dq_sent': ['connected', 'hot', 'quotation_sent', 'app_client', 'web', 'demo_requested', 'converted', 'not_interested', 'lost'],
    'app_client': ['connected', 'hot', 'quotation_sent', 'dq_sent', 'web', 'demo_requested', 'converted', 'not_interested', 'lost'],
    'web': ['connected', 'hot', 'quotation_sent', 'dq_sent', 'app_client', 'demo_requested', 'converted', 'not_interested', 'lost'],
    'demo_requested': ['connected', 'hot', 'quotation_sent', 'dq_sent', 'app_client', 'web', 'converted', 'not_interested', 'lost'],
    'hot': ['connected', 'followup', 'quotation_sent', 'dq_sent', 'app_client', 'web', 'demo_requested', 'converted', 'not_interested', 'lost'],
    'converted': [], // Final state
    'lost': ['connected'], // Can be recovered and connected
    'not_interested': ['connected'] // Recoverable to connected
  };

  if (!validTransitions[this.status].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
  }

  this.status = newStatus;
  if (newStatus === 'converted' || newStatus === 'lost' || newStatus === 'not_interested') {
    this.lastContactDate = new Date();
  }
  return this.save();
};

// Method to assign to sales employee
leadSchema.methods.assignToSales = function (salesId) {
  this.assignedTo = salesId;
  this.lastContactDate = new Date();
  return this.save();
};

// Method to add follow-up
leadSchema.methods.addFollowUp = function (followUpData) {
  this.followUps.push(followUpData);

  // Update nextFollowUpDate to the nearest upcoming follow-up
  const upcomingFollowUps = this.followUps
    .filter(fu => fu.status === 'pending' && fu.scheduledDate >= new Date())
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

  if (upcomingFollowUps.length > 0) {
    this.nextFollowUpDate = upcomingFollowUps[0].scheduledDate;
  }

  return this.save();
};

// Method to complete follow-up
leadSchema.methods.completeFollowUp = function (followUpId) {
  const followUp = this.followUps.id(followUpId);
  if (followUp) {
    followUp.status = 'completed';
    followUp.completedAt = new Date();
    return this.save();
  }
  throw new Error('Follow-up not found');
};

// Method to add meeting
leadSchema.methods.addMeeting = function (meetingData) {
  this.meetings.push(meetingData);
  return this.save();
};

// Method to complete meeting
leadSchema.methods.completeMeeting = function (meetingId) {
  const meeting = this.meetings.id(meetingId);
  if (meeting) {
    meeting.status = 'completed';
    meeting.completedAt = new Date();
    return this.save();
  }
  throw new Error('Meeting not found');
};

// Method to add activity
leadSchema.methods.addActivity = function (activityData) {
  this.activities.push(activityData);
  this.lastContactDate = new Date();
  return this.save();
};

// Method to transfer lead to another sales employee
leadSchema.methods.transferToSales = function (fromSalesId, toSalesId, reason) {
  this.transferHistory.push({
    fromSales: fromSalesId,
    toSales: toSalesId,
    reason: reason
  });
  this.assignedTo = toSalesId;
  this.lastContactDate = new Date();
  return this.save();
};

// Static method to get leads by status
leadSchema.statics.getLeadsByStatus = function (status) {
  return this.find({ status }).populate('category', 'name color').populate('assignedTo', 'name email');
};

// Static method to get unassigned leads
leadSchema.statics.getUnassignedLeads = function () {
  return this.find({ assignedTo: null }).populate('category', 'name color');
};

// Static method to get leads by category
leadSchema.statics.getLeadsByCategory = function (categoryId) {
  return this.find({ category: categoryId }).populate('assignedTo', 'name email');
};

// Static method to get conversion rate
leadSchema.statics.getConversionRate = function () {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        converted: {
          $sum: {
            $cond: [{ $eq: ['$status', 'converted'] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        conversionRate: {
          $multiply: [
            { $divide: ['$converted', '$total'] },
            100
          ]
        },
        totalLeads: '$total',
        convertedLeads: '$converted'
      }
    }
  ]);
};

// Remove sensitive data from JSON output
leadSchema.methods.toJSON = function () {
  const lead = this.toObject();
  return lead;
};

module.exports = mongoose.model('Lead', leadSchema);
