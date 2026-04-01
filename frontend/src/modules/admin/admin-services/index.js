// Admin Services Index - Centralized exports
// This file provides a clean way to import all admin services

// Authentication Service
export { default as adminAuthService } from './adminAuthService';

// User Management Service
export { default as adminUserService } from './adminUserService';

// Channel Partner Management Service
export { default as adminChannelPartnerService } from './adminChannelPartnerService';

// Project Management Service
export { default as adminProjectService } from './adminProjectService';

// Finance Management Service
export { default as adminFinanceService } from './adminFinanceService';

// Sales Management Service
export { default as adminSalesService } from './adminSalesService';

// Dashboard Service
export { default as adminDashboardService } from './adminDashboardService';

// Allowance Management Service
export { default as adminAllowanceService } from './adminAllowanceService';

// Recurring Expense Management Service
export { default as adminRecurringExpenseService } from './adminRecurringExpenseService';

// Notice Management Service
export { default as adminNoticeService } from './adminNoticeService';

// Quotation Management Service
export { adminQuotationService } from './adminQuotationService';

// Base API Service (for internal use)
export { default as baseApiService } from './baseApiService';

// Re-export commonly used functions from auth service
export {
  loginAdmin,
  logoutAdmin,
  getAdminProfile,
  createDemoAdmin,
  isAdminAuthenticated,
  getStoredAdminData,
  storeAdminData,
  clearAdminData
} from './adminAuthService';

// Usage Examples:
// import { adminAuthService, adminUserService } from '../admin-services';
// import { loginAdmin, isAdminAuthenticated } from '../admin-services';
// import adminAuthService from '../admin-services/adminAuthService';
