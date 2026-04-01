const express = require('express');
const {
  createTask,
  createUrgentTask,
  getAllTasks,
  getTasksByMilestone,
  getTasksByProject,
  getTasksByEmployee,
  getUrgentTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  assignTask,
  addTaskComment,
  uploadTaskAttachment,
  removeTaskAttachment
} = require('../controllers/taskController');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = express.Router();

// All routes are protected
router.use(protect);

// Task CRUD routes
// Allow PMs and authorized Employees (e.g. Team Leads) to create standard tasks
router.post('/', authorize('project-manager', 'employee'), createTask);

// Urgent tasks should remain PM-only
router.post('/urgent', authorize('project-manager'), createUrgentTask);

// PM-only listing of all tasks
router.get('/', authorize('project-manager'), getAllTasks);

// Read access for PMs, Employees, and Clients (controller enforces detailed access rules)
router.get('/milestone/:milestoneId', authorize('project-manager', 'employee', 'client'), getTasksByMilestone);
router.get('/project/:projectId', authorize('project-manager', 'employee', 'client'), getTasksByProject);

// Employee-specific listings are handled via /api/employee/tasks; keep this PM-only
router.get('/employee/:employeeId', authorize('project-manager'), getTasksByEmployee);

// Urgent task listing for PMs
router.get('/urgent', authorize('project-manager'), getUrgentTasks);

// Single task view for PMs, Employees and Clients (controller enforces project/assignment checks)
router.get('/:id', authorize('project-manager', 'employee', 'client'), getTaskById);

// Updates and deletion: allowed for PMs and authorized Employees (Team Leads) per controller logic
router.put('/:id', authorize('project-manager', 'employee'), updateTask);
router.delete('/:id', authorize('project-manager', 'employee'), deleteTask);

// Task action routes
router.patch('/:id/status', authorize('project-manager', 'employee'), updateTaskStatus);
router.patch('/:id/assign', authorize('project-manager', 'employee'), assignTask);
router.post('/:id/comments', authorize('project-manager', 'employee', 'client'), addTaskComment);

// Task attachment routes
router.post('/:id/attachments', authorize('project-manager', 'employee'), upload.single('attachment'), uploadTaskAttachment);
router.delete('/:id/attachments/:attachmentId', authorize('project-manager', 'employee'), removeTaskAttachment);

module.exports = router;
