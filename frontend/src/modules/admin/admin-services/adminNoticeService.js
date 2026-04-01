import { apiRequest } from './baseApiService';

class AdminNoticeService {
  // Get all notices with filtering
  async getAllNotices(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add query parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const url = `/admin/notices${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await apiRequest(url, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching notices:', error);
      throw error;
    }
  }

  // Get single notice by ID
  async getNoticeById(id) {
    try {
      const response = await apiRequest(`/admin/notices/${id}`, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching notice:', error);
      throw error;
    }
  }

  // Create new notice
  async createNotice(noticeData) {
    try {
      const formData = new FormData();
      
      // Add text fields
      formData.append('title', noticeData.title);
      formData.append('content', noticeData.content);
      formData.append('type', noticeData.type || 'text');
      formData.append('priority', noticeData.priority || 'medium');
      formData.append('targetAudience', noticeData.targetAudience || 'all');
      formData.append('status', noticeData.status || 'published');
      formData.append('isPinned', noticeData.isPinned || false);

      // Handle file upload - send file directly to backend, backend will upload to Cloudinary
      // Note: Backend expects 'file' field for multer
      if (noticeData.type === 'image' && noticeData.imageFile instanceof File) {
        formData.append('file', noticeData.imageFile);
      } else if (noticeData.type === 'video' && noticeData.videoFile instanceof File) {
        formData.append('file', noticeData.videoFile);
      }

      const response = await apiRequest(`/admin/notices`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type - let browser set it with boundary for FormData
      });
      return response;
    } catch (error) {
      console.error('Error creating notice:', error);
      throw error;
    }
  }

  // Update notice
  async updateNotice(id, noticeData) {
    try {
      const formData = new FormData();
      
      // Add text fields
      if (noticeData.title !== undefined) formData.append('title', noticeData.title);
      if (noticeData.content !== undefined) formData.append('content', noticeData.content);
      if (noticeData.type !== undefined) formData.append('type', noticeData.type);
      if (noticeData.priority !== undefined) formData.append('priority', noticeData.priority);
      if (noticeData.targetAudience !== undefined) formData.append('targetAudience', noticeData.targetAudience);
      if (noticeData.status !== undefined) formData.append('status', noticeData.status);
      if (noticeData.isPinned !== undefined) formData.append('isPinned', noticeData.isPinned);

      // Handle file upload - send file directly to backend, backend will upload to Cloudinary
      // Note: Backend expects 'file' field for multer
      if (noticeData.type === 'image' && noticeData.imageFile instanceof File) {
        formData.append('file', noticeData.imageFile);
      } else if (noticeData.type === 'video' && noticeData.videoFile instanceof File) {
        formData.append('file', noticeData.videoFile);
      }

      const response = await apiRequest(`/admin/notices/${id}`, {
        method: 'PUT',
        body: formData,
        // Don't set Content-Type - let browser set it with boundary for FormData
      });
      return response;
    } catch (error) {
      console.error('Error updating notice:', error);
      throw error;
    }
  }

  // Delete notice
  async deleteNotice(id) {
    try {
      const response = await apiRequest(`/admin/notices/${id}`, { method: 'DELETE' });
      return response;
    } catch (error) {
      console.error('Error deleting notice:', error);
      throw error;
    }
  }

  // Toggle pin notice
  async togglePinNotice(id) {
    try {
      const response = await apiRequest(`/admin/notices/${id}/pin`, { method: 'PATCH' });
      return response;
    } catch (error) {
      console.error('Error toggling pin notice:', error);
      throw error;
    }
  }

  // Get notice statistics
  async getNoticeStatistics() {
    try {
      const response = await apiRequest(`/admin/notices/statistics`, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching notice statistics:', error);
      throw error;
    }
  }

  // Increment notice views
  async incrementNoticeViews(id) {
    try {
      const response = await apiRequest(`/admin/notices/${id}/view`, { method: 'POST' });
      return response;
    } catch (error) {
      console.error('Error incrementing notice views:', error);
      throw error;
    }
  }
}

export default new AdminNoticeService();
