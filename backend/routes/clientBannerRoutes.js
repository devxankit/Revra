const express = require('express');
const router = express.Router();
const { getActiveBanners } = require('../controllers/clientBannerController');

// Public route - no auth required
// @route   GET /api/client/banners
// @desc    Get active banners for client dashboard carousel
// @access  Public
router.get('/', getActiveBanners);

module.exports = router;
