import { apiRequest } from './baseApiService';

const API_BASE_URL = '/tasks';

export const urgentTaskService = {
  // Create a new urgent task
  createUrgentTask: async (taskData) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/urgent`, {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get all urgent tasks for authenticated PM
  getUrgentTasks: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.project) params.append('project', filters.project);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      
      const queryString = params.toString();
      const url = queryString ? `${API_BASE_URL}/urgent?${queryString}` : `${API_BASE_URL}/urgent`;
      
      const response = await apiRequest(url);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get urgent task by ID (verifies it's urgent)
  getUrgentTaskById: async (taskId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${taskId}`);
      const task = response.data;
      
      // Verify this is an urgent task
      if (!task.isUrgent && task.priority !== 'urgent') {
        throw new Error('Task is not marked as urgent');
      }
      
      return task;
    } catch (error) {
      console.error('Error getting urgent task by ID:', error);
      throw error;
    }
  },

  // Update urgent task
  updateUrgentTask: async (taskId, taskData) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(taskData)
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete urgent task
  deleteUrgentTask: async (taskId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${taskId}`, {
        method: 'DELETE'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update urgent task status
  updateUrgentTaskStatus: async (taskId, status) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status
        })
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Assign/reassign urgent task
  assignUrgentTask: async (taskId, assignedTo) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${taskId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({
          assignedTo
        })
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add comment to urgent task
  addUrgentTaskComment: async (taskId, message) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          message
        })
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Upload urgent task attachment
  uploadUrgentTaskAttachment: async (taskId, file) => {
    try {
      const formData = new FormData();
      formData.append('attachment', file);

      const response = await apiRequest(
        `${API_BASE_URL}/${taskId}/attachments`, {
        method: 'POST',
        body: formData
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Remove urgent task attachment
  removeUrgentTaskAttachment: async (taskId, attachmentId) => {
    try {
      const response = await apiRequest(
        `${API_BASE_URL}/${taskId}/attachments/${attachmentId}`
      , {
        method: 'DELETE'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get urgent task statistics
  getUrgentTaskStatistics: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.project) params.append('project', filters.project);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      
      const queryString = params.toString();
      const url = queryString ? `${API_BASE_URL}/urgent?${queryString}` : `${API_BASE_URL}/urgent`;
      
      const response = await apiRequest(url);
      const tasks = response.data || [];

      const stats = {
        total: tasks.length,
        pending: 0,
        inProgress: 0,
        testing: 0,
        completed: 0,
        cancelled: 0,
        overdue: 0,
        completionRate: 0
      };

      const now = new Date();
      let completedCount = 0;

      tasks.forEach(task => {
        stats[task.status] = (stats[task.status] || 0) + 1;
        
        if (task.dueDate && new Date(task.dueDate) < now && task.status !== 'completed') {
          stats.overdue++;
        }
        
        if (task.status === 'completed') {
          completedCount++;
        }
      });

      stats.completionRate = stats.total > 0 ? Math.round((completedCount / stats.total) * 100) : 0;

      return { success: true, data: stats };
    } catch (error) {
      throw error;
    }
  },

  // Get overdue urgent tasks
  getOverdueUrgentTasks: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.project) params.append('project', filters.project);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      
      const queryString = params.toString();
      const url = queryString ? `${API_BASE_URL}/urgent?${queryString}` : `${API_BASE_URL}/urgent`;
      
      const response = await apiRequest(url);
      const tasks = response.data || [];

      const now = new Date();
      const overdue = tasks.filter(task => {
        return task.dueDate && new Date(task.dueDate) < now && task.status !== 'completed';
      });

      return { success: true, data: overdue };
    } catch (error) {
      throw error;
    }
  },

  // Get upcoming urgent tasks
  getUpcomingUrgentTasks: async (filters = {}, days = 7) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.project) params.append('project', filters.project);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      
      const queryString = params.toString();
      const url = queryString ? `${API_BASE_URL}/urgent?${queryString}` : `${API_BASE_URL}/urgent`;
      
      const response = await apiRequest(url);
      const tasks = response.data || [];

      const now = new Date();
      const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

      const upcoming = tasks.filter(task => {
        const dueDate = new Date(task.dueDate);
        return dueDate >= now && dueDate <= futureDate && task.status !== 'completed';
      });

      return { success: true, data: upcoming };
    } catch (error) {
      throw error;
    }
  },

  // Mark urgent task as complete
  markUrgentTaskComplete: async (taskId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'completed'
        })
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get urgent task comments
  getUrgentTaskComments: async (taskId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${taskId}`);
      const task = response.data;
      
      // Verify this is an urgent task
      if (!task.isUrgent) {
        throw new Error('Task is not marked as urgent');
      }
      
      return { success: true, data: task.comments || [] };
    } catch (error) {
      throw error;
    }
  }
};
