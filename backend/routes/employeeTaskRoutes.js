const express = require('express');
const {
  getEmployeeTasks,
  getEmployeeTaskById,
  updateEmployeeTaskStatus,
  addEmployeeTaskComment,
  getEmployeeUrgentTasks,
  getEmployeeTaskStatistics,
  uploadEmployeeTaskAttachment,
  getEmployeeTaskAttachments,
  deleteEmployeeTaskAttachment
} = require('../controllers/employeeTaskController');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = express.Router();

// All routes are protected and employee-only
router.use(protect);
router.use(authorize('employee'));

// Employee task routes
router.get('/', getEmployeeTasks);
router.get('/urgent', getEmployeeUrgentTasks);
router.get('/statistics', getEmployeeTaskStatistics);
router.get('/:id', getEmployeeTaskById);
router.patch('/:id/status', updateEmployeeTaskStatus);
router.post('/:id/comments', addEmployeeTaskComment);

// File upload routes
router.post('/:id/attachments', upload.single('file'), uploadEmployeeTaskAttachment);
router.get('/:id/attachments', getEmployeeTaskAttachments);
router.delete('/:id/attachments/:attachmentId', deleteEmployeeTaskAttachment);

module.exports = router;
