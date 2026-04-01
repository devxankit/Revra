const SystemConfig = require('../models/SystemConfig');

// Simple in-memory cache to avoid hitting DB on every request
let cachedConfig = null;
let lastLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const DEFAULT_CONFIG = {
  salesMonthStartDay: 1,
  salesMonthEndDay: 0, // 0 => end of calendar month
  timezone: 'local',
};

async function loadConfigFromDb() {
  try {
    const doc = await SystemConfig.getSingleton();
    cachedConfig = {
      salesMonthStartDay:
        typeof doc.salesMonthStartDay === 'number'
          ? doc.salesMonthStartDay
          : DEFAULT_CONFIG.salesMonthStartDay,
      salesMonthEndDay:
        typeof doc.salesMonthEndDay === 'number'
          ? doc.salesMonthEndDay
          : DEFAULT_CONFIG.salesMonthEndDay,
      timezone: doc.timezone || DEFAULT_CONFIG.timezone,
    };
    lastLoadedAt = Date.now();
  } catch (error) {
    console.error('Failed to load SystemConfig, using defaults:', error);
    cachedConfig = { ...DEFAULT_CONFIG };
    lastLoadedAt = Date.now();
  }
}

/**
 * Returns the current sales month configuration.
 * Falls back to defaults when config is missing or invalid.
 */
async function getSalesMonthConfig() {
  const now = Date.now();
  if (!cachedConfig || now - lastLoadedAt > CACHE_TTL_MS) {
    await loadConfigFromDb();
  }
  return cachedConfig || { ...DEFAULT_CONFIG };
}

/**
 * Updates the sales month configuration and clears cache.
 */
async function updateSalesMonthConfig(partialConfig) {
  const update = {};

  if (typeof partialConfig.salesMonthStartDay === 'number') {
    update.salesMonthStartDay = partialConfig.salesMonthStartDay;
  }
  if (typeof partialConfig.salesMonthEndDay === 'number') {
    update.salesMonthEndDay = partialConfig.salesMonthEndDay;
  }
  if (typeof partialConfig.timezone === 'string') {
    update.timezone = partialConfig.timezone;
  }

  const doc = await SystemConfig.findOneAndUpdate({}, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

  cachedConfig = null;
  lastLoadedAt = 0;

  return {
    salesMonthStartDay: doc.salesMonthStartDay,
    salesMonthEndDay: doc.salesMonthEndDay,
    timezone: doc.timezone,
  };
}

module.exports = {
  getSalesMonthConfig,
  updateSalesMonthConfig,
  DEFAULT_CONFIG,
};

