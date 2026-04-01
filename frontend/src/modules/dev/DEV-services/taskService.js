import { apiRequest } from './baseApiService';

const API_BASE_URL = '/tasks';

export const taskService = {
  // Create a new task
  createTask: async (taskData) => {
    try {
      const response = await apiRequest(API_BASE_URL, {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create an urgent task
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

  // Get tasks by milestone
  getTasksByMilestone: async (milestoneId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/milestone/${milestoneId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get tasks by project
  getTasksByProject: async (projectId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/project/${projectId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get tasks by employee
  getTasksByEmployee: async (employeeId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/employee/${employeeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get urgent tasks
  getUrgentTasks: async () => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/urgent`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get task by ID
  getTaskById: async (taskId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${taskId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get all tasks for authenticated PM
  getAllTasks: async (filters = {}) => {
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
      const url = queryString ? `${API_BASE_URL}?${queryString}` : API_BASE_URL;
      
      const response = await apiRequest(url);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update task
  updateTask: async (taskId, taskData) => {
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

  // Delete task
  deleteTask: async (taskId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${taskId}`, {
        method: 'DELETE'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update task status
  updateTaskStatus: async (taskId, status) => {
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

  // Assign/reassign task
  assignTask: async (taskId, assignedTo) => {
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

  // Add comment to task
  addTaskComment: async (taskId, message) => {
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

  // Upload task attachment
  uploadTaskAttachment: async (taskId, file) => {
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

  // Remove task attachment
  removeTaskAttachment: async (taskId, attachmentId) => {
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

  // Get task statistics
  getTaskStatistics: async (filters = {}) => {
    try {
      let tasks = [];
      
      if (filters.projectId) {
        const response = await this.getTasksByProject(filters.projectId);
        tasks = response.data;
      } else if (filters.milestoneId) {
        const response = await this.getTasksByMilestone(filters.milestoneId);
        tasks = response.data;
      } else if (filters.employeeId) {
        const response = await this.getTasksByEmployee(filters.employeeId);
        tasks = response.data;
      }

      const stats = {
        total: tasks.length,
        pending: 0,
        inProgress: 0,
        testing: 0,
        completed: 0,
        cancelled: 0,
        urgent: 0,
        overdue: 0,
        completionRate: 0
      };

      const now = new Date();
      let completedCount = 0;

      tasks.forEach(task => {
        stats[task.status] = (stats[task.status] || 0) + 1;
        
        if (task.isUrgent) {
          stats.urgent++;
        }
        
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

  // Get overdue tasks
  getOverdueTasks: async (filters = {}) => {
    try {
      let tasks = [];
      
      if (filters.projectId) {
        const response = await this.getTasksByProject(filters.projectId);
        tasks = response.data;
      } else if (filters.milestoneId) {
        const response = await this.getTasksByMilestone(filters.milestoneId);
        tasks = response.data;
      } else if (filters.employeeId) {
        const response = await this.getTasksByEmployee(filters.employeeId);
        tasks = response.data;
      }

      const now = new Date();
      const overdue = tasks.filter(task => {
        return task.dueDate && new Date(task.dueDate) < now && task.status !== 'completed';
      });

      return { success: true, data: overdue };
    } catch (error) {
      throw error;
    }
  },

  // Get upcoming tasks
  getUpcomingTasks: async (filters = {}, days = 7) => {
    try {
      let tasks = [];
      
      if (filters.projectId) {
        const response = await this.getTasksByProject(filters.projectId);
        tasks = response.data;
      } else if (filters.milestoneId) {
        const response = await this.getTasksByMilestone(filters.milestoneId);
        tasks = response.data;
      } else if (filters.employeeId) {
        const response = await this.getTasksByEmployee(filters.employeeId);
        tasks = response.data;
      }

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

  // Mark task as complete
  markTaskComplete: async (taskId) => {
    try {
      const response = await this.updateTaskStatus(taskId, 'completed');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get task comments
  getTaskComments: async (taskId) => {
    try {
      const response = await this.getTaskById(taskId);
      return { success: true, data: response.data.comments || [] };
    } catch (error) {
      throw error;
    }
  }
};
