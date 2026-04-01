import { apiRequest } from './baseApiService';

const API_BASE_URL = '/milestones';

export const milestoneService = {
  // Create a new milestone
  createMilestone: async (milestoneData) => {
    try {
      const response = await apiRequest(API_BASE_URL, {
        method: 'POST',
        body: JSON.stringify(milestoneData)
      });
      return response.data; // Return just the data
    } catch (error) {
      throw error;
    }
  },

  // Get milestones by project
  getMilestonesByProject: async (projectId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/project/${projectId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get milestone by ID
  getMilestoneById: async (milestoneId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${milestoneId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update milestone
  updateMilestone: async (milestoneId, milestoneData) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${milestoneId}`, {
        method: 'PUT',
        body: JSON.stringify(milestoneData)
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete milestone
  deleteMilestone: async (milestoneId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${milestoneId}`, {
        method: 'DELETE'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update milestone progress
  updateMilestoneProgress: async (milestoneId, progress) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${milestoneId}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({
        progress
      })
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Upload milestone attachment
  uploadMilestoneAttachment: async (milestoneId, file) => {
    try {
      const formData = new FormData();
      formData.append('attachment', file);

      const response = await apiRequest(
        `${API_BASE_URL}/${milestoneId}/attachments`, {
        method: 'POST',
        body: formData
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Remove milestone attachment
  removeMilestoneAttachment: async (milestoneId, attachmentId) => {
    try {
      const response = await apiRequest(
        `${API_BASE_URL}/${milestoneId}/attachments/${attachmentId}`
      , {
        method: 'DELETE'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get milestone statistics for a project
  // getMilestonesByProject returns the array directly (response.data from API)
  getMilestoneStatistics: async (projectId) => {
    try {
      const raw = await this.getMilestonesByProject(projectId);
      const list = Array.isArray(raw) ? raw : (raw?.data || []);

      const stats = {
        total: list.length,
        completed: 0,
        inProgress: 0,
        pending: 0,
        overdue: 0,
        avgProgress: 0
      };

      let totalProgress = 0;
      const now = new Date();

      list.forEach(milestone => {
        stats[milestone.status] = (stats[milestone.status] || 0) + 1;
        totalProgress += milestone.progress || 0;

        if (milestone.dueDate && new Date(milestone.dueDate) < now && milestone.status !== 'completed') {
          stats.overdue++;
        }
      });

      stats.avgProgress = stats.total > 0 ? Math.round(totalProgress / stats.total) : 0;

      return { success: true, data: stats };
    } catch (error) {
      throw error;
    }
  },

  // Get upcoming milestones
  getUpcomingMilestones: async (projectId, days = 7) => {
    try {
      const raw = await this.getMilestonesByProject(projectId);
      const list = Array.isArray(raw) ? raw : (raw?.data || []);
      const now = new Date();
      const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

      const upcoming = list.filter(milestone => {
        const dueDate = new Date(milestone.dueDate);
        return dueDate >= now && dueDate <= futureDate && milestone.status !== 'completed';
      });

      return { success: true, data: upcoming };
    } catch (error) {
      throw error;
    }
  },

  // Get overdue milestones
  getOverdueMilestones: async (projectId) => {
    try {
      const raw = await this.getMilestonesByProject(projectId);
      const list = Array.isArray(raw) ? raw : (raw?.data || []);
      const now = new Date();

      const overdue = list.filter(milestone => {
        const dueDate = new Date(milestone.dueDate);
        return dueDate < now && milestone.status !== 'completed';
      });

      return { success: true, data: overdue };
    } catch (error) {
      throw error;
    }
  }
};
