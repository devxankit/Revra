const express = require('express');
const router = express.Router();
const {
  getAllQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  getQuotationStatistics
} = require('../controllers/quotationController');
const { protect, authorize } = require('../middlewares/auth');
const { upload } = require('../services/cloudinaryService');

// All routes are protected and admin only
router.use(protect);
router.use(authorize('admin'));

// Statistics route (should be before /:id route)
router.get('/statistics', getQuotationStatistics);

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Please use "pdfDocument" as the field name.'
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
router.post('/', upload.single('pdfDocument'), handleMulterError, createQuotation);
router.get('/', getAllQuotations);
router.get('/:id', getQuotationById);
router.put('/:id', upload.single('pdfDocument'), handleMulterError, updateQuotation);
router.delete('/:id', deleteQuotation);

module.exports = router;
