const express = require('express');
const router = express.Router();
const {
  getAllProjectExpenses,
  getProjectExpenses,
  createProjectExpense,
  updateProjectExpense,
  deleteProjectExpense,
  getProjectExpenseStats
} = require('../controllers/adminProjectExpenseController');
const { protect, authorize } = require('../middlewares/auth');

// Apply authentication and authorization to all routes
// Project Expense Manager (PEM) can also manage project expenses
router.use(protect);
router.use(authorize('admin', 'pem'));

// Project expense routes
router.route('/')
  .get(getAllProjectExpenses)
  .post(createProjectExpense);

router.route('/stats')
  .get(getProjectExpenseStats);

router.route('/project/:projectId')
  .get(getProjectExpenses);

router.route('/:id')
  .put(updateProjectExpense)
  .delete(deleteProjectExpense);

module.exports = router;

