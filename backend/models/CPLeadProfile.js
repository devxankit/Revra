const mongoose = require('mongoose');

const cpLeadProfileSchema = new mongoose.Schema({
  // Reference to the CP lead
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CPLead',
    required: true,
    unique: true
  },
  
  // Basic information (collected after first contact)
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  businessName: {
    type: String,
    trim: true,
    maxlength: [200, 'Business name cannot exceed 200 characters']
  },
  
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Valid email required']
  },
  
  // Project category (synced with lead category)
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadCategory'
  },
  
  // Legacy project type flags (kept for backward compatibility)
  projectType: {
    web: { type: Boolean, default: false },
    app: { type: Boolean, default: false },
    taxi: { type: Boolean, default: false },
    other: { type: Boolean, default: false }
  },
  
  estimatedCost: {
    type: Number,
    min: 0,
    default: 0
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  // Location information (important for Channel Partners)
  location: {
    city: String,
    state: String,
    country: { type: String, default: 'India' }
  },
  
  // Business details
  businessType: {
    type: String,
    enum: ['Startup', 'SME', 'Enterprise', 'Individual', 'Other'],
    trim: true
  },
  
  // Status flags
  quotationSent: { type: Boolean, default: false },
  demoSent: { type: Boolean, default: false },
  proposalSent: { type: Boolean, default: false },
  
  // Documents/screenshots
  documents: [{
    public_id: String,
    secure_url: String,
    originalName: String,
    uploadedAt: { type: Date, default: Date.now },
    documentType: { 
      type: String, 
      enum: ['quotation', 'demo', 'payment_proof', 'requirement', 'proposal', 'other'] 
    }
  }],
  
  // Notes specific to this lead profile
  notes: [{
    content: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'noteCreatorModel' },
    noteCreatorModel: { type: String, enum: ['ChannelPartner', 'Sales'] },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Conversion data (filled when converting to client)
  conversionData: {
    projectName: String,
    finishedDays: Number,
    totalCost: Number,
    advanceReceived: Number,
    includeGST: { type: Boolean, default: false },
    paymentScreenshot: {
      public_id: String,
      secure_url: String,
      originalName: String
    }
  },
  
  // Who created this profile
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChannelPartner',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
cpLeadProfileSchema.index({ createdBy: 1 });
cpLeadProfileSchema.index({ createdAt: -1 });
cpLeadProfileSchema.index({ 'location.city': 1 });
cpLeadProfileSchema.index({ category: 1 });

// Virtual to check if category or project type is set
cpLeadProfileSchema.virtual('hasProjectType').get(function() {
  // Check category first (preferred), then fall back to legacy projectType flags
  return !!this.category || this.projectType.web || this.projectType.app || this.projectType.taxi || this.projectType.other;
});

// Method to add a note to the profile
cpLeadProfileSchema.methods.addNote = function(content, creatorId, creatorModel = 'ChannelPartner') {
  this.notes.push({
    content: content,
    addedBy: creatorId,
    noteCreatorModel: creatorModel
  });
  return this.save();
};

// Method to update conversion data when converting to client
cpLeadProfileSchema.methods.updateConversionData = function(data) {
  this.conversionData = {
    ...this.conversionData,
    ...data
  };
  return this.save();
};

// Method to add a document/screenshot
cpLeadProfileSchema.methods.addDocument = function(documentData) {
  this.documents.push(documentData);
  return this.save();
};

module.exports = mongoose.model('CPLeadProfile', cpLeadProfileSchema);
