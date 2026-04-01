const Quotation = require('../models/Quotation');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Get all quotations with filtering and pagination
// @route   GET /api/admin/quotations
// @access  Private (Admin only)
const getAllQuotations = asyncHandler(async (req, res, next) => {
  const { status, category, search, page = 1, limit = 20 } = req.query;
  
  // Build filter object
  let filter = {};
  
  // Status filter
  if (status && status !== 'all') {
    filter.status = status;
  }
  
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
    .populate('createdBy', 'name email')
    .populate('sharedBy.channelPartner', 'name email')
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

// @desc    Get single quotation by ID
// @route   GET /api/admin/quotations/:id
// @access  Private (Admin only)
const getQuotationById = asyncHandler(async (req, res, next) => {
  const quotation = await Quotation.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('sharedBy.channelPartner', 'name email');

  if (!quotation) {
    return next(new ErrorResponse(`Quotation not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: quotation
  });
});

// @desc    Create new quotation
// @route   POST /api/admin/quotations
// @access  Private (Admin only)
const createQuotation = asyncHandler(async (req, res, next) => {
  // Add createdBy from req.user
  req.body.createdBy = req.user.id;

  // Handle PDF upload
  if (req.file) {
    try {
      const uploadResult = await uploadToCloudinary(req.file, 'appzeto/quotations', {
        resource_type: 'auto'
      });
      
      if (uploadResult.success) {
        req.body.pdfDocument = {
          public_id: uploadResult.data.public_id,
          secure_url: uploadResult.data.secure_url,
          originalName: uploadResult.data.original_filename || req.file.originalname,
          uploadedAt: new Date()
        };
      } else {
        return next(new ErrorResponse(`Failed to upload PDF: ${uploadResult.error || 'Unknown error'}`, 500));
      }
    } catch (error) {
      console.error('PDF upload error:', error);
      return next(new ErrorResponse(`PDF upload failed: ${error.message}`, 500));
    }
  }

  // Create quotation
  const quotation = await Quotation.create(req.body);

  // Populate createdBy
  await quotation.populate('createdBy', 'name email');

  res.status(201).json({
    success: true,
    data: quotation
  });
});

// @desc    Update quotation
// @route   PUT /api/admin/quotations/:id
// @access  Private (Admin only)
const updateQuotation = asyncHandler(async (req, res, next) => {
  let quotation = await Quotation.findById(req.params.id);

  if (!quotation) {
    return next(new ErrorResponse(`Quotation not found with id of ${req.params.id}`, 404));
  }

  // Handle PDF upload (if new file is provided)
  if (req.file) {
    try {
      // Delete old PDF if exists
      if (quotation.pdfDocument && quotation.pdfDocument.public_id) {
        await deleteFromCloudinary(quotation.pdfDocument.public_id);
      }

      // Upload new PDF
      const uploadResult = await uploadToCloudinary(req.file, 'appzeto/quotations', {
        resource_type: 'auto'
      });
      
      if (uploadResult.success) {
        req.body.pdfDocument = {
          public_id: uploadResult.data.public_id,
          secure_url: uploadResult.data.secure_url,
          originalName: uploadResult.data.original_filename || req.file.originalname,
          uploadedAt: new Date()
        };
      } else {
        return next(new ErrorResponse(`Failed to upload PDF: ${uploadResult.error || 'Unknown error'}`, 500));
      }
    } catch (error) {
      console.error('PDF upload error:', error);
      return next(new ErrorResponse(`PDF upload failed: ${error.message}`, 500));
    }
  }

  // Update quotation
  quotation = await Quotation.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('createdBy', 'name email')
    .populate('sharedBy.channelPartner', 'name email');

  res.status(200).json({
    success: true,
    data: quotation
  });
});

// @desc    Delete quotation
// @route   DELETE /api/admin/quotations/:id
// @access  Private (Admin only)
const deleteQuotation = asyncHandler(async (req, res, next) => {
  const quotation = await Quotation.findById(req.params.id);

  if (!quotation) {
    return next(new ErrorResponse(`Quotation not found with id of ${req.params.id}`, 404));
  }

  // Delete PDF from Cloudinary if exists
  if (quotation.pdfDocument && quotation.pdfDocument.public_id) {
    try {
      await deleteFromCloudinary(quotation.pdfDocument.public_id);
    } catch (error) {
      console.error('Error deleting PDF from Cloudinary:', error);
      // Continue with deletion even if Cloudinary deletion fails
    }
  }

  await quotation.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get quotation statistics
// @route   GET /api/admin/quotations/statistics
// @access  Private (Admin only)
const getQuotationStatistics = asyncHandler(async (req, res, next) => {
  const totalQuotations = await Quotation.countDocuments();
  const activeQuotations = await Quotation.countDocuments({ status: 'active' });
  const totalShared = await Quotation.aggregate([
    { $group: { _id: null, total: { $sum: '$timesShared' } } }
  ]);
  
  const categoryCounts = await Quotation.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      total: totalQuotations,
      active: activeQuotations,
      inactive: totalQuotations - activeQuotations,
      totalShared: totalShared[0]?.total || 0,
      categoryCounts: categoryCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    }
  });
});

module.exports = {
  getAllQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  getQuotationStatistics
};
