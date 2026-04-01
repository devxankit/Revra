import { apiRequest } from './baseApiService';

export const cpPaymentRecoveryService = {
  // Get pending payments
  getPendingPayments: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/cp/payment-recovery/pending${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(url, { method: 'GET' });
  },

  // Get payment history
  getPaymentHistory: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/cp/payment-recovery/history${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(url, { method: 'GET' });
  },

  // Update payment status (add notes)
  updatePaymentStatus: async (paymentId, notes) => {
    return await apiRequest(`/cp/payment-recovery/${paymentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ notes })
    });
  }
};

export default cpPaymentRecoveryService;
