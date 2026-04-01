import { apiRequest } from './baseApiService';

class SalesNoticeService {
  // Get all published notices for sales team
  async getNotices(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add query parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const url = `/sales/notices${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await apiRequest(url, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching notices:', error);
      throw error;
    }
  }

  // Increment notice views
  async incrementNoticeViews(id) {
    try {
      const response = await apiRequest(`/sales/notices/${id}/view`, { method: 'POST' });
      return response;
    } catch (error) {
      console.error('Error incrementing notice views:', error);
      throw error;
    }
  }
}

export default new SalesNoticeService();

