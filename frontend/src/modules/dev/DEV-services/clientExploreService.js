import { apiRequest } from './clientBaseApiService';

const BASE_URL = '/client/explore';

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.append(key, value);
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

const clientExploreService = {
  async getCatalog(params = {}) {
    const query = buildQueryString(params);
    const response = await apiRequest(`${BASE_URL}${query}`);
    return response.data;
  },

  async createServiceRequest(payload) {
    const response = await apiRequest(`${BASE_URL}/request`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return response;
  }
};

export default clientExploreService;

