const ClientTag = require('../models/ClientTag');
const Client = require('../models/Client');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all client tags
// @route   GET /api/admin/client-tags
// @access  Private (Admin only)
const getAllTags = asyncHandler(async (req, res, next) => {
  const { isActive } = req.query;
  
  let filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  const tags = await ClientTag.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: tags.length,
    data: tags
  });
});

// @desc    Get single tag by ID
// @route   GET /api/admin/client-tags/:id
// @access  Private (Admin only)
const getTag = asyncHandler(async (req, res, next) => {
  const tag = await ClientTag.findById(req.params.id);

  if (!tag) {
    return next(new ErrorResponse('Tag not found', 404));
  }

  res.status(200).json({
    success: true,
    data: tag
  });
});

// @desc    Create new tag
// @route   POST /api/admin/client-tags
// @access  Private (Admin only)
const createTag = asyncHandler(async (req, res, next) => {
  const { name, color, description } = req.body;

  // Validate required fields
  if (!name || !name.trim()) {
    return next(new ErrorResponse('Tag name is required', 400));
  }

  if (!color || !color.match(/^#[0-9A-Fa-f]{6}$/)) {
    return next(new ErrorResponse('Valid hex color code is required', 400));
  }

  // Check if tag with same name already exists
  const existingTag = await ClientTag.findOne({ 
    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
  });

  if (existingTag) {
    return next(new ErrorResponse('Tag with this name already exists', 400));
  }

  const tag = await ClientTag.create({
    name: name.trim(),
    color,
    description: description?.trim() || '',
    createdBy: req.user.id
  });

  res.status(201).json({
    success: true,
    data: tag
  });
});

// @desc    Update tag
// @route   PUT /api/admin/client-tags/:id
// @access  Private (Admin only)
const updateTag = asyncHandler(async (req, res, next) => {
  const { name, color, description, isActive } = req.body;

  let tag = await ClientTag.findById(req.params.id);

  if (!tag) {
    return next(new ErrorResponse('Tag not found', 404));
  }

  // Check if updating name and if it conflicts with another tag
  if (name && name.trim() !== tag.name) {
    const existingTag = await ClientTag.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      _id: { $ne: tag._id }
    });

    if (existingTag) {
      return next(new ErrorResponse('Tag with this name already exists', 400));
    }
    tag.name = name.trim();
  }

  if (color) {
    if (!color.match(/^#[0-9A-Fa-f]{6}$/)) {
      return next(new ErrorResponse('Valid hex color code is required', 400));
    }
    tag.color = color;
  }

  if (description !== undefined) {
    tag.description = description?.trim() || '';
  }

  if (isActive !== undefined) {
    tag.isActive = isActive;
  }

  await tag.save();

  res.status(200).json({
    success: true,
    data: tag
  });
});

// @desc    Delete tag
// @route   DELETE /api/admin/client-tags/:id
// @access  Private (Admin only)
const deleteTag = asyncHandler(async (req, res, next) => {
  const tag = await ClientTag.findById(req.params.id);

  if (!tag) {
    return next(new ErrorResponse('Tag not found', 404));
  }

  // Check if any clients are using this tag
  const clientsWithTag = await Client.countDocuments({ tag: tag._id });

  if (clientsWithTag > 0) {
    return next(new ErrorResponse(`Cannot delete tag. ${clientsWithTag} client(s) are using this tag.`, 400));
  }

  await tag.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Tag deleted successfully'
  });
});

module.exports = {
  getAllTags,
  getTag,
  createTag,
  updateTag,
  deleteTag
};
