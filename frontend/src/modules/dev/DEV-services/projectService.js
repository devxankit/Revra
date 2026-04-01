import { apiRequest } from './baseApiService';

const API_BASE_URL = '/projects';

export const projectService = {
  // Create a new project
  createProject: async (projectData) => {
    try {
      const response = await apiRequest(API_BASE_URL, {
        method: 'POST',
        body: JSON.stringify(projectData)
      });
      return response; // Return full response object
    } catch (error) {
      throw error;
    }
  },

  // Get all projects with optional filters
  getAllProjects: async (filters = {}) => {
    try {
      const params = new URLSearchParams();

      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.client) params.append('client', filters.client);
      if (filters.projectManager) params.append('projectManager', filters.projectManager);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const queryString = params.toString();
      const url = queryString ? `${API_BASE_URL}?${queryString}` : API_BASE_URL;

      const response = await apiRequest(url);
      return response; // Return full response object
    } catch (error) {
      throw error;
    }
  },

  // Get project by ID
  getProjectById: async (projectId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}`);
      return response; // Return full response object
    } catch (error) {
      throw error;
    }
  },

  // Update project
  updateProject: async (projectId, projectData) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(projectData)
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete project
  deleteProject: async (projectId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}`, {
        method: 'DELETE'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get projects by client
  getProjectsByClient: async (clientId, filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const queryString = params.toString();
      const url = queryString
        ? `${API_BASE_URL}/client/${clientId}?${queryString}`
        : `${API_BASE_URL}/client/${clientId}`;

      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get projects by PM
  getProjectsByPM: async (pmId, filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const queryString = params.toString();
      const url = queryString
        ? `${API_BASE_URL}/pm/${pmId}?${queryString}`
        : `${API_BASE_URL}/pm/${pmId}`;

      const response = await apiRequest(url);
      return response; // Return full response object
    } catch (error) {
      throw error;
    }
  },

  // Get project statistics
  getProjectStatistics: async () => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/statistics`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Upload project attachment
  uploadProjectAttachment: async (projectId, file) => {
    try {
      const formData = new FormData();
      formData.append('attachment', file);

      const response = await apiRequest(`${API_BASE_URL}/${projectId}/attachments`, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type for FormData, let browser set it with boundary
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Remove project attachment
  removeProjectAttachment: async (projectId, attachmentId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}/attachments/${attachmentId}`, {
        method: 'DELETE'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Search projects
  searchProjects: async (searchTerm, filters = {}) => {
    try {
      const params = new URLSearchParams();
      params.append('search', searchTerm);

      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const queryString = params.toString();
      const response = await apiRequest(`${API_BASE_URL}?${queryString}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get recent projects
  getRecentProjects: async (limit = 5) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}?limit=${limit}&sortBy=createdAt&sortOrder=desc`);
      return response; // Return full response object
    } catch (error) {
      throw error;
    }
  },

  // Get overdue projects
  getOverdueProjects: async () => {
    try {
      const response = await apiRequest(`${API_BASE_URL}?overdue=true`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update project revision status
  updateProjectRevisionStatus: async (projectId, revisionType, statusData) => {
    try {

      const response = await apiRequest(`${API_BASE_URL}/${projectId}/revisions/${revisionType}`, {
        method: 'PATCH',
        body: JSON.stringify(statusData)
      });
      return response.data;
    } catch (error) {
      console.error('Project service error:', error);
      throw error;
    }
  },

  // Get project team members
  getProjectTeamMembers: async (projectId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}/team`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get project credentials (created in admin expense management, read-only for PM)
  getProjectCredentials: async (projectId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}/credentials`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // PM New Projects functionality
  // Get new projects assigned to PM
  getNewProjects: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();

      if (params.status) queryParams.append('status', params.status);
      if (params.priority) queryParams.append('priority', params.priority);
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);

      const response = await apiRequest(`/pm/new-projects?${queryParams}`);
      return response;
    } catch (error) {
      console.error('Error fetching new projects:', error);
      throw error;
    }
  },

  // Update meeting status for a project
  updateMeetingStatus: async (projectId, meetingStatus) => {
    try {
      const response = await apiRequest(`/pm/projects/${projectId}/meeting-status`, {
        method: 'PATCH',
        body: JSON.stringify({ meetingStatus })
      });
      return response;
    } catch (error) {
      console.error('Error updating meeting status:', error);
      throw error;
    }
  },

  // Start a project (convert untouched → started)
  startProject: async (projectId) => {
    try {
      const response = await apiRequest(`/pm/projects/${projectId}/start`, {
        method: 'PATCH'
      });
      return response;
    } catch (error) {
      console.error('Error starting project:', error);
      throw error;
    }
  },

  // Activate a project (convert started → active with full details)
  activateProject: async (projectId, projectData) => {
    try {
      const response = await apiRequest(`/pm/projects/${projectId}/activate`, {
        method: 'PATCH',
        body: JSON.stringify(projectData)
      });
      return response;
    } catch (error) {
      console.error('Error activating project:', error);
      throw error;
    }
  },

  // Get project categories (LeadCategories)
  getCategories: async () => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/meta/categories`);
      return response;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }
};
