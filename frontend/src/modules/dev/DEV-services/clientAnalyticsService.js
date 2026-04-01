import { apiRequest } from './clientBaseApiService';

const API_BASE_URL = '/client/projects';

export const clientAnalyticsService = {
  // Get client project statistics (automatically uses authenticated client from token)
  // clientId parameter is optional and ignored - backend uses authenticated client from token
  getClientProjectStats: async (clientId = null) => {
    try {
      // Use the client-specific statistics endpoint
      const response = await apiRequest(`${API_BASE_URL}/statistics`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get project analytics (for a specific project - client can only access their own)
  getProjectAnalytics: async (projectId) => {
    try {
      // Get project details which includes analytics info
      const response = await apiRequest(`${API_BASE_URL}/${projectId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

