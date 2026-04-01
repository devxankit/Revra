import { apiRequest } from './baseApiService'

export const salesDemoService = {
  async list(params = {}) {
    const qs = new URLSearchParams()
    if (params.search) qs.append('search', params.search)
    if (params.status && params.status !== 'all') qs.append('status', params.status)
    if (params.category && params.category !== 'all') qs.append('category', params.category)
    const url = `/sales/demo-requests${qs.toString() ? `?${qs.toString()}` : ''}`
    const res = await apiRequest(url, { method: 'GET' })
    const data = res?.data || res
    return {
      items: Array.isArray(data?.items) ? data.items : (data?.data ?? []),
      stats: data?.stats && typeof data.stats === 'object' ? data.stats : { total: 0, pending: 0, scheduled: 0, completed: 0 }
    }
  },

  async updateStatus(demoRequestIdOrLeadId, status) {
    const res = await apiRequest(`/sales/demo-requests/${demoRequestIdOrLeadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
    return res?.data ?? res
  }
}

export default salesDemoService


