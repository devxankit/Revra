import { apiRequest } from './baseApiService';

class AdminClientTagService {
  // Get all client tags
  async getAllTags(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const url = `/admin/client-tags${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await apiRequest(url, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching tags:', error);
      throw error;
    }
  }

  // Get single tag by ID
  async getTag(id) {
    try {
      const response = await apiRequest(`/admin/client-tags/${id}`, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching tag:', error);
      throw error;
    }
  }

  // Create new tag
  async createTag(tagData) {
    try {
      const response = await apiRequest('/admin/client-tags', {
        method: 'POST',
        body: JSON.stringify(tagData)
      });
      return response;
    } catch (error) {
      console.error('Error creating tag:', error);
      throw error;
    }
  }

  // Update tag
  async updateTag(id, tagData) {
    try {
      const response = await apiRequest(`/admin/client-tags/${id}`, {
        method: 'PUT',
        body: JSON.stringify(tagData)
      });
      return response;
    } catch (error) {
      console.error('Error updating tag:', error);
      throw error;
    }
  }

  // Delete tag
  async deleteTag(id) {
    try {
      const response = await apiRequest(`/admin/client-tags/${id}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  }
}

const adminClientTagService = new AdminClientTagService();
export default adminClientTagService;
