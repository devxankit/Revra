import { apiRequest } from './baseApiService'

export const salesTasksService = {
  async list(params = {}) {
    const qs = new URLSearchParams()
    if (params.search) qs.append('search', params.search)
    if (params.filter) qs.append('filter', params.filter)
    const url = `/sales/tasks${qs.toString() ? `?${qs.toString()}` : ''}`
    const res = await apiRequest(url, { method: 'GET' })
    return res.data || { items: [], stats: { total: 0, pending: 0, completed: 0, high: 0 } }
  },

  async create(task) {
    const res = await apiRequest('/sales/tasks', { method: 'POST', body: JSON.stringify(task) })
    return res.data
  },

  async update(id, updates) {
    const res = await apiRequest(`/sales/tasks/${id}`, { method: 'PUT', body: JSON.stringify(updates) })
    return res.data
  },

  async toggle(id) {
    const res = await apiRequest(`/sales/tasks/${id}/toggle`, { method: 'PATCH' })
    return res.data
  },

  async remove(id) {
    const res = await apiRequest(`/sales/tasks/${id}`, { method: 'DELETE' })
    return res.data
  }
}

export default salesTasksService


