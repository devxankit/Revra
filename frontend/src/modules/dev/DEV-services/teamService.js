import { apiRequest } from './baseApiService';

export const teamService = {
  // Get all employees
  getAllEmployees: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.department) params.append('department', filters.department);
      if (filters.position) params.append('position', filters.position);
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const queryString = params.toString();
      const url = queryString ? `/pm/team/employees?${queryString}` : '/pm/team/employees';

      const response = await apiRequest(url);
      return response; // Return the full response object
    } catch (error) {
      throw error;
    }
  },

  // Get all clients
  getAllClients: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.companyName) params.append('companyName', filters.companyName);
      if (filters.industry) params.append('industry', filters.industry);
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const queryString = params.toString();
      const url = queryString ? `/pm/team/clients?${queryString}` : '/pm/team/clients';

      const response = await apiRequest(url);
      return response; // Return the full response object
    } catch (error) {
      throw error;
    }
  },

  // Get all PMs
  getAllPMs: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const queryString = params.toString();
      const url = queryString ? `/pm/team/members?${queryString}` : '/pm/team/members';

      const response = await apiRequest(url);
      return response; // Return the full response object
    } catch (error) {
      throw error;
    }
  },

  // Get employee by ID
  getEmployeeById: async (employeeId) => {
    try {
      const response = await apiRequest(`/api/admin/users/employee/${employeeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get client by ID
  getClientById: async (clientId) => {
    try {
      const response = await apiRequest(`/api/admin/users/client/${clientId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get PM by ID
  getPMById: async (pmId) => {
    try {
      const response = await apiRequest(`/api/admin/users/pm/${pmId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get team members for project assignment (Developer employees only)
  getTeamMembersForProject: async (projectId = null) => {
    try {
      const employees = await teamService.getAllEmployees({ isActive: true });

      // Filter for developer employees only and ensure data exists
      const availableEmployees = (employees?.data || []).filter(employee => {
        return employee.isActive && employee.team === 'developer';
      });

      return {
        success: true,
        data: availableEmployees.map(employee => ({
          _id: employee._id,
          name: employee.name,
          email: employee.email,
          position: employee.position,
          department: employee.department,
          skills: employee.skills || [],
          experience: employee.experience || 0
        }))
      };
    } catch (error) {
      console.error('Error getting team members for project:', error);
      throw error;
    }
  },

  // Get clients for project assignment
  getClientsForProject: async () => {
    try {
      const clients = await teamService.getAllClients({ isActive: true });

      return {
        success: true,
        data: (clients?.data || []).map(client => ({
          _id: client._id,
          name: client.name,
          email: client.email,
          companyName: client.companyName,
          industry: client.industry,
          phoneNumber: client.phoneNumber,
          category: client.category || client.originLead?.category?._id || client.originLead?.category
        }))
      };
    } catch (error) {
      console.error('Error getting clients for project:', error);
      throw error;
    }
  },

  // Get employees for task assignment (Developer employees only)
  getEmployeesForTask: async (projectId = null, milestoneId = null) => {
    try {
      let employees = [];

      if (milestoneId) {
        // Get employees assigned to the specific milestone
        const milestoneResponse = await apiRequest(`/milestones/${milestoneId}`);
        const milestone = milestoneResponse?.data;

        if (milestone && milestone.assignedTo && milestone.assignedTo.length > 0) {
          // Use employees assigned to the milestone
          employees = milestone.assignedTo;
        } else if (projectId) {
          // Fallback to project team if milestone has no assigned team
          const projectResponse = await apiRequest(`/projects/${projectId}`);
          const project = projectResponse?.data;

          if (project && project.assignedTeam && project.assignedTeam.length > 0) {
            const devEmployees = project.assignedTeam.filter(emp => emp.team === 'developer');
            employees = devEmployees;
          } else {
            // Final fallback to all active developer employees
            const allEmployees = await teamService.getAllEmployees({ isActive: true });
            employees = (allEmployees?.data || []).filter(emp => emp.team === 'developer');
          }
        } else {
          // Final fallback to all active developer employees
          const allEmployees = await teamService.getAllEmployees({ isActive: true });
          employees = (allEmployees?.data || []).filter(emp => emp.team === 'developer');
        }
      } else if (projectId) {
        // Get employees assigned to the project
        const projectResponse = await apiRequest(`/projects/${projectId}`);
        const project = projectResponse?.data;

        if (project && project.assignedTeam && project.assignedTeam.length > 0) {
          // Filter assigned team for developer employees only
          employees = project.assignedTeam.filter(emp => emp.team === 'developer');
        } else {
          // Fallback to all active developer employees
          const allEmployees = await teamService.getAllEmployees({ isActive: true });
          employees = (allEmployees?.data || []).filter(emp => emp.team === 'developer');
        }
      } else {
        // Get all active developer employees
        const allEmployees = await teamService.getAllEmployees({ isActive: true });
        employees = (allEmployees?.data || []).filter(emp => emp.team === 'developer');
      }

      return {
        success: true,
        data: employees.map(employee => ({
          _id: employee._id,
          name: employee.name,
          email: employee.email,
          position: employee.position,
          department: employee.department,
          skills: employee.skills || [],
          experience: employee.experience || 0
        }))
      };
    } catch (error) {
      console.error('Error getting employees for task:', error);
      throw error;
    }
  },

  // Get projects for task/milestone assignment
  getProjectsForAssignment: async (pmId = null) => {
    try {
      let url = '/projects';
      if (pmId) {
        url = `/projects/pm/${pmId}`;
      }

      const response = await apiRequest(url);

      return {
        success: true,
        data: response.data.data.map(project => ({
          _id: project._id,
          name: project.name,
          status: project.status,
          priority: project.priority,
          dueDate: project.dueDate,
          progress: project.progress,
          client: project.client
        }))
      };
    } catch (error) {
      throw error;
    }
  },

  // Get milestones for task assignment
  getMilestonesForTask: async (projectId) => {
    try {
      const response = await apiRequest(`/api/milestones/project/${projectId}`);

      return {
        success: true,
        data: response.data.data.map(milestone => ({
          _id: milestone._id,
          title: milestone.title,
          sequence: milestone.sequence,
          status: milestone.status,
          dueDate: milestone.dueDate,
          progress: milestone.progress
        }))
      };
    } catch (error) {
      throw error;
    }
  },

  // Search team members
  searchTeamMembers: async (searchTerm, filters = {}) => {
    try {
      const params = new URLSearchParams();
      params.append('search', searchTerm);

      if (filters.department) params.append('department', filters.department);
      if (filters.position) params.append('position', filters.position);
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive);

      const queryString = params.toString();
      const response = await apiRequest(`/api/admin/users/employee?${queryString}`);

      return {
        success: true,
        data: response.data.data.map(employee => ({
          _id: employee._id,
          name: employee.name,
          email: employee.email,
          position: employee.position,
          department: employee.department,
          skills: employee.skills || [],
          experience: employee.experience || 0
        }))
      };
    } catch (error) {
      throw error;
    }
  },

  // Search clients
  searchClients: async (searchTerm, filters = {}) => {
    try {
      const params = new URLSearchParams();
      params.append('search', searchTerm);

      if (filters.industry) params.append('industry', filters.industry);
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive);

      const queryString = params.toString();
      const response = await apiRequest(`/api/admin/users/client?${queryString}`);

      return {
        success: true,
        data: response.data.data.map(client => ({
          _id: client._id,
          name: client.name,
          email: client.email,
          companyName: client.companyName,
          industry: client.industry,
          phoneNumber: client.phoneNumber
        }))
      };
    } catch (error) {
      throw error;
    }
  },

  // Get team statistics
  getTeamStatistics: async () => {
    try {
      // Use the new PM team statistics endpoint
      const response = await apiRequest('/pm/team/statistics');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get employee workload
  getEmployeeWorkload: async (employeeId) => {
    try {
      const [employee, tasks] = await Promise.all([
        teamService.getEmployeeById(employeeId),
        apiRequest(`/api/tasks/employee/${employeeId}`)
      ]);

      const taskStats = {
        total: tasks.data.data.length,
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0
      };

      const now = new Date();
      tasks.data.data.forEach(task => {
        taskStats[task.status] = (taskStats[task.status] || 0) + 1;

        if (task.dueDate && new Date(task.dueDate) < now && task.status !== 'completed') {
          taskStats.overdue++;
        }
      });

      return {
        success: true,
        data: {
          employee: employee.data,
          workload: taskStats,
          utilization: Math.round((taskStats.inProgress / Math.max(taskStats.total, 1)) * 100)
        }
      };
    } catch (error) {
      throw error;
    }
  },

  // Get PM team leaderboard
  getTeamLeaderboard: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();

      // Add query parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const url = `/pm/team/leaderboard${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const response = await apiRequest(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching team leaderboard:', error);
      throw error;
    }
  }
};
