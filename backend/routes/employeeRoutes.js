const express = require('express');
const {
  loginEmployee,
  getEmployeeProfile,
  logoutEmployee,
  createDemoEmployee,
  getWalletSummary,
  getWalletTransactions,
  forgotPassword,
  resetPassword,
  getMyTeam,
  getMilestoneById,
  getMilestoneTasks,
  getRewardProgress
} = require('../controllers/employeeController');
const {
  getPublishedNoticesForEmployee,
  incrementNoticeViews
} = require('../controllers/noticeController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.post('/login', loginEmployee);
router.post('/create-demo', createDemoEmployee); // Remove in production
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);

// Protected routes - employee only
router.use(protect, authorize('employee')); // All routes below this middleware are for authenticated employees only

router.get('/profile', getEmployeeProfile);
router.get('/my-team', getMyTeam);
router.post('/logout', logoutEmployee);

// Notice board routes
router.get('/notices', getPublishedNoticesForEmployee);
router.post('/notices/:id/view', incrementNoticeViews);

// Employee wallet & rewards routes
router.get('/wallet/summary', getWalletSummary);
router.get('/wallet/transactions', getWalletTransactions);
router.get('/rewards/progress', getRewardProgress);

// Milestone routes
router.get('/milestones/:id', getMilestoneById);
router.get('/milestones/:id/tasks', getMilestoneTasks);

// Future Employee-specific routes can be added here
// router.get('/projects', getEmployeeProjects);
// router.get('/tasks', getEmployeeTasks);
// router.get('/performance', getEmployeePerformance);

module.exports = router;
