import { apiRequest } from './baseApiService';

// Create new allowance
const createAllowance = async (allowanceData) => {
  const res = await apiRequest('/admin/users/allowances', {
    method: 'POST',
    body: JSON.stringify(allowanceData)
  });
  return res;
};

// Get all allowances with filters
const getAllAllowances = async (params = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.employeeId) queryParams.append('employeeId', params.employeeId);
  if (params.userType) queryParams.append('userType', params.userType);
  if (params.status && params.status !== 'all') queryParams.append('status', params.status);
  if (params.itemType && params.itemType !== 'all') queryParams.append('itemType', params.itemType);
  if (params.search) queryParams.append('search', params.search);
  
  const query = queryParams.toString();
  const url = `/admin/users/allowances${query ? `?${query}` : ''}`;
  const res = await apiRequest(url, { method: 'GET' });
  return res;
};

// Get single allowance by ID
const getAllowanceById = async (id) => {
  const res = await apiRequest(`/admin/users/allowances/${id}`, { method: 'GET' });
  return res;
};

// Update allowance
const updateAllowance = async (id, updates) => {
  const res = await apiRequest(`/admin/users/allowances/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  return res;
};

// Delete allowance
const deleteAllowance = async (id) => {
  const res = await apiRequest(`/admin/users/allowances/${id}`, {
    method: 'DELETE'
  });
  return res;
};

// Get allowance statistics
const getAllowanceStatistics = async () => {
  const res = await apiRequest('/admin/users/allowances/statistics', { method: 'GET' });
  return res;
};

export const adminAllowanceService = {
  createAllowance,
  getAllAllowances,
  getAllowanceById,
  updateAllowance,
  deleteAllowance,
  getAllowanceStatistics
};

export default adminAllowanceService;

