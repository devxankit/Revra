import { apiRequest } from './employeeBaseApiService';

const API_BASE_URL = '/requests';

class EmployeeRequestService {
  // Create a new request
  async createRequest(requestData) {
    try {
      const response = await apiRequest(API_BASE_URL, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
      return response;
    } catch (error) {
      console.error('Error creating request:', error);
      throw error;
    }
  }

  // Get requests with filters
  async getRequests(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.direction) queryParams.append('direction', params.direction);
      if (params.module) queryParams.append('module', params.module);
      if (params.type) queryParams.append('type', params.type);
      if (params.status) queryParams.append('status', params.status);
      if (params.priority) queryParams.append('priority', params.priority);
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);

      const url = `${API_BASE_URL}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiRequest(url);
      return response;
    } catch (error) {
      console.error('Error fetching requests:', error);
      throw error;
    }
  }

  // Get request by ID
  async getRequestById(requestId) {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${requestId}`);
      return response;
    } catch (error) {
      console.error('Error fetching request:', error);
      throw error;
    }
  }

  // Respond to request
  async respondToRequest(requestId, responseType, message) {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${requestId}/respond`, {
        method: 'POST',
        body: JSON.stringify({
          responseType,
          message
        })
      });
      return response;
    } catch (error) {
      console.error('Error responding to request:', error);
      throw error;
    }
  }

  // Update request
  async updateRequest(requestId, updateData) {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      return response;
    } catch (error) {
      console.error('Error updating request:', error);
      throw error;
    }
  }

  // Delete request
  async deleteRequest(requestId) {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${requestId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Error deleting request:', error);
      throw error;
    }
  }

  // Get request statistics
  async getStatistics(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.direction) queryParams.append('direction', params.direction);

      const url = `${API_BASE_URL}/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiRequest(url);
      return response;
    } catch (error) {
      console.error('Error fetching request statistics:', error);
      throw error;
    }
  }

  // Get available recipients by type
  async getRecipients(recipientType) {
    try {
      const response = await apiRequest(`${API_BASE_URL}/recipients?type=${recipientType}`);
      return response;
    } catch (error) {
      console.error('Error fetching recipients:', error);
      throw error;
    }
  }
}

export default new EmployeeRequestService();

