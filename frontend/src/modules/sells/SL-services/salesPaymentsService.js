import { apiRequest } from './baseApiService'

export const salesPaymentsService = {
  async getAccounts() {
    const res = await apiRequest('/sales/accounts', { method: 'GET' })
    return res.data || []
  },

  async getReceivables(params = {}) {
    const query = new URLSearchParams()
    if (params.search) query.append('search', params.search)
    if (params.overdue !== undefined) query.append('overdue', String(params.overdue))
    if (params.band) query.append('band', params.band)
    const url = `/sales/payment-recovery${query.toString() ? `?${query.toString()}` : ''}`
    const res = await apiRequest(url, { method: 'GET' })
    return res.data || []
  },

  async getReceivableStats() {
    const res = await apiRequest('/sales/payment-recovery/stats', { method: 'GET' })
    return res.data || { totalDue: 0, overdueCount: 0, overdueAmount: 0 }
  },

  async getPaymentReceipts(projectId) {
    const res = await apiRequest(`/sales/payment-recovery/${projectId}/receipts`, { method: 'GET' })
    return res.data || []
  },

  async createReceipt(projectId, payload) {
    const res = await apiRequest(`/sales/payment-recovery/${projectId}/receipts`, {
      method: 'POST',
      body: JSON.stringify({
        amount: payload.amount,
        accountId: payload.accountId,
        method: payload.method,
        referenceId: payload.referenceId || undefined,
        notes: payload.notes
      })
    })
    return res.data
  },

  async getInstallments(projectId) {
    const res = await apiRequest(`/sales/payment-recovery/${projectId}/installments`, { method: 'GET' })
    return res.data || []
  },

  async requestInstallmentPayment(projectId, installmentId, payload) {
    const res = await apiRequest(`/sales/payment-recovery/${projectId}/installments/${installmentId}/request-payment`, {
      method: 'POST',
      body: JSON.stringify({
        paidDate: payload.paidDate,
        notes: payload.notes
      })
    })
    return res.data
  }
}

export default salesPaymentsService


