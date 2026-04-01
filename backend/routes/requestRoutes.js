const express = require('express');
const {
  createRequest,
  getRequests,
  getRequestById,
  respondToRequest,
  updateRequest,
  deleteRequest,
  getRequestStatistics,
  getRecipients
} = require('../controllers/requestController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Request routes
router.post('/', createRequest);
router.get('/', getRequests);
router.get('/statistics', getRequestStatistics);
router.get('/recipients', getRecipients);
router.get('/:id', getRequestById);
router.put('/:id', updateRequest);
router.post('/:id/respond', respondToRequest);
router.delete('/:id', deleteRequest);

module.exports = router;

