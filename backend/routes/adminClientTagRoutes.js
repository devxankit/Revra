const express = require('express');
const router = express.Router();
const {
  getAllTags,
  getTag,
  createTag,
  updateTag,
  deleteTag
} = require('../controllers/adminClientTagController');
const { protect, authorize } = require('../middlewares/auth');

// Apply authentication and authorization to all routes
router.use(protect);
router.use(authorize('admin', 'hr'));

// @route   GET /api/admin/client-tags
// @desc    Get all client tags
// @access  Private (Admin/HR only)
router.get('/', getAllTags);

// @route   GET /api/admin/client-tags/:id
// @desc    Get single tag by ID
// @access  Private (Admin/HR only)
router.get('/:id', getTag);

// @route   POST /api/admin/client-tags
// @desc    Create new tag
// @access  Private (Admin/HR only)
router.post('/', createTag);

// @route   PUT /api/admin/client-tags/:id
// @desc    Update tag
// @access  Private (Admin/HR only)
router.put('/:id', updateTag);

// @route   DELETE /api/admin/client-tags/:id
// @desc    Delete tag
// @access  Private (Admin/HR only)
router.delete('/:id', deleteTag);

module.exports = router;
