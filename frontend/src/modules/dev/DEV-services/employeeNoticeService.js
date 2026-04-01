import { apiRequest } from './employeeBaseApiService';

class EmployeeNoticeService {
  async getNotices(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });
      const url = `/employee/notices${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiRequest(url, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching employee notices:', error);
      throw error;
    }
  }

  async incrementNoticeViews(id) {
    try {
      const response = await apiRequest(`/employee/notices/${id}/view`, { method: 'POST' });
      return response;
    } catch (error) {
      console.error('Error incrementing employee notice views:', error);
      throw error;
    }
  }
}

export default new EmployeeNoticeService();

