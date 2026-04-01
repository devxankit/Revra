const express = require('express');
const { getClientNotifications } = require('../controllers/clientNotificationController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('client'));

router.get('/', getClientNotifications);

module.exports = router;

