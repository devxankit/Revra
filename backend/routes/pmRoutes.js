const express = require('express');
const {
  loginPM,
  getPMProfile,
  logoutPM,
  createDemoPM,
  getWalletSummary,
  getWalletTransactions,
  forgotPassword,
  resetPassword,
  getRewardProgress
} = require('../controllers/pmController');
const { getPublishedNoticesForPM, incrementNoticeViews } = require('../controllers/noticeController');
const { getPMNotifications } = require('../controllers/pmNotificationController');

// Import team-related controllers
const {
  getPMTeamMembers,
  getPMClients,
  getPMEmployees,
  getPMTeamStatistics,
  getPMTeamLeaderboard
} = require('../controllers/pmTeamController');

// Import PM project controllers
const pmProjectRoutes = require('./pmProjectRoutes');

const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.post('/login', loginPM);
router.post('/create-demo', createDemoPM); // Remove in production
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);

// Protected routes
router.use(protect); // All routes below this middleware are protected
router.use(authorize('project-manager')); // All routes below this middleware are PM-only

router.get('/profile', getPMProfile);
router.post('/logout', logoutPM);

// PM wallet & rewards routes
router.get('/wallet/summary', getWalletSummary);
router.get('/wallet/transactions', getWalletTransactions);
router.get('/rewards/progress', getRewardProgress);

// PM team management routes
router.get('/team/employees', getPMEmployees);
router.get('/team/clients', getPMClients);
router.get('/team/members', getPMTeamMembers);
router.get('/team/statistics', getPMTeamStatistics);
router.get('/team/leaderboard', getPMTeamLeaderboard);

// PM project management routes
router.use('/', pmProjectRoutes);

// Notices
router.get('/notices', getPublishedNoticesForPM);
router.post('/notices/:id/view', incrementNoticeViews);

// Notifications
router.get('/notifications', getPMNotifications);

module.exports = router;
