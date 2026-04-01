// Channel Partner Services Index - Centralized exports
export { default as cpAuthService } from './cpAuthService';
export { default as baseApiService } from './baseApiService';
export { default as cpLeadService } from './cpLeadService';
export { default as cpWalletService } from './cpWalletService';
export { default as cpRewardService } from './cpRewardService';
export { default as cpPaymentRecoveryService } from './cpPaymentRecoveryService';
export { default as cpNotificationService } from './cpNotificationService';
export { default as cpDashboardService } from './cpDashboardService';
export { cpRequestService } from './cpRequestService';

// Re-export commonly used functions
export {
  sendOTP,
  verifyOTP,
  resendOTP,
  getProfile,
  updateProfile,
  logoutCP,
  isCPAuthenticated,
  getStoredCPData,
  clearCPData
} from './cpAuthService';
