const express = require('express');
const {
  getAdminDashboardStats,
  getSystemAnalytics,
  getAdminLeaderboard,
  getRecentActivities
} = require('../controllers/adminAnalyticsController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All routes require admin panel auth
router.use(protect);

// Admin-only analytics routes
router.get('/dashboard', authorize('admin'), getAdminDashboardStats);
router.get('/system', authorize('admin'), getSystemAnalytics);
router.get('/recent-activities', authorize('admin'), getRecentActivities);

// Leaderboard: allowed for both admin and HR
router.get('/leaderboard', authorize('admin', 'hr'), getAdminLeaderboard);

module.exports = router;
