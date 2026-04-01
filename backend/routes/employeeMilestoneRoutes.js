const express = require('express');
const router = express.Router();
const {
  getMilestoneById,
  getMilestoneTasks
} = require('../controllers/employeeController');
const {
  addEmployeeMilestoneComment
} = require('../controllers/employeeMilestoneController');
const { protect, authorize } = require('../middlewares/auth');

// Apply authentication and authorization middleware to all routes
router.use(protect);
router.use(authorize('employee'));

// Get milestone details
router.get('/:id', getMilestoneById);

// Get milestone tasks (filtered to employee's tasks)
router.get('/:id/tasks', getMilestoneTasks);

// Add comment to milestone
router.post('/:id/comments', addEmployeeMilestoneComment);

module.exports = router;
