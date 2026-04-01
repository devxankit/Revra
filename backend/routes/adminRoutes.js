const express = require('express');
const {
  loginAdmin,
  getAdminProfile,
  logoutAdmin,
  createDemoAdmin,
  forgotPassword,
  resetPassword,
  updateAdminPassword
} = require('../controllers/adminController');
const { protect, authorize, canAccessHR, isAdmin } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.post('/login', loginAdmin);
router.post('/create-demo', createDemoAdmin); // Remove in production
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);

// Protected routes
router.use(protect); // All routes below this middleware are protected

router.get('/profile', getAdminProfile);
router.put('/profile/password', updateAdminPassword);
router.post('/logout', logoutAdmin);

// Admin only routes (full access)
// router.get('/all-admins', isAdmin, getAllAdmins);

// HR management routes (admin or hr can access)
// router.get('/hr-dashboard', canAccessHR, getHRDashboard);

// Role-based routes examples:
// router.get('/admin-only', isAdmin, adminOnlyFunction);
// router.get('/hr-access', canAccessHR, hrAccessFunction);
// router.get('/specific-roles', authorize('admin', 'hr'), specificRoleFunction);

// Attendance (Admin/HR)
const upload = require('../middlewares/upload');
const { uploadAttendance, getAttendance } = require('../controllers/adminAttendanceController');
router.use(authorize('admin', 'hr', 'accountant'));
router.post('/attendance/upload', upload.single('file'), uploadAttendance);
router.get('/attendance', getAttendance);

module.exports = router;
