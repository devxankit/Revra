const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const {
  getEmployeeDashboardStats,
  getEmployeePerformanceStats,
  getEmployeeLeaderboard,
  getEmployeePointsHistory
} = require('../controllers/employeeAnalyticsController');

// All routes are protected and require employee role
router.use(protect);
router.use(authorize('employee'));

// Dashboard and Analytics Routes
router.get('/dashboard', getEmployeeDashboardStats);
router.get('/performance', getEmployeePerformanceStats);
router.get('/leaderboard', getEmployeeLeaderboard);
router.get('/points-history', getEmployeePointsHistory);

module.exports = router;