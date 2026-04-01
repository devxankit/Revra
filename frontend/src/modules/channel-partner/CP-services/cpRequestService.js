import { apiRequest } from './baseApiService';

/**
 * CP withdrawal requests use /api/cp/wallet/requests and /api/cp/wallet/request (CP-only routes)
 * so the Wallet page never calls /api/requests and avoids 401. Same Request model on backend;
 * admins still see these in Request Management.
 */
export const cpRequestService = {
  createWithdrawalRequest: async (payload) => {
    const amount = typeof payload.amount === 'number' ? payload.amount : parseFloat(payload.amount);
    return await apiRequest('/cp/wallet/request', {
      method: 'POST',
      body: JSON.stringify({
        title: payload.title || undefined,
        description: payload.description || undefined,
        amount
      })
    });
  },

  getMyRequests: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/cp/wallet/requests${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(url, { method: 'GET' });
  },

  getRecipients: async (type = 'admin') => {
    // Not used by Wallet; kept for compatibility. Uses /api/requests - call only from contexts that need it.
    return await apiRequest(`/requests/recipients?type=${type}`, { method: 'GET' });
  }
};

export default cpRequestService;
