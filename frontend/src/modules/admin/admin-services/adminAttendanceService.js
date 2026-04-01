import { apiRequest } from './baseApiService'
import { getApiUrl } from '../../../config/env'

// Helper to get auth token for admin requests
const getAdminToken = () => {
  return localStorage.getItem('adminToken')
}

// Helper to get auth headers for file uploads (FormData doesn't use Content-Type)
const getAuthHeaders = () => {
  const token = getAdminToken()
  const headers = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

const upload = async (file, month) => {
  const formData = new FormData()
  formData.append('file', file)
  if (month) formData.append('month', month)
  
  try {
    // For file uploads, we need to use fetch directly with FormData
    // But we'll still use adminToken for authentication
    const primaryUrl = getApiUrl('/admin/users/attendance/upload')
    const response = await fetch(primaryUrl, {
      method: 'POST',
      body: formData,
      headers: getAuthHeaders(),
      credentials: 'include'
    })
    
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload attendance')
    }
    return data
  } catch (error) {
    // Fallback to same-origin
    if (error && (error.name === 'TypeError' || String(error).includes('Failed to fetch'))) {
      const fallbackUrl = '/api/admin/users/attendance/upload'
      const response = await fetch(fallbackUrl, {
        method: 'POST',
        body: formData,
        headers: getAuthHeaders(),
        credentials: 'include'
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload attendance')
      }
      return data
    }
    throw error
  }
}

const get = async (month) => {
  const query = month ? `?month=${encodeURIComponent(month)}` : ''
  // Use baseApiService for consistency and proper admin token handling
  const res = await apiRequest(`/admin/users/attendance${query}`, {
    method: 'GET'
  })
  return res
}

export const adminAttendanceService = { upload, get }
export default adminAttendanceService


