import { apiRequest } from './baseApiService';

export const cpDashboardService = {
  // Get dashboard statistics
  getDashboardStats: async () => {
    return await apiRequest('/cp/dashboard/stats', { method: 'GET' });
  },

  // Get recent activity
  getRecentActivity: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/cp/dashboard/activity${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(url, { method: 'GET' });
  },

  // Get lead trends
  getLeadTrends: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/cp/dashboard/lead-trends${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(url, { method: 'GET' });
  },

  // Get conversion funnel
  getConversionFunnel: async () => {
    return await apiRequest('/cp/dashboard/conversion-funnel', { method: 'GET' });
  },

  // Get revenue chart data
  getRevenueChart: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/cp/dashboard/revenue-chart${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(url, { method: 'GET' });
  }
};

export default cpDashboardService;
