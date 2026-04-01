const express = require('express');
const {
  createPaymentRecord,
  getPaymentsByProject,
  getPaymentsByClient,
  updatePaymentStatus,
  getPaymentStatistics,
  getProjectPaymentStatistics,
  getClientPaymentStatistics
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All routes are protected
router.use(protect);
router.use(authorize('project-manager', 'admin')); // PM and Admin routes

// Payment CRUD routes
router.post('/', createPaymentRecord);
router.get('/statistics', getPaymentStatistics);
router.get('/project/:projectId', getPaymentsByProject);
router.get('/project/:projectId/statistics', getProjectPaymentStatistics);
router.get('/client/:clientId', getPaymentsByClient);
router.get('/client/:clientId/statistics', getClientPaymentStatistics);
router.put('/:id', updatePaymentStatus);

module.exports = router;
