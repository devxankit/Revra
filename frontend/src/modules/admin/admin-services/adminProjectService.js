import { apiRequest } from './baseApiService';

const API_BASE_URL = '/admin/projects';

class AdminProjectService {
  // Get comprehensive project management statistics
  async getProjectManagementStatistics() {
    try {
      const response = await apiRequest(`${API_BASE_URL}/management-statistics`);
      return response;
    } catch (error) {
      console.error('Error fetching project management statistics:', error);
      throw error;
    }
  }

  // Get pending projects (from sales team)
  async getPendingProjects(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.priority) queryParams.append('priority', params.priority);
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);

      const response = await apiRequest(`${API_BASE_URL}/pending?${queryParams}`);
      return response;
    } catch (error) {
      console.error('Error fetching pending projects:', error);
      throw error;
    }
  }

  // Get active projects
  async getActiveProjects(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      const statusFilter = params.status && params.status !== 'all' ? params.status : 'active';
      if (statusFilter) {
        queryParams.append('status', statusFilter);
      }
      
      if (params.priority) queryParams.append('priority', params.priority);
      if (params.client) queryParams.append('client', params.client);
      if (params.pm) queryParams.append('pm', params.pm);
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      // Add flag to indicate we want only projects with PM assigned
      queryParams.append('hasPM', 'true');

      const response = await apiRequest(`${API_BASE_URL}?${queryParams}`);
      return response;
    } catch (error) {
      console.error('Error fetching active projects:', error);
      throw error;
    }
  }

  // Get completed projects
  async getCompletedProjects(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('status', 'completed');
      // Only show completed projects with PM assigned
      queryParams.append('hasPM', 'true');
      
      if (params.priority) queryParams.append('priority', params.priority);
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);

      const response = await apiRequest(`${API_BASE_URL}?${queryParams}`);
      return response;
    } catch (error) {
      console.error('Error fetching completed projects:', error);
      throw error;
    }
  }

  // Assign PM to pending project
  async assignPMToProject(projectId, pmId) {
    try {
      const response = await apiRequest(`${API_BASE_URL}/pending/${projectId}/assign-pm`, {
        method: 'POST',
        body: JSON.stringify({ pmId })
      });
      return response;
    } catch (error) {
      console.error('Error assigning PM to project:', error);
      throw error;
    }
  }

  // Get project by ID
  async getProjectById(projectId) {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}`);
      return response;
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  }

  // Get project milestones with task counts
  async getProjectMilestones(projectId) {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}/milestones`);
      return response;
    } catch (error) {
      console.error('Error fetching project milestones:', error);
      throw error;
    }
  }

  // Get milestone tasks
  async getMilestoneTasks(projectId, milestoneId) {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}/milestones/${milestoneId}/tasks`);
      return response;
    } catch (error) {
      console.error('Error fetching milestone tasks:', error);
      throw error;
    }
  }

  // Create new project
  async createProject(projectData) {
    try {
      const response = await apiRequest(API_BASE_URL, {
        method: 'POST',
        body: JSON.stringify(projectData)
      });
      return response;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  // Update project
  async updateProject(projectId, projectData) {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(projectData)
      });
      return response;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  // Update project cost with history tracking
  async updateProjectCost(projectId, newCost, reason) {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}/cost`, {
        method: 'PUT',
        body: JSON.stringify({ newCost, reason })
      });
      return response;
    } catch (error) {
      console.error('Error updating project cost:', error);
      throw error;
    }
  }

  // Add project installments
  async addProjectInstallments(projectId, installments) {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}/installments`, {
        method: 'POST',
        body: JSON.stringify({ installments })
      });
      return response;
    } catch (error) {
      console.error('Error adding project installments:', error);
      throw error;
    }
  }

  // Add manual recovery payment for a project (admin-side)
  async addProjectRecovery(projectId, recoveryData) {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}/recoveries`, {
        method: 'POST',
        body: JSON.stringify(recoveryData)
      });
      return response;
    } catch (error) {
      console.error('Error adding project recovery:', error);
      throw error;
    }
  }

  // Update project installment
  async updateProjectInstallment(projectId, installmentId, updateData) {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}/installments/${installmentId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      return response;
    } catch (error) {
      console.error('Error updating project installment:', error);
      throw error;
    }
  }

  // Delete project installment
  async deleteProjectInstallment(projectId, installmentId) {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}/installments/${installmentId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Error deleting project installment:', error);
      throw error;
    }
  }

  // Delete project
  async deleteProject(projectId) {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${projectId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  // Get PMs for assignment dropdown
  async getPMsForAssignment() {
    try {
      const response = await apiRequest(`${API_BASE_URL}/pms-for-assignment`);
      return response;
    } catch (error) {
      console.error('Error fetching PMs for assignment:', error);
      throw error;
    }
  }

  // Get employees with enhanced data
  async getEmployees(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('role', 'employee');
      queryParams.append('includeStats', 'true');
      
      if (params.status) queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);

      const response = await apiRequest(`/admin/users?${queryParams}`);
      
      // Format employees data like User Management page
      if (response.success && response.data) {
        const formattedEmployees = response.data.map(employee => this.formatEmployeeForDisplay(employee));
        return {
          ...response,
          data: formattedEmployees
        };
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  }

  // Format employee data for display
  formatEmployeeForDisplay(employee) {
    return {
      id: employee._id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone || employee.phoneNumber,
      role: employee.position || 'Developer',
      department: employee.department,
      team: employee.team,
      status: employee.isActive ? 'active' : 'inactive',
      joinDate: employee.joiningDate || employee.createdAt,
      lastActive: employee.lastLogin,
      avatar: this.generateAvatar(employee.name),
      // Employee specific fields
      position: employee.position,
      salary: employee.salary,
      skills: employee.skills || [],
      experience: employee.experience,
      // Statistics - use direct counts from backend (projects and tasks are now numbers, not arrays)
      projects: employee.projects !== undefined && employee.projects !== null ? employee.projects : 0,
      tasks: employee.tasks !== undefined && employee.tasks !== null ? employee.tasks : 0,
      performance: employee.performance || 0
    };
  }

  // Generate avatar initials from name
  generateAvatar(name) {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  // Get clients with enhanced data
  async getClients(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('role', 'client');
      queryParams.append('includeStats', 'true');
      
      if (params.status) queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);

      const response = await apiRequest(`/admin/users?${queryParams}`);
      
      // Format clients data like User Management page
      if (response.success && response.data) {
        const formattedClients = response.data.map(client => this.formatClientForDisplay(client));
        return {
          ...response,
          data: formattedClients
        };
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
  }

  // Format client data for display
  formatClientForDisplay(client) {
    return {
      id: client._id,
      _id: client._id,
      userId: client._id,
      name: client.name,
      email: client.email,
      phone: client.phoneNumber,
      contact: client.phoneNumber, // For display compatibility
      companyName: client.companyName,
      industry: client.industry,
      address: client.address,
      status: client.isActive ? 'active' : 'inactive',
      joinDate: client.joiningDate || client.createdAt,
      lastActive: client.lastLogin || client.lastActivity || client.updatedAt,
      avatar: this.generateAvatar(client.name),
      // Client specific fields
      totalSpent: client.totalSpent || 0,
      projects: client.projects || 0, // Backend returns count as number, not array
      lastProject: client.lastProject,
      // Tag field (populated from backend)
      tag: client.tag || null,
      // Birthday field
      dateOfBirth: client.dateOfBirth || null,
      // Additional fields for comprehensive display
      userType: 'client',
      role: 'Client',
      // Include all original fields for compatibility
      ...client
    };
  }

  // Get PMs with enhanced data
  async getPMs(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('role', 'project-manager');
      queryParams.append('includeStats', 'true');
      
      if (params.status) queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);

      const response = await apiRequest(`/admin/users?${queryParams}`);
      
      // Format PMs data like User Management page
      if (response.success && response.data) {
        const formattedPMs = response.data.map(pm => this.formatPMForDisplay(pm));
        return {
          ...response,
          data: formattedPMs
        };
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching PMs:', error);
      throw error;
    }
  }

  // Format PM data for display
  formatPMForDisplay(pm) {
    return {
      id: pm._id,
      name: pm.name,
      email: pm.email,
      phone: pm.phone || pm.phoneNumber,
      role: 'Project Manager',
      department: pm.department,
      team: pm.team,
      status: pm.isActive ? 'active' : 'inactive',
      joinDate: pm.joiningDate || pm.createdAt,
      lastActive: pm.lastLogin,
      avatar: this.generateAvatar(pm.name),
      // PM specific fields
      position: pm.position,
      salary: pm.salary,
      skills: pm.skills || [],
      experience: pm.experience,
      // Statistics
      projects: pm.projectsManaged?.length || 0,
      teamSize: pm.teamSize || 0,
      completionRate: pm.completionRate || 0,
      performance: pm.performance || 0
    };
  }
}

const adminProjectService = new AdminProjectService();
export default adminProjectService;
export { adminProjectService };
