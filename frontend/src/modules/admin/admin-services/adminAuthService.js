import { apiRequest, tokenUtils, adminStorage } from './baseApiService';
import { registerFCMToken } from '../../../services/pushNotificationService';
import { clearOtherRoleSessions } from '../../../utils/clearOtherRoleSessions';

// Admin Authentication Service - Only for login/logout functionality
const adminAuthService = {
  // Login admin
  login: async (email, password, securityCode) => {
    try {
      const body = { email, password };
      if (securityCode) {
        body.securityCode = securityCode;
      }

      const response = await apiRequest('/admin/login', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      console.log('📦 Login response:', {
        success: response.success,
        hasData: !!response.data,
        hasToken: !!(response.data && response.data.token),
        responseKeys: Object.keys(response)
      });

      // Store token in localStorage
      // Check multiple possible response structures
      const token = (response.data && response.data.token) || response.token || (response.data && response.data.admin && response.data.admin.token);
      if (token) {
        clearOtherRoleSessions('admin'); // so refresh doesn't show another role's session
        tokenUtils.set(token);
        console.log('✅ Auth token stored in localStorage as adminToken');
        console.log('✅ Token preview:', token.substring(0, 30) + '...');
        
        // Verify token was saved
        const savedToken = localStorage.getItem('adminToken');
        if (savedToken === token) {
          console.log('✅ Token verified in localStorage');
        } else {
          console.error('❌ Token mismatch! Saved:', savedToken?.substring(0, 30), 'Expected:', token.substring(0, 30));
        }
      } else {
        console.warn('⚠️  No token found in login response:', response);
      }

      // Register FCM token after successful login
      // Wait a bit to ensure token is saved in localStorage and backend session is established
      if (response.success && token) {
        setTimeout(async () => {
          try {
            console.log('🔄 Registering FCM token after login...');
            // Double-check token is available
            const checkToken = localStorage.getItem('adminToken');
            if (!checkToken) {
              console.error('❌ Token not found when trying to register FCM token!');
              return;
            }
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

  // Get admin profile
  getProfile: async () => {
    try {
      const response = await apiRequest('/admin/profile', {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Logout admin
  logout: async () => {
    try {
      const response = await apiRequest('/admin/logout', {
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

  // Create demo admin (for development only)
  createDemoAdmin: async () => {
    try {
      const response = await apiRequest('/admin/create-demo', {
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

  // Get stored admin data
  getStoredAdminData: () => {
    return adminStorage.get();
  },

  // Store admin data
  storeAdminData: (adminData) => {
    adminStorage.set(adminData);
  },

  // Clear all admin data
  clearAdminData: () => {
    adminStorage.clear();
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await apiRequest('/admin/forgot-password', {
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
      const response = await apiRequest(`/admin/reset-password/${resetToken}`, {
        method: 'PUT',
        body: JSON.stringify({ password })
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update password while logged in
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await apiRequest('/admin/profile/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Export individual functions for convenience
export const {
  login: loginAdmin,
  getProfile: getAdminProfile,
  logout: logoutAdmin,
  createDemoAdmin,
  isAuthenticated: isAdminAuthenticated,
  getStoredAdminData,
  storeAdminData,
  clearAdminData,
  forgotPassword: forgotPasswordAdmin,
  resetPassword: resetPasswordAdmin
} = adminAuthService;

// Named export for changePassword helper
export const changePassword = adminAuthService.changePassword;

export default adminAuthService;
