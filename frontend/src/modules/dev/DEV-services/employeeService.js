import { apiRequest, tokenUtils, employeeStorage } from './employeeBaseApiService';

// Employee Service - Following the same pattern as other services
const employeeService = {
  // Dashboard and Analytics (params.timeFilter: 'all' | 'today' | 'week' | 'month' | 'year')
  async getEmployeeDashboardStats(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `/employee/analytics/dashboard${queryString ? `?${queryString}` : ''}`;
      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
    }
  },

  async getEmployeePerformanceStats() {
    try {
      const response = await apiRequest('/employee/analytics/performance');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch performance stats: ${error.message}`);
    }
  },

  async getEmployeeLeaderboard(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `/employee/analytics/leaderboard${queryString ? `?${queryString}` : ''}`;
      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch leaderboard: ${error.message}`);
    }
  },

  async getEmployeePointsHistory(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `/employee/analytics/points-history${queryString ? `?${queryString}` : ''}`;
      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch points history: ${error.message}`);
    }
  },

  // Projects
  async getEmployeeProjects(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `/employee/projects${queryString ? `?${queryString}` : ''}`;
      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }
  },

  async getEmployeeProjectById(id) {
    try {
      const pid = (id != null && typeof id === 'object' && id._id != null) ? String(id._id) : String(id ?? '');
      const response = await apiRequest(`/employee/projects/${pid}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch project: ${error.message}`);
    }
  },

  async getEmployeeProjectMilestones(projectId) {
    try {
      const pid = (projectId != null && typeof projectId === 'object' && projectId._id != null) ? String(projectId._id) : String(projectId ?? '');
      const response = await apiRequest(`/employee/projects/${pid}/milestones`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch project milestones: ${error.message}`);
    }
  },

  async getProjectCredentials(projectId) {
    try {
      const pid = (projectId != null && typeof projectId === 'object' && projectId._id != null) ? String(projectId._id) : String(projectId ?? '');
      const response = await apiRequest(`/employee/projects/${pid}/credentials`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch project credentials: ${error.message}`);
    }
  },

  async getEmployeeProjectStatistics() {
    try {
      const response = await apiRequest('/employee/projects/statistics');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch project statistics: ${error.message}`);
    }
  },

  // Milestones
  async getEmployeeMilestoneById(id) {
    try {
      const response = await apiRequest(`/employee/milestones/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch milestone: ${error.message}`);
    }
  },

  async getEmployeeMilestoneTasks(milestoneId, params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `/employee/milestones/${milestoneId}/tasks${queryString ? `?${queryString}` : ''}`;
      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch milestone tasks: ${error.message}`);
    }
  },

  async addEmployeeMilestoneComment(milestoneId, message) {
    try {
      const response = await apiRequest(`/employee/milestones/${milestoneId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ message })
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to add milestone comment: ${error.message}`);
    }
  },

  // Tasks
  async getEmployeeTasks(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `/employee/tasks${queryString ? `?${queryString}` : ''}`;
      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }
  },

  async getEmployeeTaskById(id) {
    try {
      const response = await apiRequest(`/employee/tasks/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch task: ${error.message}`);
    }
  },

  async updateEmployeeTaskStatus(id, status, actualHours, comments) {
    try {
      const response = await apiRequest(`/employee/tasks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          actualHours,
          comments
        })
      });
      const updatedTask = response.data;
      return {
        ...updatedTask,
        pointsAwarded: response.pointsAwarded,
        pointsReason: response.pointsReason
      };
    } catch (error) {
      throw new Error(`Failed to update task status: ${error.message}`);
    }
  },

  async addEmployeeTaskComment(id, message) {
    try {
      const response = await apiRequest(`/employee/tasks/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ message })
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to add task comment: ${error.message}`);
    }
  },

  async getEmployeeUrgentTasks(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `/employee/tasks/urgent${queryString ? `?${queryString}` : ''}`;
      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch urgent tasks: ${error.message}`);
    }
  },

  async getEmployeeTaskStatistics() {
    try {
      const response = await apiRequest('/employee/tasks/statistics');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch task statistics: ${error.message}`);
    }
  },

  // File Uploads
  async uploadTaskAttachment(taskId, file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest(`/employee/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to upload attachment: ${error.message}`);
    }
  },

  async getTaskAttachments(taskId) {
    try {
      const response = await apiRequest(`/employee/tasks/${taskId}/attachments`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch task attachments: ${error.message}`);
    }
  },

  async deleteTaskAttachment(taskId, attachmentId) {
    try {
      const response = await apiRequest(`/employee/tasks/${taskId}/attachments/${attachmentId}`, {
        method: 'DELETE'
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete attachment: ${error.message}`);
    }
  },

  // Utility methods
  async downloadAttachment(attachmentUrl, filename) {
    try {
      const response = await fetch(attachmentUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(`Failed to download attachment: ${error.message}`);
    }
  },

  // Performance and Analytics helpers
  async getEmployeePerformance() {
    try {
      const response = await apiRequest('/employee/analytics/performance');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch employee performance: ${error.message}`);
    }
  },

  // Leaderboard helpers
  async getLeaderboardData(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `/employee/analytics/leaderboard${queryString ? `?${queryString}` : ''}`;
      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch leaderboard data: ${error.message}`);
    }
  },

  // Points history helpers
  async getPointsHistory(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `/employee/analytics/points-history${queryString ? `?${queryString}` : ''}`;
      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch points history: ${error.message}`);
    }
  },

  // My Team (for team leads only)
  async getMyTeam() {
    try {
      const response = await apiRequest('/employee/my-team');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // --- Team Lead: create task and upload attachments (uses employee token, hits main /api/tasks) ---
  async createTaskAsTeamLead(taskData) {
    try {
      const response = await apiRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: taskData.title,
          description: taskData.description || '',
          dueDate: taskData.dueDate,
          assignedTo: taskData.assignedTo ? [taskData.assignedTo] : [],
          status: taskData.status || 'pending',
          priority: taskData.priority || 'normal',
          milestone: taskData.milestone,
          project: taskData.project
        })
      });
      return response;
    } catch (error) {
      throw new Error(error.message || 'Failed to create task');
    }
  },

  async uploadTaskAttachmentToTask(taskId, file) {
    try {
      const formData = new FormData();
      formData.append('attachment', file);
      const response = await apiRequest(`/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData
      });
      return response;
    } catch (error) {
      throw new Error(error.message || 'Failed to upload attachment');
    }
  },

  async updateTaskAsTeamLead(taskId, taskData) {
    try {
      const response = await apiRequest(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: taskData.title,
          description: taskData.description,
          assignedTo: Array.isArray(taskData.assignedTo) ? taskData.assignedTo : (taskData.assignedTo ? [taskData.assignedTo] : []),
          priority: taskData.priority,
          dueDate: taskData.dueDate,
          estimatedHours: taskData.estimatedHours
        })
      });
      return response;
    } catch (error) {
      throw new Error(error.message || 'Failed to update task');
    }
  },

  async deleteTaskAsTeamLead(taskId) {
    try {
      await apiRequest(`/tasks/${taskId}`, { method: 'DELETE' });
    } catch (error) {
      throw new Error(error.message || 'Failed to delete task');
    }
  }
};

export default employeeService;
