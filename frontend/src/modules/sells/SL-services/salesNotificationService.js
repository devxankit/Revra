import { apiRequest } from './baseApiService';

const BASE_URL = '/sales/notifications';

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.append(key, value);
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

const salesNotificationService = {
  async getNotifications(params = {}) {
    const query = buildQueryString(params);
    const response = await apiRequest(`${BASE_URL}${query}`, { method: 'GET' });
    return response.data || response;
  }
};

export default salesNotificationService;
