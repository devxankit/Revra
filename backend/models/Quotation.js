const mongoose = require('mongoose');

const quotationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quotation title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  // PDF document stored in Cloudinary
  pdfDocument: {
    public_id: {
      type: String
    },
    secure_url: {
      type: String
    },
    originalName: {
      type: String
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  // Created by admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  // Track sharing statistics
  timesShared: {
    type: Number,
    default: 0
  },
  lastShared: {
    type: Date
  },
  // Track which channel partners have shared this quotation
  sharedBy: [{
    channelPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChannelPartner'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
quotationSchema.index({ category: 1, status: 1 });
quotationSchema.index({ createdBy: 1 });
quotationSchema.index({ status: 1 });
quotationSchema.index({ createdAt: -1 });

// Method to increment share count
quotationSchema.methods.incrementShare = function(cpId) {
  this.timesShared += 1;
  this.lastShared = new Date();
  
  // Add to sharedBy array if not already present
  const existingShare = this.sharedBy.find(
    share => share.channelPartner.toString() === cpId.toString()
  );
  
  if (!existingShare) {
    this.sharedBy.push({
      channelPartner: cpId,
      sharedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to format price with currency
quotationSchema.methods.getFormattedPrice = function() {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: this.currency || 'INR',
    minimumFractionDigits: 0
  });
  return formatter.format(this.price);
};

module.exports = mongoose.model('Quotation', quotationSchema);
