const express = require('express');
const router = express.Router();
const {
  // Lead Management
  createLead,
  createBulkLeads,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
  getLeadStatistics,

  // Lead Category Management
  createLeadCategory,
  getAllLeadCategories,
  getLeadCategoryById,
  updateLeadCategory,
  deleteLeadCategory,
  getCategoryPerformance,

  // Sales Team Management
  getAllSalesTeam,
  getSalesTeamMember,
  setSalesTarget,
  updateTeamMembers,
  distributeLeads,
  getLeadsForMember,
  getLeadsByCategory,
  deleteSalesMember,

  // Incentive Management
  setIncentive,
  setTeamLeadIncentive,
  getIncentiveHistory,
  updateIncentiveRecord,

  // Team Lead Target Management
  setTeamLeadTarget,

  // Analytics
  getSalesOverview,
  getCategoryAnalytics,
  getCategoryFinancialDetails,
  getTeamPerformance,

  // Sales month configuration
  getSalesMonthRangeConfig,
  updateSalesMonthRangeConfig
} = require('../controllers/adminSalesController');
const { protect, authorize } = require('../middlewares/auth');

// Apply authentication and authorization to all routes
router.use(protect);
router.use(authorize('admin', 'hr'));

// ==================== LEAD MANAGEMENT ROUTES ====================

// @route   POST /api/admin/sales/leads
// @desc    Create single lead
// @access  Private (Admin/HR only)
router.post('/leads', createLead);

// @route   POST /api/admin/sales/leads/bulk
// @desc    Create bulk leads from phone numbers array
// @access  Private (Admin/HR only)
router.post('/leads/bulk', createBulkLeads);

// @route   GET /api/admin/sales/leads
// @desc    Get all leads with filtering and pagination
// @access  Private (Admin/HR only)
router.get('/leads', getAllLeads);

// @route   GET /api/admin/sales/leads/statistics
// @desc    Get lead statistics
// @access  Private (Admin/HR only)
router.get('/leads/statistics', getLeadStatistics);

// @route   GET /api/admin/sales/leads/:id
// @desc    Get single lead by ID
// @access  Private (Admin/HR only)
router.get('/leads/:id', getLeadById);

// @route   PUT /api/admin/sales/leads/:id
// @desc    Update lead
// @access  Private (Admin/HR only)
router.put('/leads/:id', updateLead);

// @route   DELETE /api/admin/sales/leads/:id
// @desc    Delete lead
// @access  Private (Admin/HR only)
router.delete('/leads/:id', deleteLead);

// ==================== LEAD CATEGORY ROUTES ====================

// @route   POST /api/admin/sales/categories
// @desc    Create lead category
// @access  Private (Admin/HR only)
router.post('/categories', createLeadCategory);

// @route   GET /api/admin/sales/categories
// @desc    Get all lead categories with lead counts
// @access  Private (Admin/HR only)
router.get('/categories', getAllLeadCategories);

// @route   GET /api/admin/sales/categories/performance
// @desc    Get category performance analytics
// @access  Private (Admin/HR only)
router.get('/categories/performance', getCategoryPerformance);

// @route   GET /api/admin/sales/categories/:id
// @desc    Get single lead category with performance data
// @access  Private (Admin/HR only)
router.get('/categories/:id', getLeadCategoryById);

// @route   PUT /api/admin/sales/categories/:id
// @desc    Update lead category
// @access  Private (Admin/HR only)
router.put('/categories/:id', updateLeadCategory);

// @route   DELETE /api/admin/sales/categories/:id
// @desc    Delete lead category
// @access  Private (Admin/HR only)
router.delete('/categories/:id', deleteLeadCategory);

// ==================== SALES TEAM MANAGEMENT ROUTES ====================

// @route   GET /api/admin/sales/team
// @desc    Get all sales team members with performance metrics
// @access  Private (Admin/HR only)
router.get('/team', getAllSalesTeam);

// @route   GET /api/admin/sales/team/:id
// @desc    Get sales team member details with lead breakdown
// @access  Private (Admin/HR only)
router.get('/team/:id', getSalesTeamMember);

// @route   PUT /api/admin/sales/team/:id/target
// @desc    Set/update sales target for team member
// @access  Private (Admin/HR only)
router.put('/team/:id/target', setSalesTarget);

// @route   PUT /api/admin/sales/team/:id/team-members
// @desc    Update team members assignment for sales team lead
// @access  Private (Admin/HR only)
router.put('/team/:id/team-members', updateTeamMembers);

// @route   POST /api/admin/sales/team/:id/distribute-leads
// @desc    Distribute leads to sales team member
// @access  Private (Admin/HR only)
router.post('/team/:id/distribute-leads', distributeLeads);

// @route   GET /api/admin/sales/team/:id/leads
// @desc    Get all leads assigned to team member
// @access  Private (Admin/HR only)
router.get('/team/:id/leads', getLeadsForMember);

// @route   DELETE /api/admin/sales/team/:id
// @desc    Delete sales team member
// @access  Private (Admin/HR only)
router.delete('/team/:id', deleteSalesMember);

// ==================== INCENTIVE MANAGEMENT ROUTES ====================

// @route   POST /api/admin/sales/team/:id/incentive
// @desc    Set incentive for sales team member
// @access  Private (Admin/HR only)
router.post('/team/:id/incentive', setIncentive);

// @route   POST /api/admin/sales/team-leads/:id/incentive
// @desc    Set incentive for team lead
// @access  Private (Admin/HR only)
router.post('/team-leads/:id/incentive', setTeamLeadIncentive);

// @route   PUT /api/admin/sales/team-leads/:id/team-target
// @desc    Set team target and reward for team lead
// @access  Private (Admin/HR only)
router.put('/team-leads/:id/team-target', setTeamLeadTarget);

// @route   GET /api/admin/sales/team/:id/incentives
// @desc    Get incentive history for team member
// @access  Private (Admin/HR only)
router.get('/team/:id/incentives', getIncentiveHistory);

// @route   PUT /api/admin/sales/team/:id/incentive/:incentiveId
// @desc    Update incentive record
// @access  Private (Admin/HR only)
router.put('/team/:id/incentive/:incentiveId', updateIncentiveRecord);

// ==================== ANALYTICS ROUTES ====================

// @route   GET /api/admin/sales/overview
// @desc    Get sales overview statistics
// @access  Private (Admin/HR only)
router.get('/overview', getSalesOverview);

// @route   GET /api/admin/sales/analytics/categories
// @desc    Get category analytics
// @access  Private (Admin/HR only)
router.get('/analytics/categories', getCategoryAnalytics);

// @route   GET /api/admin/sales/analytics/categories/financial
// @desc    Get category financial details
// @access  Private (Admin/HR only)
router.get('/analytics/categories/financial', getCategoryFinancialDetails);

// @route   GET /api/admin/sales/analytics/team
// @desc    Get team performance analytics
// @access  Private (Admin/HR only)
router.get('/analytics/team', getTeamPerformance);

// ==================== SALES MONTH CONFIGURATION ROUTES ====================

// @route   GET /api/admin/sales/month-range
// @desc    Get global sales month configuration
// @access  Private (Admin/HR only)
router.get('/month-range', getSalesMonthRangeConfig);

// @route   PUT /api/admin/sales/month-range
// @desc    Update global sales month configuration
// @access  Private (Admin/HR only)
router.put('/month-range', updateSalesMonthRangeConfig);

module.exports = router;

// Note: Account management routes have been moved to adminFinanceRoutes.js
// These routes are for managing accounts (Account model) and payment receipts
// which are separate from AdminFinance transactions/budgets/invoices/expenses
