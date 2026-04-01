const ClientBanner = require('../models/ClientBanner');
const ClientBannerSettings = require('../models/ClientBannerSettings');
const { deleteFromCloudinary } = require('../config/cloudinary');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

const DEFAULT_CAROUSEL_INTERVAL = 5;

// Get or create default settings
const getOrCreateSettings = async () => {
  let settings = await ClientBannerSettings.findOne({ key: 'default' });
  if (!settings) {
    settings = await ClientBannerSettings.create({
      key: 'default',
      carouselIntervalSeconds: DEFAULT_CAROUSEL_INTERVAL
    });
  }
  return settings;
};

// @desc    Get active banners (public)
// @route   GET /api/client/banners
// @access  Public
const getActiveBanners = asyncHandler(async (req, res, next) => {
  const banners = await ClientBanner.find({ isActive: true })
    .sort({ order: 1 })
    .select('url publicId order')
    .lean();

  const settings = await getOrCreateSettings();

  res.status(200).json({
    success: true,
    data: {
      banners,
      carouselIntervalSeconds: settings.carouselIntervalSeconds
    }
  });
});

// @desc    Get all banners (admin)
// @route   GET /api/admin/client-banners
// @access  Private (Admin/HR)
const getAllBanners = asyncHandler(async (req, res, next) => {
  const banners = await ClientBanner.find().sort({ order: 1 });

  res.status(200).json({
    success: true,
    count: banners.length,
    data: banners
  });
});

// @desc    Create banner (admin)
// @route   POST /api/admin/client-banners
// @access  Private (Admin/HR)
const createBanner = asyncHandler(async (req, res, next) => {
  const { url, publicId, order, isActive } = req.body;

  if (!url || !publicId) {
    return next(new ErrorResponse('URL and publicId are required', 400));
  }

  const count = await ClientBanner.countDocuments();
  const bannerOrder = order !== undefined ? order : count;

  const banner = await ClientBanner.create({
    url,
    publicId,
    order: bannerOrder,
    isActive: isActive !== undefined ? isActive : true
  });

  res.status(201).json({
    success: true,
    data: banner
  });
});

// @desc    Update banner (admin)
// @route   PUT /api/admin/client-banners/:id
// @access  Private (Admin/HR)
const updateBanner = asyncHandler(async (req, res, next) => {
  const banner = await ClientBanner.findById(req.params.id);

  if (!banner) {
    return next(new ErrorResponse('Banner not found', 404));
  }

  const { isActive, order } = req.body;

  if (isActive !== undefined) banner.isActive = isActive;
  if (order !== undefined) banner.order = order;

  await banner.save();

  res.status(200).json({
    success: true,
    data: banner
  });
});

// @desc    Delete banner (admin)
// @route   DELETE /api/admin/client-banners/:id
// @access  Private (Admin/HR)
const deleteBanner = asyncHandler(async (req, res, next) => {
  const banner = await ClientBanner.findById(req.params.id);

  if (!banner) {
    return next(new ErrorResponse('Banner not found', 404));
  }

  try {
    await deleteFromCloudinary(banner.publicId, { resource_type: 'image' });
  } catch (error) {
    console.warn('Failed to delete from Cloudinary, removing record anyway:', error.message);
  }

  await banner.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get carousel settings (admin)
// @route   GET /api/admin/client-banners/settings
// @access  Private (Admin/HR)
const getSettings = asyncHandler(async (req, res, next) => {
  const settings = await getOrCreateSettings();

  res.status(200).json({
    success: true,
    data: settings
  });
});

// @desc    Update carousel settings (admin)
// @route   PUT /api/admin/client-banners/settings
// @access  Private (Admin/HR)
const updateSettings = asyncHandler(async (req, res, next) => {
  const { carouselIntervalSeconds } = req.body;

  const settings = await getOrCreateSettings();

  if (carouselIntervalSeconds !== undefined) {
    const value = Math.min(30, Math.max(3, Number(carouselIntervalSeconds)));
    settings.carouselIntervalSeconds = value;
    await settings.save();
  }

  res.status(200).json({
    success: true,
    data: settings
  });
});

module.exports = {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getSettings,
  updateSettings
};
