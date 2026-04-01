const express = require('express');
const router = express.Router();
const {
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getSettings,
  updateSettings
} = require('../controllers/clientBannerController');
const { protect, authorize } = require('../middlewares/auth');

// Apply authentication and authorization to all routes
router.use(protect);
router.use(authorize('admin', 'hr'));

// Settings routes MUST come before :id routes
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// @route   GET /api/admin/client-banners
// @desc    Get all banners
// @access  Private (Admin/HR only)
router.get('/', getAllBanners);

// @route   POST /api/admin/client-banners
// @desc    Create banner
// @access  Private (Admin/HR only)
router.post('/', createBanner);

// @route   PUT /api/admin/client-banners/:id
// @desc    Update banner
// @access  Private (Admin/HR only)
router.put('/:id', updateBanner);

// @route   DELETE /api/admin/client-banners/:id
// @desc    Delete banner
// @access  Private (Admin/HR only)
router.delete('/:id', deleteBanner);

module.exports = router;
