const express = require('express');
const {
  sendOTP,
  verifyOTP,
  getCPProfile,
  logoutCP,
  updateCPProfile,
  resendOTP
} = require('../controllers/cpAuthController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Protected routes
router.use(protect); // All routes below this middleware are protected

router.get('/profile', getCPProfile);
router.put('/profile', updateCPProfile);
router.post('/logout', logoutCP);

module.exports = router;
