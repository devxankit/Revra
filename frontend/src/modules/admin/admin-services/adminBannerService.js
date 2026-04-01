import { apiRequest } from './baseApiService';

class AdminBannerService {
  async getBanners() {
    const response = await apiRequest('/admin/client-banners', { method: 'GET' });
    return response;
  }

  async createBanner(data) {
    const response = await apiRequest('/admin/client-banners', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response;
  }

  async updateBanner(id, data) {
    const response = await apiRequest(`/admin/client-banners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response;
  }

  async deleteBanner(id) {
    const response = await apiRequest(`/admin/client-banners/${id}`, {
      method: 'DELETE'
    });
    return response;
  }

  async getSettings() {
    const response = await apiRequest('/admin/client-banners/settings', { method: 'GET' });
    return response;
  }

  async updateSettings(data) {
    const response = await apiRequest('/admin/client-banners/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response;
  }
}

const adminBannerService = new AdminBannerService();
export default adminBannerService;
