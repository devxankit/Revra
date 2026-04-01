const express = require('express');
const {
  sendOTP,
  verifyOTP,
  getClientProfile,
  logoutClient,
  updateClientProfile,
  createDemoClient,
  resendOTP,
  checkSMSStatus
} = require('../controllers/clientController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/create-demo', createDemoClient); // Remove in production
router.get('/sms-status', checkSMSStatus); // For testing SMS service

// Protected routes
router.use(protect); // All routes below this middleware are protected

router.get('/profile', getClientProfile);
router.put('/profile', updateClientProfile);
router.post('/logout', logoutClient);

module.exports = router;
