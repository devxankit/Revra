import { apiRequest } from './clientBaseApiService';

const API_BASE_URL = '/client/projects';

export const clientProjectService = {
  // Get client's projects (automatically filters by authenticated client from token)
  // clientId parameter is optional and ignored - backend uses authenticated client from token
  getProjectsByClient: async (clientId = null, filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const queryString = params.toString();
      const url = queryString ? `${API_BASE_URL}?${queryString}` : API_BASE_URL;
      
      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get project by ID (client can only access their own projects)
  getProjectById: async (projectId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get milestones for a specific project
  getProjectMilestones: async (projectId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}/milestones`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get tasks for a specific project
  getProjectTasks: async (projectId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}/tasks`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get recent projects (automatically filters by authenticated client)
  getRecentProjects: async (limit = 5) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get client project statistics
  getClientProjectStatistics: async () => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/statistics`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

