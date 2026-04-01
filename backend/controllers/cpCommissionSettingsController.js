const CPCommissionSettings = require('../models/CPCommissionSettings');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get current commission settings
// @route   GET /api/admin/channel-partners/commission-settings
// @access  Private (Admin only)
exports.getCommissionSettings = asyncHandler(async (req, res, next) => {
  const settings = await CPCommissionSettings.getSettings();
  
  // Populate updatedBy admin info
  await settings.populate('updatedBy', 'name email');
  
  res.status(200).json({
    success: true,
    data: settings
  });
});

// @desc    Update commission settings
// @route   PUT /api/admin/channel-partners/commission-settings
// @access  Private (Admin only)
exports.updateCommissionSettings = asyncHandler(async (req, res, next) => {
  const { ownConversionCommission, sharedConversionCommission } = req.body;
  
  // Validation
  if (ownConversionCommission === undefined && sharedConversionCommission === undefined) {
    return next(new ErrorResponse('At least one commission percentage must be provided', 400));
  }
  
  if (ownConversionCommission !== undefined) {
    if (typeof ownConversionCommission !== 'number' || ownConversionCommission < 0 || ownConversionCommission > 100) {
      return next(new ErrorResponse('Own conversion commission must be a number between 0 and 100', 400));
    }
  }
  
  if (sharedConversionCommission !== undefined) {
    if (typeof sharedConversionCommission !== 'number' || sharedConversionCommission < 0 || sharedConversionCommission > 100) {
      return next(new ErrorResponse('Shared conversion commission must be a number between 0 and 100', 400));
    }
  }
  
  // Get current settings to preserve values not being updated
  const currentSettings = await CPCommissionSettings.getSettings();
  
  // Prepare update data
  const updateData = {
    ownConversionCommission: ownConversionCommission !== undefined 
      ? ownConversionCommission 
      : currentSettings.ownConversionCommission,
    sharedConversionCommission: sharedConversionCommission !== undefined 
      ? sharedConversionCommission 
      : currentSettings.sharedConversionCommission
  };
  
  // Get admin ID from request (assuming admin is attached by auth middleware)
  const adminId = req.admin?.id || req.user?.id || null;
  
  // Update settings
  const updatedSettings = await CPCommissionSettings.updateSettings(updateData, adminId);
  
  // Populate updatedBy admin info
  await updatedSettings.populate('updatedBy', 'name email');
  
  res.status(200).json({
    success: true,
    message: 'Commission settings updated successfully',
    data: updatedSettings
  });
});
