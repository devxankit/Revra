const express = require('express');
const {
  createMilestone,
  getMilestonesByProject,
  getMilestoneById,
  updateMilestone,
  deleteMilestone,
  updateMilestoneProgress,
  uploadMilestoneAttachment,
  removeMilestoneAttachment
} = require('../controllers/milestoneController');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = express.Router();

// All routes are protected
router.use(protect);
router.use(authorize('project-manager')); // PM-only routes

// Milestone CRUD routes
router.post('/', createMilestone);
router.get('/project/:projectId', getMilestonesByProject);
router.get('/:id', getMilestoneById);
router.put('/:id', updateMilestone);
router.delete('/:id', deleteMilestone);
router.patch('/:id/progress', updateMilestoneProgress);

// Milestone attachment routes
router.post('/:id/attachments', upload.single('attachment'), uploadMilestoneAttachment);
router.delete('/:id/attachments/:attachmentId', removeMilestoneAttachment);

module.exports = router;
