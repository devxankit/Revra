const mongoose = require('mongoose');

const cpCommissionSettingsSchema = new mongoose.Schema({
  ownConversionCommission: {
    type: Number,
    required: true,
    default: 30,
    min: 0,
    max: 100,
    validate: {
      validator: function(v) {
        return v >= 0 && v <= 100;
      },
      message: 'Own conversion commission must be between 0 and 100'
    }
  },
  sharedConversionCommission: {
    type: Number,
    required: true,
    default: 10,
    min: 0,
    max: 100,
    validate: {
      validator: function(v) {
        return v >= 0 && v <= 100;
      },
      message: 'Shared conversion commission must be between 0 and 100'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Ensure only one document exists (singleton pattern)
cpCommissionSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ isActive: true });
  if (!settings) {
    // Create default settings if none exist
    settings = await this.create({
      ownConversionCommission: 30,
      sharedConversionCommission: 10,
      isActive: true
    });
  }
  return settings;
};

// Update settings (deactivate old, create new)
cpCommissionSettingsSchema.statics.updateSettings = async function(newSettings, adminId) {
  // Deactivate all existing settings
  await this.updateMany({ isActive: true }, { isActive: false });
  
  // Create new active settings
  const settings = await this.create({
    ...newSettings,
    updatedBy: adminId,
    isActive: true
  });
  
  return settings;
};

module.exports = mongoose.model('CPCommissionSettings', cpCommissionSettingsSchema);
