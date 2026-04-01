import { apiRequest } from './employeeBaseApiService';

const BASE_URL = '/employee/notifications';

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.append(key, value);
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

const employeeNotificationService = {
  async getNotifications(params = {}) {
    const query = buildQueryString(params);
    const response = await apiRequest(`${BASE_URL}${query}`);
    return response.data;
  }
};

export default employeeNotificationService;

