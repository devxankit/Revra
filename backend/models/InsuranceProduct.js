const mongoose = require('mongoose');

const insuranceProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true }, // e.g., Life, Health, Motor, General
  code: { type: String, required: true, unique: true, trim: true },
  provider: { type: String, trim: true }, // Insurance company name
  premiumRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 }
  },
  coverAmount: { type: Number },
  description: { type: String },
  validityMonths: { type: Number, default: 12 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.model('InsuranceProduct', insuranceProductSchema);
