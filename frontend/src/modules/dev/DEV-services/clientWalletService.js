import { apiRequest } from './clientBaseApiService';

const BASE_URL = '/client/wallet';

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.append(key, value);
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

const normalizeSummaryResponse = (response) => {
  if (!response) return { summary: null, projects: [] };

  // Handle { success, data: { summary, projects } } or { data: { summary, projects } }
  const payload = response.data ?? response;
  const data = (payload && typeof payload === 'object' && payload.data) ? payload.data : payload;

  return {
    summary: (data && data.summary) || null,
    projects: Array.isArray(data?.projects) ? data.projects : []
  };
};

const clientWalletService = {
  async getSummary() {
    const response = await apiRequest(`${BASE_URL}/summary`);
    return normalizeSummaryResponse(response);
  },

  async getTransactions(params = {}) {
    const query = buildQueryString(params);
    const response = await apiRequest(`${BASE_URL}/transactions${query}`);
    return response;
  },

  async getUpcomingPayments(params = {}) {
    const query = buildQueryString(params);
    const response = await apiRequest(`${BASE_URL}/upcoming${query}`);
    return response.data;
  },

  async getOverdueInstallmentsCount() {
    const response = await apiRequest(`${BASE_URL}/overdue-count`);
    return response.data || { count: 0, totalAmount: 0, hasOverdue: false };
  }
};

export default clientWalletService;

