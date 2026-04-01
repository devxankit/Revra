const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');

// Import controllers
const cpLeadController = require('../controllers/cpLeadController');
const cpWalletController = require('../controllers/cpWalletController');
const cpRewardController = require('../controllers/cpRewardController');
const cpPaymentRecoveryController = require('../controllers/cpPaymentRecoveryController');
const cpNotificationController = require('../controllers/cpNotificationController');
const cpDashboardController = require('../controllers/cpDashboardController');
const cpQuotationController = require('../controllers/cpQuotationController');

// All routes are protected
router.use(protect);

// Dashboard routes
router.get('/dashboard/stats', cpDashboardController.getDashboardStats);
router.get('/dashboard/activity', cpDashboardController.getRecentActivity);
router.get('/dashboard/lead-trends', cpDashboardController.getLeadTrends);
router.get('/dashboard/conversion-funnel', cpDashboardController.getConversionFunnel);
router.get('/dashboard/revenue-chart', cpDashboardController.getRevenueChart);

// Lead routes
router.get('/lead-categories', cpLeadController.getLeadCategories);
router.get('/sales-team-leads', cpLeadController.getSalesTeamLeads);
router.get('/sales-manager', cpLeadController.getSalesManagerDetails);
router.post('/leads', cpLeadController.createLead);
router.get('/leads', cpLeadController.getLeads);
router.get('/leads/shared/from-sales', cpLeadController.getSharedLeadsFromSales);
router.get('/leads/shared/with-sales', cpLeadController.getSharedLeadsWithSales);
router.get('/leads/:id', cpLeadController.getLeadById);
router.put('/leads/:id', cpLeadController.updateLead);
router.patch('/leads/:id/status', cpLeadController.updateLeadStatus);
router.delete('/leads/:id', cpLeadController.deleteLead);
router.post('/leads/:id/share', cpLeadController.shareLeadWithSales);
router.post('/leads/:id/unshare', cpLeadController.unshareLeadWithSales);
router.post('/leads/:id/profile', cpLeadController.createLeadProfile);
router.put('/leads/:id/profile', cpLeadController.updateLeadProfile);
router.post('/leads/:id/convert', cpLeadController.convertLeadToClient);
router.post('/leads/:id/followup', cpLeadController.addFollowUp);
router.put('/leads/:id/followup/:followupId', cpLeadController.updateFollowUp);
router.get('/clients', cpLeadController.getConvertedClients);
router.get('/clients/:id', cpLeadController.getClientDetails);

// Wallet routes
router.get('/wallet/summary', cpWalletController.getWalletSummary);
router.get('/wallet/transactions', cpWalletController.getTransactions);
router.post('/wallet/withdraw', cpWalletController.createWithdrawalRequest);
router.get('/wallet/withdrawals', cpWalletController.getWithdrawalHistory);
router.get('/wallet/earnings', cpWalletController.getEarningsBreakdown);
// Withdrawal requests from shared Request model (CP-only; avoids 401 on /api/requests)
router.get('/wallet/requests', cpWalletController.getWithdrawalRequests);
router.post('/wallet/request', cpWalletController.createWithdrawalRequestAsRequest);

// Rewards routes
router.get('/rewards', cpRewardController.getRewards);
router.get('/rewards/incentives', cpRewardController.getIncentives);
router.get('/rewards/performance', cpRewardController.getPerformanceMetrics);

// Payment recovery routes
router.get('/payment-recovery/pending', cpPaymentRecoveryController.getPendingPayments);
router.get('/payment-recovery/history', cpPaymentRecoveryController.getPaymentHistory);
router.patch('/payment-recovery/:id/status', cpPaymentRecoveryController.updatePaymentStatus);

// Notification routes
router.get('/notifications', cpNotificationController.getNotifications);
router.get('/notifications/unread-count', cpNotificationController.getUnreadCount);
router.patch('/notifications/:id/read', cpNotificationController.markAsRead);
router.patch('/notifications/read-all', cpNotificationController.markAllAsRead);

// Quotation routes
router.get('/quotations', cpQuotationController.getQuotations);
router.get('/quotations/categories', cpQuotationController.getQuotationCategories);
router.get('/quotations/:id', cpQuotationController.getQuotationById);
router.post('/quotations/:id/share', cpQuotationController.shareQuotation);

module.exports = router;
