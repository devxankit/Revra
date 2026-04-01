const express = require('express');
const {
  getClientPayments,
  getClientPaymentById,
  getClientProjectPayments,
  getClientPaymentStatistics
} = require('../controllers/clientPaymentController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All routes are protected and client-only
router.use(protect);
router.use(authorize('client'));

// Client payment routes
router.get('/', getClientPayments);
router.get('/statistics', getClientPaymentStatistics);
router.get('/project/:projectId', getClientProjectPayments);
router.get('/:id', getClientPaymentById);

module.exports = router;
