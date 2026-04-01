const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/adminProjectExpenseCategoryController');
const { protect, authorize } = require('../middlewares/auth');

// Apply authentication; admin and PEM have full access to categories
router.use(protect);
router.use(authorize('admin', 'pem'));

// All category routes - admin and PEM
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
