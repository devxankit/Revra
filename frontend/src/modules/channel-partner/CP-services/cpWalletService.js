import { apiRequest } from './baseApiService';

export const cpWalletService = {
  // Get wallet summary
  getWalletSummary: async () => {
    return await apiRequest('/cp/wallet/summary', { method: 'GET' });
  },

  // Get transactions
  getTransactions: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/cp/wallet/transactions${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(url, { method: 'GET' });
  },

  // Create withdrawal request
  createWithdrawalRequest: async (withdrawalData) => {
    return await apiRequest('/cp/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify(withdrawalData)
    });
  },

  // Get withdrawal history
  getWithdrawalHistory: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/cp/wallet/withdrawals${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(url, { method: 'GET' });
  },

  // Get earnings breakdown
  getEarningsBreakdown: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/cp/wallet/earnings${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(url, { method: 'GET' });
  }
};

export default cpWalletService;
