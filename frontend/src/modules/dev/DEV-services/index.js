// DEV Services Index - Centralized exports
// This file provides a clean way to import all DEV services

// PM Authentication Service
export { default as pmAuthService } from './pmAuthService';

// Employee Authentication Service
export { default as employeeAuthService } from './employeeAuthService';

// Client Authentication Service
export { default as clientAuthService } from './clientAuthService';

// Base API Service (for internal use)
export { apiRequest, tokenUtils, pmStorage, employeeStorage } from './baseApiService';

// PM Module Services
export { projectService } from './projectService';
export { milestoneService } from './milestoneService';
export { taskService } from './taskService';
export { urgentTaskService } from './urgentTaskService';
export { paymentService } from './paymentService';
export { analyticsService } from './analyticsService';
export { teamService } from './teamService';
export { pmWalletService } from './pmWalletService';
export { default as pmNoticeService } from './pmNoticeService';
export { default as pmRequestService } from './pmRequestService';
export { default as pmNotificationService } from './pmNotificationService';
export { default as socketService } from './socketService';

// Employee Module Services
export { default as employeeService } from './employeeService';
export { default as employeeNoticeService } from './employeeNoticeService';
export { employeeWalletService } from './employeeWalletService';
export { default as employeeRequestService } from './employeeRequestService';
export { default as employeeNotificationService } from './employeeNotificationService';

// Client Module Services
export { clientProjectService } from './clientProjectService';
export { clientAnalyticsService } from './clientAnalyticsService';
export { default as clientWalletService } from './clientWalletService';
export { default as clientNotificationService } from './clientNotificationService';
export { default as clientExploreService } from './clientExploreService';

// Re-export commonly used functions from PM auth service
export {
  loginPM,
  logoutPM,
  getPMProfile,
  createDemoPM,
  isPMAuthenticated,
  getStoredPMData,
  storePMData,
  clearPMData
} from './pmAuthService';

// Re-export commonly used functions from Employee auth service
export {
  loginEmployee,
  logoutEmployee,
  getEmployeeProfile,
  createDemoEmployee,
  isEmployeeAuthenticated,
  getStoredEmployeeData,
  storeEmployeeData,
  clearEmployeeData
} from './employeeAuthService';

// Re-export commonly used functions from Client auth service
export {
  sendOTP,
  verifyOTP,
  resendOTP,
  getProfile,
  updateProfile,
  logoutClient,
  createDemoClient,
  checkSMSStatus,
  isClientAuthenticated,
  getStoredClientData,
  clearClientData
} from './clientAuthService';

// Usage Examples:
// Authentication Services:
// import { pmAuthService, employeeAuthService, clientAuthService } from '../DEV-services';
// import { loginPM, loginEmployee, sendOTP, verifyOTP, isPMAuthenticated, isEmployeeAuthenticated, isClientAuthenticated } from '../DEV-services';

// PM Module Services:
// import { projectService, milestoneService, taskService, paymentService, analyticsService, teamService, socketService } from '../DEV-services';

// Employee Module Services:
// import { employeeService } from '../DEV-services';

// Individual Service Imports:
// import pmAuthService from '../DEV-services/pmAuthService';
// import employeeAuthService from '../DEV-services/employeeAuthService';
// import clientAuthService from '../DEV-services/clientAuthService';
// import { projectService } from '../DEV-services/projectService';
// import { milestoneService } from '../DEV-services/milestoneService';
// import { taskService } from '../DEV-services/taskService';
// import { paymentService } from '../DEV-services/paymentService';
// import { analyticsService } from '../DEV-services/analyticsService';
// import { teamService } from '../DEV-services/teamService';
// import socketService from '../DEV-services/socketService';
// import employeeService from '../DEV-services/employeeService';
