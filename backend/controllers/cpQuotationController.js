const Quotation = require('../models/Quotation');
const ChannelPartner = require('../models/ChannelPartner');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all active quotations for Channel Partner
// @route   GET /api/cp/quotations
// @access  Private (Channel Partner only)
exports.getQuotations = asyncHandler(async (req, res, next) => {
  const { category, search, page = 1, limit = 50 } = req.query;
  
  // Build filter - only active quotations
  let filter = { status: 'active' };
  
  // Category filter
  if (category && category !== 'all') {
    filter.category = category;
  }
  
  // Search filter
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get total count for pagination
  const total = await Quotation.countDocuments(filter);

  // Get quotations
  const quotations = await Quotation.find(filter)
    .select('-sharedBy') // Don't expose sharedBy details to CP
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  res.status(200).json({
    success: true,
    count: quotations.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: quotations
  });
});

// @desc    Get single quotation by ID for Channel Partner
// @route   GET /api/cp/quotations/:id
// @access  Private (Channel Partner only)
exports.getQuotationById = asyncHandler(async (req, res, next) => {
  const quotation = await Quotation.findById(req.params.id)
    .select('-sharedBy'); // Don't expose sharedBy details to CP

  if (!quotation) {
    return next(new ErrorResponse(`Quotation not found with id of ${req.params.id}`, 404));
  }

  // Only return active quotations
  if (quotation.status !== 'active') {
    return next(new ErrorResponse('Quotation is not available', 404));
  }

  res.status(200).json({
    success: true,
    data: quotation
  });
});

// @desc    Track quotation sharing by Channel Partner
// @route   POST /api/cp/quotations/:id/share
// @access  Private (Channel Partner only)
exports.shareQuotation = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const quotationId = req.params.id;

  const quotation = await Quotation.findById(quotationId);

  if (!quotation) {
    return next(new ErrorResponse(`Quotation not found with id of ${quotationId}`, 404));
  }

  if (quotation.status !== 'active') {
    return next(new ErrorResponse('Quotation is not available', 404));
  }

  // Check if already shared by this CP
  const alreadyShared = quotation.sharedBy.some(
    share => share.channelPartner.toString() === cpId
  );

  if (!alreadyShared) {
    // Add to sharedBy array
    quotation.sharedBy.push({
      channelPartner: cpId,
      sharedAt: new Date()
    });
  }

  // Update sharing statistics
  quotation.timesShared = (quotation.timesShared || 0) + 1;
  quotation.lastShared = new Date();

  await quotation.save();

  res.status(200).json({
    success: true,
    message: 'Quotation share tracked successfully',
    data: {
      timesShared: quotation.timesShared,
      lastShared: quotation.lastShared
    }
  });
});

// @desc    Get quotation categories (unique categories from active quotations)
// @route   GET /api/cp/quotations/categories
// @access  Private (Channel Partner only)
exports.getQuotationCategories = asyncHandler(async (req, res, next) => {
  const categories = await Quotation.distinct('category', { status: 'active' });

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories.sort()
  });
});
