import { apiRequest } from './baseApiService';

// Admin Project Credential Service
export const adminProjectCredentialService = {
  // Get all credentials
  getAllCredentials: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/admin/project-credentials?${queryString}` : '/admin/project-credentials';
      
      const response = await apiRequest(url, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get projects with expenses
  getProjectsWithExpenses: async () => {
    try {
      const response = await apiRequest('/admin/project-credentials/projects-with-expenses', {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get credentials by project ID
  getCredentialsByProject: async (projectId) => {
    try {
      const response = await apiRequest(`/admin/project-credentials/project/${projectId}`, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get credential by ID
  getCredentialById: async (credentialId) => {
    try {
      const response = await apiRequest(`/admin/project-credentials/${credentialId}`, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create credential
  createCredential: async (credentialData) => {
    try {
      const response = await apiRequest('/admin/project-credentials', {
        method: 'POST',
        body: JSON.stringify(credentialData)
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update credential
  updateCredential: async (credentialId, credentialData) => {
    try {
      const response = await apiRequest(`/admin/project-credentials/${credentialId}`, {
        method: 'PUT',
        body: JSON.stringify(credentialData)
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete credential
  deleteCredential: async (credentialId) => {
    try {
      const response = await apiRequest(`/admin/project-credentials/${credentialId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default adminProjectCredentialService;
