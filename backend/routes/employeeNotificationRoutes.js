const express = require('express');
const { getEmployeeNotifications } = require('../controllers/employeeNotificationController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('employee'));

router.get('/', getEmployeeNotifications);

module.exports = router;

