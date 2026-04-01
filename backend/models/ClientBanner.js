const mongoose = require('mongoose');

const clientBannerSchema = new mongoose.Schema({
  url: {
    type: String,
    required: [true, 'Banner URL is required'],
    trim: true
  },
  publicId: {
    type: String,
    required: [true, 'Cloudinary public ID is required'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

clientBannerSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('ClientBanner', clientBannerSchema);
