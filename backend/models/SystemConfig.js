const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema(
  {
    // Global sales month configuration for sales targets and incentives
    salesMonthStartDay: {
      type: Number,
      min: 1,
      max: 31,
      default: 1,
    },
    /**
     * Special handling for end day:
     * - 0  => end of calendar month (default behaviour, matches existing logic)
     * - 1–31 => explicit day of month; when less than start day, range spills into next month
     */
    salesMonthEndDay: {
      type: Number,
      min: 0,
      max: 31,
      default: 0,
    },
    // Optional: timezone identifier, currently informational only
    timezone: {
      type: String,
      default: 'local',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure there is effectively only one active config document
systemConfigSchema.statics.getSingleton = async function () {
  let config = await this.findOne().lean();

  if (!config) {
    config = await this.create({});
  }

  return config;
};

module.exports = mongoose.model('SystemConfig', systemConfigSchema);

