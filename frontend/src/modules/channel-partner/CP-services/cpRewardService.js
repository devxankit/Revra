import { apiRequest } from './baseApiService';

export const cpRewardService = {
  // Get rewards
  getRewards: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/cp/rewards${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(url, { method: 'GET' });
  },

  // Get incentives
  getIncentives: async () => {
    return await apiRequest('/cp/rewards/incentives', { method: 'GET' });
  },

  // Get performance metrics
  getPerformanceMetrics: async () => {
    return await apiRequest('/cp/rewards/performance', { method: 'GET' });
  }
};

export default cpRewardService;
