const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middlewares/auth');
const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getInsuranceStats
} = require('../controllers/adminInsuranceController');

// All insurance routes are protected for Admin
router.use(protect);

// Insurance Stats Route
router.get('/stats', getInsuranceStats);

// Products Routes
router.route('/products')
  .get(getProducts)
  .post(createProduct);

router.route('/products/:id')
  .put(updateProduct)
  .delete(deleteProduct);

// Policies Routes
router.route('/policies')
  .get(getPolicies)
  .post(createPolicy);

router.route('/policies/:id')
  .put(updatePolicy)
  .delete(deletePolicy);

module.exports = router;
