const mongoose = require('mongoose');

const clientBannerSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'default'
  },
  carouselIntervalSeconds: {
    type: Number,
    default: 5,
    min: 3,
    max: 30
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ClientBannerSettings', clientBannerSettingsSchema);
