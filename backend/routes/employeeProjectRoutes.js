const express = require('express');
const {
  getEmployeeProjects,
  getEmployeeProjectById,
  getEmployeeProjectMilestones,
  getEmployeeProjectStatistics
} = require('../controllers/employeeProjectController');
const { getCredentialsByProjectForPMOrEmployee } = require('../controllers/adminProjectCredentialController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All routes are protected and employee-only
router.use(protect);
router.use(authorize('employee'));

// Employee project routes
router.get('/', getEmployeeProjects);
router.get('/statistics', getEmployeeProjectStatistics);
router.get('/:id/milestones', getEmployeeProjectMilestones);
router.get('/:id/credentials', getCredentialsByProjectForPMOrEmployee);
router.get('/:id', getEmployeeProjectById);

module.exports = router;
