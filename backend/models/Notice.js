const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notice title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Notice content is required'],
    trim: true,
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video'],
    default: 'text',
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  targetAudience: {
    type: String,
    enum: ['all', 'sales', 'development', 'project-managers', 'hr', 'admin'],
    default: 'all'
  },
  // Image fields
  imageUrl: {
    type: String,
    default: null
  },
  imagePublicId: {
    type: String,
    default: null
  },
  imageData: {
    public_id: String,
    secure_url: String,
    original_filename: String,
    format: String,
    bytes: Number,
    width: Number,
    height: Number,
    resource_type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  // Video fields
  videoUrl: {
    type: String,
    default: null
  },
  videoPublicId: {
    type: String,
    default: null
  },
  videoData: {
    public_id: String,
    secure_url: String,
    original_filename: String,
    format: String,
    bytes: Number,
    width: Number,
    height: Number,
    resource_type: String,
    duration: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  // Attachments (for future use)
  attachments: [{
    public_id: String,
    secure_url: String,
    originalName: String,
    original_filename: String,
    format: String,
    size: Number,
    bytes: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Author information
  author: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'authorModel',
    required: true
  },
  authorModel: {
    type: String,
    enum: ['Admin', 'PM', 'Sales', 'Employee'],
    required: true
  },
  authorName: {
    type: String,
    default: 'Admin'
  },
  // Status and scheduling
  status: {
    type: String,
    enum: ['draft', 'published', 'scheduled'],
    default: 'published'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  scheduledDate: {
    type: Date,
    default: null
  },
  scheduledTime: {
    type: String,
    default: null
  },
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  viewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'viewedBy.userModel'
    },
    userModel: {
      type: String,
      enum: ['Admin', 'PM', 'Sales', 'Employee', 'Client']
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
noticeSchema.index({ status: 1 });
noticeSchema.index({ type: 1 });
noticeSchema.index({ isPinned: 1, createdAt: -1 });
noticeSchema.index({ targetAudience: 1 });
noticeSchema.index({ priority: 1 });
noticeSchema.index({ scheduledDate: 1 });
noticeSchema.index({ createdAt: -1 });

// Virtual for formatted date
noticeSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toISOString().split('T')[0];
});

// Virtual for formatted time
noticeSchema.virtual('formattedTime').get(function() {
  const date = new Date(this.createdAt);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
});

// Method to increment views
noticeSchema.methods.incrementViews = function(userId, userModel) {
  // Check if user has already viewed
  const hasViewed = this.viewedBy.some(
    view => view.user.toString() === userId.toString() && view.userModel === userModel
  );
  
  if (!hasViewed) {
    this.viewedBy.push({
      user: userId,
      userModel: userModel
    });
  }
  
  this.views = this.viewedBy.length;
  return this.save();
};

// Pre-save middleware
noticeSchema.pre('save', function(next) {
  // If image type and has imageUrl, ensure imageData is set
  if (this.type === 'image' && this.imageUrl && !this.imageData) {
    // This will be handled by controller when uploading
  }
  
  // If video type and has videoUrl, ensure videoData is set
  if (this.type === 'video' && this.videoUrl && !this.videoData) {
    // This will be handled by controller when uploading
  }
  
  // Set scheduled status
  if (this.isScheduled && this.scheduledDate) {
    this.status = 'scheduled';
  } else if (!this.isScheduled && this.status === 'scheduled') {
    this.status = 'published';
  }
  
  next();
});

// Remove sensitive data from JSON output
noticeSchema.methods.toJSON = function() {
  const notice = this.toObject();
  return notice;
};

module.exports = mongoose.model('Notice', noticeSchema);

