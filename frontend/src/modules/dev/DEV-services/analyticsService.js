import { apiRequest } from './baseApiService';

const API_BASE_URL = '/analytics';

export const analyticsService = {
  // Get PM dashboard statistics
  getPMDashboardStats: async () => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/pm/dashboard`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get project analytics
  getProjectAnalytics: async (projectId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/project/${projectId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get employee performance
  getEmployeePerformance: async (employeeId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/employee/${employeeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get client project statistics
  getClientProjectStats: async (clientId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/client/${clientId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get overall project statistics
  getOverallProjectStats: async () => {
    try {
      const response = await apiRequest('/projects/statistics');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get overall payment statistics
  getOverallPaymentStats: async () => {
    try {
      const response = await apiRequest('/payments/statistics');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get team performance metrics
  getTeamPerformanceMetrics: async (projectId = null) => {
    try {
      let url = `${API_BASE_URL}/team/performance`;
      if (projectId) {
        url += `?projectId=${projectId}`;
      }
      
      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      // Fallback to calculating from available data
      try {
        const dashboardStats = await this.getPMDashboardStats();
        return {
          success: true,
          data: {
            teamPerformance: dashboardStats.data.teamPerformance || [],
            topPerformers: dashboardStats.data.teamPerformance?.slice(0, 5) || []
          }
        };
      } catch (fallbackError) {
        throw error;
      }
    }
  },

  // Get project timeline analytics
  getProjectTimelineAnalytics: async (projectId) => {
    try {
      const projectAnalytics = await this.getProjectAnalytics(projectId);
      return {
        success: true,
        data: {
          timeline: projectAnalytics.data.projectTimeline || [],
          milestones: projectAnalytics.data.milestones || {},
          tasks: projectAnalytics.data.tasks || {}
        }
      };
    } catch (error) {
      throw error;
    }
  },

  // Get project growth analytics (monthly data)
  getProjectGrowthAnalytics: async () => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/pm/project-growth`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get productivity metrics
  getProductivityMetrics: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.projectId) params.append('projectId', filters.projectId);

      const queryString = params.toString();
      const url = queryString ? `${API_BASE_URL}/productivity?${queryString}` : `${API_BASE_URL}/productivity`;
      
      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      // Fallback to calculating from dashboard stats
      try {
        const dashboardStats = await analyticsService.getPMDashboardStats();
        return {
          success: true,
          data: {
            totalTasks: dashboardStats.data.tasks?.total || 0,
            completedTasks: dashboardStats.data.tasks?.completed || 0,
            completionRate: dashboardStats.data.tasks?.completionRate || 0,
            urgentTasks: dashboardStats.data.tasks?.urgent || 0,
            overdueTasks: dashboardStats.data.tasks?.overdue || 0
          }
        };
      } catch (fallbackError) {
        throw error;
      }
    }
  },

  // Get financial analytics
  getFinancialAnalytics: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.clientId) params.append('clientId', filters.clientId);

      const queryString = params.toString();
      const url = queryString ? `${API_BASE_URL}/financial?${queryString}` : `${API_BASE_URL}/financial`;
      
      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      // Fallback to payment statistics
      try {
        const paymentStats = await this.getOverallPaymentStats();
        return {
          success: true,
          data: {
            totalRevenue: paymentStats.data.total?.totalAmount || 0,
            pendingPayments: paymentStats.data.byStatus?.pending?.totalAmount || 0,
            completedPayments: paymentStats.data.byStatus?.completed?.totalAmount || 0,
            paymentBreakdown: paymentStats.data.byType || {}
          }
        };
      } catch (fallbackError) {
        throw error;
      }
    }
  },

  // Get client satisfaction metrics
  getClientSatisfactionMetrics: async (clientId = null) => {
    try {
      let url = `${API_BASE_URL}/client-satisfaction`;
      if (clientId) {
        url += `?clientId=${clientId}`;
      }
      
      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      // Fallback to client project stats
      try {
        if (clientId) {
          const clientStats = await this.getClientProjectStats(clientId);
          return {
            success: true,
            data: {
              totalProjects: clientStats.data.projects?.total || 0,
              completedProjects: clientStats.data.projects?.completed || 0,
              activeProjects: clientStats.data.projects?.active || 0,
              avgProgress: clientStats.data.projects?.avgProgress || 0,
              satisfactionScore: 85 // Default score
            }
          };
        } else {
          return {
            success: true,
            data: {
              avgSatisfactionScore: 85,
              totalClients: 0,
              satisfiedClients: 0
            }
          };
        }
      } catch (fallbackError) {
        throw error;
      }
    }
  },

  // Get resource utilization metrics
  getResourceUtilizationMetrics: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.employeeId) params.append('employeeId', filters.employeeId);

      const queryString = params.toString();
      const url = queryString ? `${API_BASE_URL}/resource-utilization?${queryString}` : `${API_BASE_URL}/resource-utilization`;
      
      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      // Fallback to team performance
      try {
        const teamMetrics = await this.getTeamPerformanceMetrics();
        return {
          success: true,
          data: {
            teamUtilization: teamMetrics.data.teamPerformance || [],
            avgUtilization: 75, // Default value
            topUtilized: teamMetrics.data.topPerformers || []
          }
        };
      } catch (fallbackError) {
        throw error;
      }
    }
  },

  // Get project health score
  getProjectHealthScore: async (projectId) => {
    try {
      const projectAnalytics = await this.getProjectAnalytics(projectId);
      const project = projectAnalytics.data.project;
      
      let healthScore = 100;
      
      // Deduct points for overdue status
      if (project.isOverdue) {
        healthScore -= 20;
      }
      
      // Deduct points for low progress (safe number: backend may send undefined)
      const progress = Number(project.progress) || 0;
      if (progress < 25) {
        healthScore -= 15;
      } else if (progress < 50) {
        healthScore -= 10;
      } else if (progress < 75) {
        healthScore -= 5;
      }
      
      // Deduct points for overdue tasks
      const overdueTasks = projectAnalytics.data.tasks?.overdue || 0;
      healthScore -= Math.min(overdueTasks * 2, 20);
      
      // Deduct points for overdue milestones
      const overdueMilestones = projectAnalytics.data.milestones?.overdue || 0;
      healthScore -= Math.min(overdueMilestones * 5, 15);
      
      healthScore = Math.max(healthScore, 0);
      
      return {
        success: true,
        data: {
          healthScore,
          status: healthScore >= 80 ? 'excellent' : healthScore >= 60 ? 'good' : healthScore >= 40 ? 'fair' : 'poor',
          factors: {
            isOverdue: project.isOverdue,
            progress,
            overdueTasks,
            overdueMilestones
          }
        }
      };
    } catch (error) {
      throw error;
    }
  }
};
