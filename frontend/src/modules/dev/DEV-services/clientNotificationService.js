import { apiRequest } from './clientBaseApiService';

const BASE_URL = '/client/notifications';

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.append(key, value);
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

const clientNotificationService = {
  async getNotifications(params = {}) {
    const query = buildQueryString(params);
    const response = await apiRequest(`${BASE_URL}${query}`);
    return response.data;
  }
};

export default clientNotificationService;

