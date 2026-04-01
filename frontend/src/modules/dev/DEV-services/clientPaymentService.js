import { apiRequest } from './clientBaseApiService';

const API_BASE_URL = '/client/payments';

export const clientPaymentService = {
  // Get client's payments
  getPayments: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.paymentType) params.append('paymentType', filters.paymentType);
      if (filters.project) params.append('project', filters.project);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const queryString = params.toString();
      const url = queryString ? `${API_BASE_URL}?${queryString}` : API_BASE_URL;
      
      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payment by ID
  getPaymentById: async (paymentId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${paymentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get project payments
  getProjectPayments: async (projectId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/project/${projectId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payment statistics
  getPaymentStatistics: async () => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/statistics`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

