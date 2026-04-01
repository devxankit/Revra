import { apiRequest } from './baseApiService'

export const salesMeetingsService = {
  async list(params = {}) {
    const qs = new URLSearchParams()
    if (params.search) qs.append('search', params.search)
    if (params.filter) qs.append('filter', params.filter)
    const url = `/sales/meetings${qs.toString() ? `?${qs.toString()}` : ''}`
    const res = await apiRequest(url, { method: 'GET' })
    return res.data || { items: [], stats: { total: 0, today: 0, upcoming: 0 } }
  },

  async create(meeting) {
    const res = await apiRequest('/sales/meetings', { method: 'POST', body: JSON.stringify(meeting) })
    return res.data
  },

  async update(id, updates) {
    const res = await apiRequest(`/sales/meetings/${id}`, { method: 'PUT', body: JSON.stringify(updates) })
    return res.data
  },

  async remove(id) {
    const res = await apiRequest(`/sales/meetings/${id}`, { method: 'DELETE' })
    return res.data
  },

  async getMyConvertedClients() {
    const res = await apiRequest('/sales/clients/my-converted', { method: 'GET' })
    return res.data || []
  }
}

export default salesMeetingsService


