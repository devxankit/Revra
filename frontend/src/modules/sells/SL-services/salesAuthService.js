import { apiRequest, tokenUtils, salesStorage } from './baseApiService';
import { registerFCMToken } from '../../../services/pushNotificationService';
import { clearOtherRoleSessions } from '../../../utils/clearOtherRoleSessions';

// Sales Authentication Service - Only for login/logout functionality
export const salesAuthService = {
  // Login Sales
  login: async (email, password) => {
    try {
      const response = await apiRequest('/sales/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      // Store token in localStorage
      if (response.data && response.data.token) {
        clearOtherRoleSessions('sales'); // so refresh doesn't show admin/other role
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

  // Get Sales profile
  getProfile: async () => {
    try {
      const response = await apiRequest('/sales/profile', {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Logout Sales
  logout: async () => {
    try {
      const response = await apiRequest('/sales/logout', {
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

  // Create demo Sales (for development only)
  createDemoSales: async () => {
    try {
      const response = await apiRequest('/sales/create-demo', {
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

  // Get stored Sales data
  getStoredSalesData: () => {
    return salesStorage.get();
  },

  // Store Sales data
  storeSalesData: (salesData) => {
    salesStorage.set(salesData);
  },

  // Clear all Sales data
  clearSalesData: () => {
    salesStorage.clear();
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await apiRequest('/sales/forgot-password', {
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
      const response = await apiRequest(`/sales/reset-password/${resetToken}`, {
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
  login: loginSales,
  getProfile: getSalesProfile,
  logout: logoutSales,
  createDemoSales,
  isAuthenticated: isSalesAuthenticated,
  getStoredSalesData,
  storeSalesData,
  clearSalesData,
  forgotPassword: forgotPasswordSales,
  resetPassword: resetPasswordSales
} = salesAuthService;

export default salesAuthService;
