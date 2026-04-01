import { apiRequest } from './clientBaseApiService';

const API_BASE_URL = '/client/milestones';

export const clientMilestoneService = {
  // Get milestone by ID (clients can access milestones from their projects)
  getMilestoneById: async (milestoneId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${milestoneId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

