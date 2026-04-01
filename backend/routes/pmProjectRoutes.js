const express = require('express');
const {
  getNewProjects,
  updateMeetingStatus,
  startProject,
  activateProject
} = require('../controllers/pmProjectController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All routes are protected and PM-only
router.use(protect);
router.use(authorize('project-manager'));

// PM new projects routes
router.get('/new-projects', getNewProjects);
router.patch('/projects/:id/meeting-status', updateMeetingStatus);
router.patch('/projects/:id/start', startProject);
router.patch('/projects/:id/activate', activateProject);

module.exports = router;
