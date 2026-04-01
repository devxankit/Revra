const mongoose = require('mongoose');

const projectCredentialSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  credentialType: {
    type: String,
    required: [true, 'Credential type is required'],
    enum: ['domain', 'server', 'hosting', 'ssl', 'database', 'api', 'email', 'cpanel', 'ftp', 'ssh', 'other'],
    trim: true
  },
  title: {
    type: String,
    required: false, // Title is optional, auto-generated if not provided
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    default: 'Credential'
  },
  username: {
    type: String,
    trim: true,
    maxlength: [200, 'Username cannot exceed 200 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [200, 'Email cannot exceed 200 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    trim: true
  },
  url: {
    type: String,
    trim: true,
    maxlength: [500, 'URL cannot exceed 500 characters']
  },
  ipAddress: {
    type: String,
    trim: true,
    maxlength: [50, 'IP address cannot exceed 50 characters']
  },
  port: {
    type: Number,
    min: 1,
    max: 65535
  },
  additionalInfo: {
    type: String,
    trim: true,
    maxlength: [1000, 'Additional info cannot exceed 1000 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  expiryDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Created by admin is required']
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Indexes for better performance
projectCredentialSchema.index({ project: 1 });
projectCredentialSchema.index({ credentialType: 1 });
projectCredentialSchema.index({ isActive: 1 });
projectCredentialSchema.index({ project: 1, credentialType: 1 });

// Remove sensitive data from JSON output (password should be handled carefully)
projectCredentialSchema.methods.toJSON = function() {
  const credential = this.toObject();
  // Don't remove password from JSON - it's needed for display
  // But ensure it's encrypted in production
  return credential;
};

module.exports = mongoose.model('ProjectCredential', projectCredentialSchema);
