import { apiRequest, tokenUtils, employeeStorage } from './employeeBaseApiService';
import { registerFCMToken } from '../../../services/pushNotificationService';
import { clearOtherRoleSessions } from '../../../utils/clearOtherRoleSessions';

// Employee Authentication Service - Only for login/logout functionality
export const employeeAuthService = {
  // Login Employee
  login: async (email, password) => {
    try {
      const response = await apiRequest('/employee/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      // Store token in localStorage
      if (response.data && response.data.token) {
        clearOtherRoleSessions('employee'); // so refresh doesn't show admin/other role
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

  // Get Employee profile
  getProfile: async () => {
    try {
      const response = await apiRequest('/employee/profile', {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Logout Employee
  logout: async () => {
    try {
      const response = await apiRequest('/employee/logout', {
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

  // Create demo Employee (for development only)
  createDemoEmployee: async () => {
    try {
      const response = await apiRequest('/employee/create-demo', {
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

  // Get stored Employee data
  getStoredEmployeeData: () => {
    return employeeStorage.get();
  },

  // Store Employee data
  storeEmployeeData: (employeeData) => {
    employeeStorage.set(employeeData);
  },

  // Clear all Employee data
  clearEmployeeData: () => {
    employeeStorage.clear();
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await apiRequest('/employee/forgot-password', {
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
      const response = await apiRequest(`/employee/reset-password/${resetToken}`, {
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
  login: loginEmployee,
  getProfile: getEmployeeProfile,
  logout: logoutEmployee,
  createDemoEmployee,
  isAuthenticated: isEmployeeAuthenticated,
  getStoredEmployeeData,
  storeEmployeeData,
  clearEmployeeData,
  forgotPassword: forgotPasswordEmployee,
  resetPassword: resetPasswordEmployee
} = employeeAuthService;

export default employeeAuthService;
