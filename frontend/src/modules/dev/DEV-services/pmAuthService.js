import { apiRequest, tokenUtils, pmStorage } from './baseApiService';
import { registerFCMToken } from '../../../services/pushNotificationService';
import { clearOtherRoleSessions } from '../../../utils/clearOtherRoleSessions';

// PM Authentication Service - Only for login/logout functionality
export const pmAuthService = {
  // Login PM
  login: async (email, password) => {
    try {
      const response = await apiRequest('/pm/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      // Store token in localStorage
      if (response.data && response.data.token) {
        clearOtherRoleSessions('pm'); // so refresh doesn't show admin/other role
        tokenUtils.set(response.data.token);
      }

      // Register FCM token after successful login
      // Wait a bit to ensure token is saved in localStorage
      if (response.success) {
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

  // Get PM profile
  getProfile: async () => {
    try {
      const response = await apiRequest('/pm/profile', {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Logout PM
  logout: async () => {
    try {
      const response = await apiRequest('/pm/logout', {
        method: 'POST'
      });

      // Remove token from localStorage
      tokenUtils.remove();

      return response;
    } catch (error) {
      // Even if logout fails on server, remove local token
      tokenUtils.remove();
      throw error;
    }
  },

  // Create demo PM (for development only)
  createDemoPM: async () => {
    try {
      const response = await apiRequest('/pm/create-demo', {
        method: 'POST'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return tokenUtils.isAuthenticated();
  },

  // Get stored PM data
  getStoredPMData: () => {
    return pmStorage.get();
  },

  // Store PM data
  storePMData: (pmData) => {
    pmStorage.set(pmData);
  },

  // Clear all PM data
  clearPMData: () => {
    pmStorage.clear();
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await apiRequest('/pm/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Reset password
  resetPassword: async (resetToken, password) => {
    try {
      const response = await apiRequest(`/pm/reset-password/${resetToken}`, {
        method: 'PUT',
        body: JSON.stringify({ password })
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Export individual functions for convenience
export const {
  login: loginPM,
  getProfile: getPMProfile,
  logout: logoutPM,
  createDemoPM,
  isAuthenticated: isPMAuthenticated,
  getStoredPMData,
  storePMData,
  clearPMData,
  forgotPassword: forgotPasswordPM,
  resetPassword: resetPasswordPM
} = pmAuthService;

export default pmAuthService;
