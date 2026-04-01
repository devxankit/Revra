const express = require('express');
const router = express.Router();
const {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionStats,
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  getFinanceStatistics,
  getSalesIncentiveMonthlySummary,
  getPendingRecovery,
  getGstProjects,
} = require('../controllers/adminFinanceController');
const { protect, authorize } = require('../middlewares/auth');

// Apply authentication and admin authorization to all routes
router.use(protect);
router.use(authorize('admin', 'accountant', 'pem'));

// Finance statistics route
router.route('/statistics')
  .get(getFinanceStatistics);

// Pending recovery (projects with outstanding amount)
router.route('/pending-recovery')
  .get(getPendingRecovery);

// GST projects (projects with GST applied - for finance management)
router.route('/gst-projects')
  .get(getGstProjects);

// Transaction routes
router.route('/transactions')
  .post(createTransaction)
  .get(getTransactions);

router.route('/transactions/stats')
  .get(getTransactionStats);

router.route('/transactions/:id')
  .get(getTransaction)
  .put(updateTransaction)
  .delete(deleteTransaction);

// Account routes
router.route('/accounts')
  .get(getAccounts)
  .post(createAccount);

router.route('/accounts/:id')
  .get(getAccount)
  .put(updateAccount)
  .delete(deleteAccount);

// Expense routes
router.route('/expenses')
  .get(getExpenses)
  .post(createExpense);

// Put approve route before generic :id route to ensure proper matching
router.route('/expenses/:id/approve')
  .put(approveExpense);

router.route('/expenses/:id')
  .get(getExpense)
  .put(updateExpense)
  .delete(deleteExpense);

// Budget routes
router.route('/budgets')
  .get(getBudgets)
  .post(createBudget);

router.route('/budgets/:id')
  .get(getBudget)
  .put(updateBudget)
  .delete(deleteBudget);

// Sales Incentives routes
router.route('/sales-incentives/monthly-summary')
  .get(getSalesIncentiveMonthlySummary);

module.exports = router;

