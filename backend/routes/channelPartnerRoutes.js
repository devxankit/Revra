const express = require('express');
const router = express.Router();
const {
  getAllChannelPartners,
  getChannelPartnerStatistics,
  getChannelPartner,
  createChannelPartner,
  updateChannelPartner,
  deleteChannelPartner,
  getAllChannelPartnerWallets
} = require('../controllers/channelPartnerController');
const {
  getAllCPRewards,
  getCPReward,
  createCPReward,
  updateCPReward,
  deleteCPReward,
  getCPRewardStatistics
} = require('../controllers/cpRewardAdminController');
const {
  getChannelPartnerLeadsBreakdown,
  getChannelPartnerLeads
} = require('../controllers/channelPartnerLeadsController');
const {
  getCommissionSettings,
  updateCommissionSettings
} = require('../controllers/cpCommissionSettingsController');
const { protect, authorize } = require('../middlewares/auth');

// Apply authentication and authorization to all routes
router.use(protect);
router.use(authorize('admin', 'hr'));

// @route   GET /api/admin/channel-partners/statistics
// @desc    Get channel partner statistics
// @access  Private (Admin only)
router.get('/statistics', getChannelPartnerStatistics);

// @route   GET /api/admin/channel-partners/commission-settings
// @desc    Get current commission settings
// @access  Private (Admin only)
router.get('/commission-settings', getCommissionSettings);

// @route   PUT /api/admin/channel-partners/commission-settings
// @desc    Update commission settings
// @access  Private (Admin only)
router.put('/commission-settings', updateCommissionSettings);

// @route   GET /api/admin/channel-partners/wallets
// @desc    Get all channel partner wallets with earnings data
// @access  Private (Admin only)
router.get('/wallets', getAllChannelPartnerWallets);

// @route   GET /api/admin/channel-partners/leads/breakdown
// @desc    Get channel partner leads breakdown with metrics
// @access  Private (Admin only)
router.get('/leads/breakdown', getChannelPartnerLeadsBreakdown);

// @route   GET /api/admin/channel-partners/:cpId/leads
// @desc    Get leads for a specific channel partner and status
// @access  Private (Admin only)
router.get('/:cpId/leads', getChannelPartnerLeads);

// @route   GET /api/admin/channel-partners/rewards/statistics
// @desc    Get channel partner reward statistics
// @access  Private (Admin only)
router.get('/rewards/statistics', getCPRewardStatistics);

// @route   GET /api/admin/channel-partners/rewards
// @desc    Get all channel partner rewards
// @access  Private (Admin only)
router.get('/rewards', getAllCPRewards);

// @route   POST /api/admin/channel-partners/rewards
// @desc    Create channel partner reward
// @access  Private (Admin only)
router.post('/rewards', createCPReward);

// @route   GET /api/admin/channel-partners/rewards/:id
// @desc    Get single channel partner reward
// @access  Private (Admin only)
router.get('/rewards/:id', getCPReward);

// @route   PUT /api/admin/channel-partners/rewards/:id
// @desc    Update channel partner reward
// @access  Private (Admin only)
router.put('/rewards/:id', updateCPReward);

// @route   DELETE /api/admin/channel-partners/rewards/:id
// @desc    Delete channel partner reward
// @access  Private (Admin only)
router.delete('/rewards/:id', deleteCPReward);

// @route   GET /api/admin/channel-partners
// @desc    Get all channel partners with filtering and pagination
// @access  Private (Admin only)
router.get('/', getAllChannelPartners);

// @route   POST /api/admin/channel-partners
// @desc    Create new channel partner
// @access  Private (Admin only)
router.post('/', createChannelPartner);

// @route   GET /api/admin/channel-partners/:id
// @desc    Get single channel partner by ID
// @access  Private (Admin only)
router.get('/:id', getChannelPartner);

// @route   PUT /api/admin/channel-partners/:id
// @desc    Update channel partner
// @access  Private (Admin only)
router.put('/:id', updateChannelPartner);

// @route   DELETE /api/admin/channel-partners/:id
// @desc    Delete channel partner
// @access  Private (Admin only)
router.delete('/:id', deleteChannelPartner);

module.exports = router;
