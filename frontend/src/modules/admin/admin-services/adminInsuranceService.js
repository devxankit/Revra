import { apiRequest } from './baseApiService';

const adminInsuranceService = {
  // Stats
  getStats: async () => {
    return await apiRequest('/api/admin/insurance/stats', {
      method: 'GET'
    });
  },

  // Products
  getProducts: async () => {
    return await apiRequest('/api/admin/insurance/products', {
      method: 'GET'
    });
  },
  
  createProduct: async (data) => {
    return await apiRequest('/api/admin/insurance/products', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateProduct: async (id, data) => {
    return await apiRequest(`/api/admin/insurance/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteProduct: async (id) => {
    return await apiRequest(`/api/admin/insurance/products/${id}`, {
      method: 'DELETE'
    });
  },

  // Policies
  getPolicies: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = queryParams ? `/api/admin/insurance/policies?${queryParams}` : '/api/admin/insurance/policies';
    return await apiRequest(url, {
      method: 'GET'
    });
  },

  createPolicy: async (data) => {
    return await apiRequest('/api/admin/insurance/policies', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updatePolicy: async (id, data) => {
    return await apiRequest(`/api/admin/insurance/policies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deletePolicy: async (id) => {
    return await apiRequest(`/api/admin/insurance/policies/${id}`, {
      method: 'DELETE'
    });
  }
};

export default adminInsuranceService;
