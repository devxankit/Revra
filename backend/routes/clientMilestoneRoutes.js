const express = require('express');
const {
  getClientMilestoneById
} = require('../controllers/clientProjectController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All routes are protected and client-only
router.use(protect);
router.use(authorize('client'));

// Client milestone routes
router.get('/:id', getClientMilestoneById);

module.exports = router;

