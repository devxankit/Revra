const express = require('express');
const { getWalletSummary, getWalletTransactions, getUpcomingPayments, getOverdueInstallmentsCount } = require('../controllers/clientWalletController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All wallet routes require authenticated clients
router.use(protect);
router.use(authorize('client'));

router.get('/summary', getWalletSummary);
router.get('/transactions', getWalletTransactions);
router.get('/upcoming', getUpcomingPayments);
router.get('/overdue-count', getOverdueInstallmentsCount);

module.exports = router;

