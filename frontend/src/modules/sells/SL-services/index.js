// Sales Services Index - Centralized exports
// This file provides a clean way to import all Sales services

// Sales Authentication Service
export { default as salesAuthService } from './salesAuthService';

// Sales Lead Management Service
export { default as salesLeadService } from './salesLeadService';

// Payments / Receivables
export { default as salesPaymentsService } from './salesPaymentsService';

// Demo Requests
export { default as salesDemoService } from './salesDemoService';

// Analytics
export { default as salesAnalyticsService } from './salesAnalyticsService';
export { default as salesWalletService } from './salesWalletService';

// Tasks
export { default as salesTasksService } from './salesTasksService';

// Meetings
export { default as salesMeetingsService } from './salesMeetingsService';

// Client Management
export { default as salesClientService } from './salesClientService';

// Requests
export { default as salesRequestService } from './salesRequestService';

// Notices
export { default as salesNoticeService } from './salesNoticeService';

// Notifications
export { default as salesNotificationService } from './salesNotificationService';

// Base API Service (for internal use)
export { default as baseApiService } from './baseApiService';

// Re-export commonly used functions from Sales auth service
export {
  loginSales,
  logoutSales,
  getSalesProfile,
  createDemoSales,
  isSalesAuthenticated,
  getStoredSalesData,
  storeSalesData,
  clearSalesData
} from './salesAuthService';

// Usage Examples:
// import { salesAuthService } from '../SL-services';
// import { loginSales, isSalesAuthenticated } from '../SL-services';
// import salesAuthService from '../SL-services/salesAuthService';
