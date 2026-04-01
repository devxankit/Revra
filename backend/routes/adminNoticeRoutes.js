const express = require('express');
const router = express.Router();
const {
  createNotice,
  getAllNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
  togglePinNotice,
  getNoticeStatistics,
  incrementNoticeViews
} = require('../controllers/noticeController');
const { protect, authorize } = require('../middlewares/auth');
const { upload } = require('../services/cloudinaryService');

// All routes are protected and admin only
router.use(protect);
router.use(authorize('admin'));

// Statistics route (should be before /:id route)
router.get('/statistics', getNoticeStatistics);

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB for videos and 5MB for images.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Please use "file" as the field name.'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }
  next();
};

// CRUD routes
router.post('/', upload.single('file'), handleMulterError, createNotice);
router.get('/', getAllNotices);
router.get('/:id', getNoticeById);
router.put('/:id', upload.single('file'), handleMulterError, updateNotice);
router.delete('/:id', deleteNotice);

// Pin toggle route
router.patch('/:id/pin', togglePinNotice);

// View increment route (can be used by any authenticated user)
router.post('/:id/view', incrementNoticeViews);

module.exports = router;

