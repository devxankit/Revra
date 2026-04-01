import { apiRequest, tokenUtils, clientStorage } from './clientBaseApiService';
import { registerFCMToken } from '../../../services/pushNotificationService';
import { clearOtherRoleSessions } from '../../../utils/clearOtherRoleSessions';

export const clientAuthService = {
  // Send OTP to phone number
  sendOTP: async (phoneNumber) => {
    try {
      const response = await apiRequest('/client/send-otp', {
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
      const response = await apiRequest('/client/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, otp })
      });

      if (response.data && response.token) {
        clearOtherRoleSessions('client'); // so refresh doesn't show admin/other role
        tokenUtils.set(response.token);
        clientStorage.set(response.data);
      }

      // Register FCM token after successful login
      // Wait a bit to ensure token is saved in localStorage
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
      const response = await apiRequest('/client/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber })
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get client profile
  getProfile: async () => {
    try {
      const response = await apiRequest('/client/profile', {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update client profile
  updateProfile: async (profileData) => {
    try {
      const response = await apiRequest('/client/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Logout client
  logout: async () => {
    try {
      const response = await apiRequest('/client/logout', {
        method: 'POST'
      });
      clientStorage.clear();
      return response;
    } catch (error) {
      clientStorage.clear();
      throw error;
    }
  },

  // Create demo client
  createDemoClient: async () => {
    try {
      const response = await apiRequest('/client/create-demo', {
        method: 'POST'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Check SMS service status
  checkSMSStatus: async () => {
    try {
      const response = await apiRequest('/client/sms-status', {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Authentication utilities
  isAuthenticated: () => tokenUtils.isAuthenticated(),
  getStoredClientData: () => clientStorage.get(),
  clearClientData: () => clientStorage.clear(),
};

// Export individual functions for convenience
export const {
  sendOTP,
  verifyOTP,
  resendOTP,
  getProfile,
  updateProfile,
  logout: logoutClient,
  createDemoClient,
  checkSMSStatus,
  isAuthenticated: isClientAuthenticated,
  getStoredClientData,
  clearClientData
} = clientAuthService;

export default clientAuthService;
