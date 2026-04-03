const mongoose = require('mongoose');

const insurancePolicySchema = new mongoose.Schema({
  policyNumber: { type: String, required: true, unique: true, trim: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceProduct', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  status: { type: String, enum: ['active', 'expired', 'cancelled', 'renewed', 'pending'], default: 'pending' },
  premiumAmount: { type: Number, required: true },
  coverAmount: { type: Number, default: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  renewalDate: { type: Date },
  salesEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Sales' },
  notes: { type: String },
  documents: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'creatorModel' },
  creatorModel: { type: String, enum: ['Admin', 'Sales'], default: 'Admin' }
}, { timestamps: true });

// Middleware to automatically set renewalDate before save if not provided
insurancePolicySchema.pre('save', function(next) {
  if (this.endDate && !this.renewalDate) {
    this.renewalDate = this.endDate;
  }
  next();
});

module.exports = mongoose.model('InsurancePolicy', insurancePolicySchema);
