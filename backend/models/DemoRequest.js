const mongoose = require('mongoose');

const demoRequestSchema = new mongoose.Schema({
  // Reference to the lead
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  
  // Client information
  clientName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Client name cannot exceed 100 characters']
  },
  
  mobileNumber: {
    type: String,
    required: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  reference: {
    type: String,
    trim: true,
    maxlength: [200, 'Reference cannot exceed 200 characters']
  },
  
  // Request status
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Admin notes
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  },
  
  // Demo delivery details
  demoDelivered: {
    type: Boolean,
    default: false
  },
  
  demoDeliveredAt: {
    type: Date
  },
  
  demoDeliveryMethod: {
    type: String,
    enum: ['email', 'phone', 'meeting', 'video_call', 'other']
  },
  
  // Who created this request
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sales',
    required: true
  },
  
  // Who handled this request (admin)
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Indexes for better performance
demoRequestSchema.index({ lead: 1 });
demoRequestSchema.index({ requestedBy: 1 });
demoRequestSchema.index({ status: 1 });
demoRequestSchema.index({ createdAt: -1 });

// Method to mark as completed
demoRequestSchema.methods.markCompleted = function(adminId, deliveryMethod, notes) {
  this.status = 'completed';
  this.demoDelivered = true;
  this.demoDeliveredAt = new Date();
  this.handledBy = adminId;
  this.demoDeliveryMethod = deliveryMethod;
  if (notes) {
    this.adminNotes = notes;
  }
  return this.save();
};

// Method to update status
demoRequestSchema.methods.updateStatus = function(newStatus, adminId, notes) {
  this.status = newStatus;
  this.handledBy = adminId;
  if (notes) {
    this.adminNotes = notes;
  }
  return this.save();
};

// Virtual to check if request is overdue (older than 24 hours and still pending)
demoRequestSchema.virtual('isOverdue').get(function() {
  if (this.status !== 'pending') return false;
  const hoursSinceCreated = (new Date() - this.createdAt) / (1000 * 60 * 60);
  return hoursSinceCreated > 24;
});

// Remove sensitive data from JSON output
demoRequestSchema.methods.toJSON = function() {
  const demoRequest = this.toObject();
  return demoRequest;
};

module.exports = mongoose.model('DemoRequest', demoRequestSchema);
