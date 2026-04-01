const mongoose = require('mongoose');

const leadProfileSchema = new mongoose.Schema({
  // Reference to the lead
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
    unique: true // unique: true creates an index automatically
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
    taxi: { type: Boolean, default: false }
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
  
  // Status flags
  quotationSent: { type: Boolean, default: false },
  demoSent: { type: Boolean, default: false },
  
  // Documents/screenshots
  documents: [{
    public_id: String,
    secure_url: String,
    originalName: String,
    uploadedAt: { type: Date, default: Date.now },
    documentType: { 
      type: String, 
      enum: ['quotation', 'demo', 'payment_proof', 'requirement', 'other'] 
    }
  }],
  
  // Notes specific to this lead profile
  notes: [{
    content: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Sales' },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Conversion data (filled when converting to client)
  conversionData: {
    projectName: String,
    finishedDays: Number,
    totalCost: Number,
    advanceReceived: Number,
    includeGST: { type: Boolean, default: false },
    // Optional project expense configuration captured at conversion time
    includeProjectExpenses: { type: Boolean, default: false },
    projectExpenseReservedAmount: { type: Number, min: 0 },
    projectExpenseRequirements: {
      type: String,
      trim: true,
      maxlength: [2000, 'Expense requirements cannot exceed 2000 characters']
    },
    paymentScreenshot: {
      public_id: String,
      secure_url: String,
      originalName: String
    }
  },
  
  // Who created this profile
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sales',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
// Note: lead index is created automatically by unique: true, so we don't need explicit index
leadProfileSchema.index({ createdBy: 1 });
leadProfileSchema.index({ createdAt: -1 });
leadProfileSchema.index({ category: 1 });

// Virtual to check if category or project type is set
leadProfileSchema.virtual('hasProjectType').get(function() {
  // Check category first (preferred), then fall back to legacy projectType flags
  return !!this.category || this.projectType.web || this.projectType.app || this.projectType.taxi;
});

// Method to add a note to the profile
leadProfileSchema.methods.addNote = function(content, salesId) {
  this.notes.push({
    content: content,
    addedBy: salesId
  });
  return this.save();
};

// Method to update conversion data when converting to client
leadProfileSchema.methods.updateConversionData = function(data) {
  this.conversionData = {
    ...this.conversionData,
    ...data
  };
  return this.save();
};

// Method to add a document/screenshot
leadProfileSchema.methods.addDocument = function(documentData) {
  this.documents.push(documentData);
  return this.save();
};

// Method to update project type flags
leadProfileSchema.methods.updateProjectType = function(projectTypeData) {
  this.projectType = {
    ...this.projectType,
    ...projectTypeData
  };
  return this.save();
};

// Method to mark quotation as sent
leadProfileSchema.methods.markQuotationSent = function() {
  this.quotationSent = true;
  return this.save();
};

// Method to mark demo as sent
leadProfileSchema.methods.markDemoSent = function() {
  this.demoSent = true;
  return this.save();
};

// Pre-save validation
leadProfileSchema.pre('save', function(next) {
  // Ensure category is set OR at least one legacy project type is selected (for backward compatibility)
  if (!this.category && !this.hasProjectType) {
    return next(new Error('Category or at least one project type must be selected'));
  }
  
  // Validate conversion data if provided
  if (this.conversionData && this.conversionData.totalCost) {
    if (this.conversionData.totalCost < 0) {
      return next(new Error('Total cost cannot be negative'));
    }
    if (this.conversionData.advanceReceived < 0) {
      return next(new Error('Advance received cannot be negative'));
    }
    if (this.conversionData.advanceReceived > this.conversionData.totalCost) {
      return next(new Error('Advance received cannot exceed total cost'));
    }
  }
  
  next();
});

// Remove sensitive data from JSON output
leadProfileSchema.methods.toJSON = function() {
  const leadProfile = this.toObject();
  return leadProfile;
};

module.exports = mongoose.model('LeadProfile', leadProfileSchema);
