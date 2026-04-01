const express = require('express');
const {
  getAllProjects,
  getProjectById,
  getProjectMilestones,
  getMilestoneTasks,
  createProject,
  updateProject,
  updateProjectCost,
  addProjectInstallments,
  updateProjectInstallment,
  deleteProjectInstallment,
  deleteProject,
  getProjectStatistics,
  getProjectManagementStatistics,
  getPendingProjects,
  assignPMToPendingProject,
  getPMsForAssignment,
  addProjectRecovery
} = require('../controllers/adminProjectController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All routes are protected; admin and PEM can access (PEM for project expense management page)
router.use(protect);
router.use(authorize('admin', 'pem'));

// Admin project routes
router.get('/', getAllProjects);
router.get('/statistics', getProjectStatistics);
router.get('/management-statistics', getProjectManagementStatistics);
router.get('/pending', getPendingProjects);
router.get('/pms-for-assignment', getPMsForAssignment);
router.get('/:id/milestones/:milestoneId/tasks', getMilestoneTasks);
router.get('/:id/milestones', getProjectMilestones);
router.get('/:id', getProjectById);
router.post('/', createProject);
router.post('/pending/:id/assign-pm', assignPMToPendingProject);
router.put('/:id', updateProject);
router.put('/:id/cost', updateProjectCost);
router.post('/:id/installments', addProjectInstallments);
router.put('/:id/installments/:installmentId', updateProjectInstallment);
router.delete('/:id/installments/:installmentId', deleteProjectInstallment);
router.post('/:id/recoveries', addProjectRecovery);
router.delete('/:id', deleteProject);

module.exports = router;
