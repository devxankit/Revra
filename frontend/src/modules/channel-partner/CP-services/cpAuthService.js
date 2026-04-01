import { apiRequest, tokenUtils, cpStorage } from './baseApiService';
import { registerFCMToken } from '../../../services/pushNotificationService';
import { clearOtherRoleSessions } from '../../../utils/clearOtherRoleSessions';

export const cpAuthService = {
  // Send OTP to phone number
  sendOTP: async (phoneNumber) => {
    try {
      const response = await apiRequest('/channel-partner/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber })
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Verify OTP and login
  verifyOTP: async (phoneNumber, otp) => {
    try {
      const response = await apiRequest('/channel-partner/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, otp })
      });

      if (response.data && response.token) {
        clearOtherRoleSessions('cp'); // so refresh doesn't show admin/other role
        tokenUtils.set(response.token);
        cpStorage.set({ ...response.data, loginTime: new Date().toISOString() });
      }

      // Register FCM token after successful login (defer until after navigation to cp-dashboard)
      // So any service-worker reload happens on /cp-dashboard, not before navigate
      if (response.success || response.data) {
        setTimeout(async () => {
          try {
            await registerFCMToken(true); // forceUpdate = true
          } catch (error) {
            console.error('Failed to register FCM token:', error);
            // Don't fail login if FCM registration fails
          }
        }, 5000); // Defer so dashboard loads first; no reload from push notification flow
      }

      return response;
    } catch (error) {
      throw error;
    }
  },

  // Resend OTP
  resendOTP: async (phoneNumber) => {
    try {
      const response = await apiRequest('/channel-partner/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber })
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get channel partner profile
  getProfile: async () => {
    try {
      const response = await apiRequest('/channel-partner/profile', {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update channel partner profile
  updateProfile: async (profileData) => {
    try {
      const response = await apiRequest('/channel-partner/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Logout channel partner
  logout: async () => {
    try {
      const response = await apiRequest('/channel-partner/logout', {
        method: 'POST'
      });
      cpStorage.clear();
      return response;
    } catch (error) {
      cpStorage.clear();
      throw error;
    }
  },

  // Authentication utilities
  isAuthenticated: () => tokenUtils.isAuthenticated(),
  getStoredCPData: () => cpStorage.get(),
  clearCPData: () => cpStorage.clear(),
};

// Export individual functions for convenience
export const {
  sendOTP,
  verifyOTP,
  resendOTP,
  getProfile,
  updateProfile,
  logout: logoutCP,
  isAuthenticated: isCPAuthenticated,
  getStoredCPData,
  clearCPData
} = cpAuthService;

export default cpAuthService;
