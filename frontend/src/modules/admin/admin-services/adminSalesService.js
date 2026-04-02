import { apiRequest } from './baseApiService';

class AdminSalesService {
  // ==================== LEAD MANAGEMENT METHODS ====================

  // Create single lead
  async createLead(leadData) {
    try {
      // Validate and format phone number
      const formattedPhone = this.parsePhoneNumber(leadData.phone);
      if (!formattedPhone) {
        throw new Error('Invalid phone number format');
      }

      const requestData = {
        ...leadData,
        phone: formattedPhone,
        priority: leadData.priority || 'medium'
      };

      const response = await apiRequest('/admin/sales/leads', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  }

  // Create bulk leads
  async createBulkLeads(phoneNumbers, categoryId, priority = 'medium') {
    try {
      // Validate phone numbers
      const validPhones = phoneNumbers.filter(phone => this.parsePhoneNumber(phone));
      const invalidPhones = phoneNumbers.filter(phone => !this.parsePhoneNumber(phone));

      if (invalidPhones.length > 0) {
        console.warn('Some phone numbers are invalid:', invalidPhones);
      }

      const requestData = {
        phoneNumbers: validPhones,
        category: categoryId,
        priority
      };

      const response = await apiRequest('/admin/sales/leads/bulk', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    } catch (error) {
      console.error('Error creating bulk leads:', error);
      throw error;
    }
  }

  // Get all leads with filtering and pagination
  async getAllLeads(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add query parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const url = `/admin/sales/leads${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await apiRequest(url, { method: 'GET' });
      
      return response;
    } catch (error) {
      console.error('Error fetching leads:', error);
      throw error;
    }
  }

  // Get single lead by ID
  async getLeadById(id) {
    try {
      const response = await apiRequest(`/admin/sales/leads/${id}`, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching lead:', error);
      throw error;
    }
  }

  // Update lead
  async updateLead(id, leadData) {
    try {
      // Format phone number if provided
      if (leadData.phone) {
        const formattedPhone = this.parsePhoneNumber(leadData.phone);
        if (!formattedPhone) {
          throw new Error('Invalid phone number format');
        }
        leadData.phone = formattedPhone;
      }

      const response = await apiRequest(`/admin/sales/leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify(leadData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    } catch (error) {
      console.error('Error updating lead:', error);
      throw error;
    }
  }

  // Delete lead
  async deleteLead(id) {
    try {
      const response = await apiRequest(`/admin/sales/leads/${id}`, { method: 'DELETE' });
      return response;
    } catch (error) {
      console.error('Error deleting lead:', error);
      throw error;
    }
  }

  // Get lead statistics
  async getLeadStatistics(period = 'all') {
    try {
      const response = await apiRequest(`/admin/sales/leads/statistics?period=${period}`, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching lead statistics:', error);
      throw error;
    }
  }

  // ==================== LEAD CATEGORY METHODS ====================

  // Create lead category
  async createLeadCategory(categoryData) {
    try {
      const response = await apiRequest('/admin/sales/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return response;
    } catch (error) {
      console.error('AdminSalesService: Error creating category:', error);
      throw error;
    }
  }

  // Get all lead categories
  async getAllLeadCategories() {
    try {
      const response = await apiRequest('/admin/sales/categories', { method: 'GET' });
      
      // Transform backend data to frontend format
      if (response.success && response.data) {
        return {
          ...response,
          data: response.data.map(category => this.formatCategoryForDisplay(category))
        };
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // Format category data for display
  formatCategoryForDisplay(category) {
    return {
      id: category._id || category.id,
      _id: category._id || category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
      leadCount: category.leadCount || 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      createdBy: category.createdBy
    };
  }

  // Get single lead category
  async getLeadCategoryById(id) {
    try {
      const response = await apiRequest(`/admin/sales/categories/${id}`, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching category:', error);
      throw error;
    }
  }

  // Update lead category
  async updateLeadCategory(id, categoryData) {
    try {
      const response = await apiRequest(`/admin/sales/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(categoryData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  // Delete lead category
  async deleteLeadCategory(id) {
    try {
      // Validate ID
      if (!id) {
        throw new Error('Category ID is required');
      }
      
      const response = await apiRequest(`/admin/sales/categories/${id}`, { method: 'DELETE' });
      
      return response;
    } catch (error) {
      console.error('AdminSalesService: Error deleting category:', error);
      throw error;
    }
  }

  // Get category performance
  async getCategoryPerformance() {
    try {
      const response = await apiRequest('/admin/sales/categories/performance', { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching category performance:', error);
      throw error;
    }
  }

  // ==================== SALES TEAM METHODS ====================

  // Get all sales team members
  async getAllSalesTeam() {
    try {
      const response = await apiRequest('/admin/sales/team', { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching sales team:', error);
      throw error;
    }
  }

  // Get sales team member details
  async getSalesTeamMember(id) {
    try {
      const response = await apiRequest(`/admin/sales/team/${id}`, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching team member:', error);
      throw error;
    }
  }

  // Set sales target
  async setSalesTarget(memberId, target) {
    try {
      const response = await apiRequest(`/admin/sales/team/${memberId}/target`, {
        method: 'PUT',
        body: JSON.stringify({ target }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  async setMultipleTargets(memberId, targets) {
    try {
      const response = await apiRequest(`/admin/sales/team/${memberId}/target`, {
        method: 'PUT',
        body: JSON.stringify({ targets }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    } catch (error) {
      console.error('Error setting sales target:', error);
      throw error;
    }
  }

  // Set team lead target and reward
  async setTeamLeadTarget(teamLeadId, target, reward) {
    try {
      const response = await apiRequest(`/admin/sales/team-leads/${teamLeadId}/team-target`, {
        method: 'PUT',
        body: JSON.stringify({ target, reward }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    } catch (error) {
      console.error('Error setting team lead target:', error);
      throw error;
    }
  }

  // Update team members assignment
  async updateTeamMembers(memberId, teamData) {
    try {
      const response = await apiRequest(`/admin/sales/team/${memberId}/team-members`, {
        method: 'PUT',
        body: JSON.stringify(teamData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    } catch (error) {
      console.error('Error updating team members:', error);
      throw error;
    }
  }

  // Distribute leads to sales member
  async distributeLeads(memberId, count, categoryId = 'all') {
    try {
      const requestData = {
        count,
        categoryId
      };

      const response = await apiRequest(`/admin/sales/team/${memberId}/distribute-leads`, {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    } catch (error) {
      console.error('Error distributing leads:', error);
      throw error;
    }
  }

  // Get leads for member
  async getLeadsForMember(memberId, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const url = `/admin/sales/team/${memberId}/leads${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await apiRequest(url, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching member leads:', error);
      throw error;
    }
  }

  // Delete sales team member
  async deleteSalesMember(memberId) {
    try {
      const response = await apiRequest(`/admin/sales/team/${memberId}`, { method: 'DELETE' });
      return response;
    } catch (error) {
      console.error('Error deleting sales member:', error);
      throw error;
    }
  }

  // ==================== INCENTIVE METHODS ====================

  // Set per-conversion incentive amount for sales member
  async setIncentive(memberId, amount) {
    try {
      const requestData = {
        amount
      };

      const response = await apiRequest(`/admin/sales/team/${memberId}/incentive`, {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    } catch (error) {
      console.error('Error setting per-conversion incentive:', error);
      throw error;
    }
  }

  // Set per-conversion incentive amount for team lead
  async setTeamLeadIncentive(teamLeadId, amount) {
    try {
      const requestData = {
        amount
      };

      const response = await apiRequest(`/admin/sales/team-leads/${teamLeadId}/incentive`, {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    } catch (error) {
      console.error('Error setting team lead incentive:', error);
      throw error;
    }
  }

  // Get incentive history for member
  async getIncentiveHistory(memberId, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const url = `/admin/sales/team/${memberId}/incentives${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await apiRequest(url, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching incentive history:', error);
      throw error;
    }
  }

  // Update incentive record
  async updateIncentiveRecord(memberId, incentiveId, data) {
    try {
      const response = await apiRequest(`/admin/sales/team/${memberId}/incentive/${incentiveId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    } catch (error) {
      console.error('Error updating incentive:', error);
      throw error;
    }
  }

  // ==================== ANALYTICS METHODS ====================

  // Get sales overview
  async getSalesOverview(period = 'all') {
    try {
      const response = await apiRequest(`/admin/sales/overview?period=${period}`, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching sales overview:', error);
      throw error;
    }
  }

  // Get global sales month configuration
  async getSalesMonthConfig() {
    try {
      const response = await apiRequest('/admin/sales/month-range', { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching sales month config:', error);
      throw error;
    }
  }

  // Update global sales month configuration
  async updateSalesMonthConfig(salesMonthStartDay, salesMonthEndDay) {
    try {
      const body = {
        salesMonthStartDay,
        salesMonthEndDay,
      };

      const response = await apiRequest('/admin/sales/month-range', {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response;
    } catch (error) {
      console.error('Error updating sales month config:', error);
      throw error;
    }
  }

  // Get category analytics
  async getCategoryAnalytics(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      
      const url = `/admin/sales/analytics/categories${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiRequest(url, { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching category analytics:', error);
      throw error;
    }
  }

  // Get category financial details
  async getCategoryFinancialDetails() {
    try {
      const response = await apiRequest('/admin/sales/analytics/categories/financial', { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching category financial details:', error);
      throw error;
    }
  }

  // Get team performance
  async getTeamPerformance() {
    try {
      const response = await apiRequest('/admin/sales/analytics/team', { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Error fetching team performance:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  // Format lead data for display
  formatLeadForDisplay(lead) {
    return {
      id: lead._id,
      phone: this.formatPhoneNumber(lead.phone),
      name: lead.name || 'N/A',
      company: lead.company || 'N/A',
      email: lead.email || 'N/A',
      status: lead.status,
      priority: lead.priority,
      value: lead.value || 0,
      lastContactDate: lead.lastContactDate,
      nextFollowUpDate: lead.nextFollowUpDate,
      assignedTo: lead.assignedTo,
      category: lead.category,
      notes: lead.notes || '',
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      // Calculated fields
      daysSinceLastContact: this.calculateDaysSince(lead.lastContactDate),
      daysUntilFollowUp: this.calculateDaysUntil(lead.nextFollowUpDate),
      statusColor: this.getStatusColor(lead.status),
      priorityColor: this.getPriorityColor(lead.priority)
    };
  }

  // Format category data for display
  formatCategoryForDisplay(category) {
    return {
      id: category._id,
      name: category.name,
      description: category.description || '',
      color: category.color,
      icon: category.icon || '📁',
      leadCount: category.leadCount || 0,
      activeLeadCount: category.activeLeadCount || 0,
      convertedLeadCount: category.convertedLeadCount || 0,
      conversionRate: category.conversionRate || 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    };
  }

  // Format team member data for display
  formatTeamMemberForDisplay(member) {
    return {
      id: member._id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      salesTarget: member.salesTarget || 0,
      currentSales: member.currentSales || 0,
      currentIncentive: member.currentIncentive || 0,
      commissionRate: member.commissionRate || 0,
      experience: member.experience || 0,
      skills: member.skills || [],
      performance: member.performance || {
        totalLeads: 0,
        convertedLeads: 0,
        conversionRate: 0,
        totalValue: 0,
        convertedValue: 0,
        targetAchievement: 0
      },
      avatar: this.generateAvatar(member.name),
      isActive: member.isActive,
      createdAt: member.createdAt
    };
  }

  // Validate lead data
  validateLeadData(leadData) {
    const errors = [];

    if (!leadData.phone?.trim()) {
      errors.push('Phone number is required');
    } else if (!this.parsePhoneNumber(leadData.phone)) {
      errors.push('Invalid phone number format');
    }

    if (!leadData.category) {
      errors.push('Category is required');
    }

    if (leadData.email && !this.isValidEmail(leadData.email)) {
      errors.push('Invalid email format');
    }

    if (leadData.value && (isNaN(leadData.value) || leadData.value < 0)) {
      errors.push('Value must be a positive number');
    }

    return errors;
  }

  // Validate category data
  validateCategoryData(categoryData) {
    const errors = [];

    if (!categoryData.name?.trim()) {
      errors.push('Category name is required');
    }

    if (!categoryData.color?.trim()) {
      errors.push('Color is required');
    } else if (!this.isValidHexColor(categoryData.color)) {
      errors.push('Invalid color format (use hex format like #FF5733)');
    }

    return errors;
  }

  // Parse and validate phone number
  parsePhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Handle different phone number formats
    if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
      // 10-digit Indian number (e.g., 9755620716)
      return cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith('91') && /^91[6-9]\d{9}$/.test(cleaned)) {
      // 12-digit number with country code (e.g., 919755620716)
      return cleaned.substring(2); // Remove country code
    } else if (cleaned.length === 11 && cleaned.startsWith('0') && /^0[6-9]\d{9}$/.test(cleaned)) {
      // 11-digit number with leading 0 (e.g., 09755620716)
      return cleaned.substring(1); // Remove leading 0
    }
    
    return null;
  }

  // Format phone number for display
  formatPhoneNumber(phone) {
    if (!phone) return 'N/A';
    
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    
    return phone;
  }

  // Calculate days since date
  calculateDaysSince(date) {
    if (!date) return null;
    const now = new Date();
    const targetDate = new Date(date);
    const diffTime = Math.abs(now - targetDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Calculate days until date
  calculateDaysUntil(date) {
    if (!date) return null;
    const now = new Date();
    const targetDate = new Date(date);
    const diffTime = targetDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Get status color
  getStatusColor(status) {
    const colors = {
      'new': '#3B82F6',
      'connected': '#F59E0B',
      'hot': '#EF4444',
      'converted': '#10B981',
      'lost': '#6B7280'
    };
    return colors[status] || '#6B7280';
  }

  // Get priority color
  getPriorityColor(priority) {
    const colors = {
      'high': '#EF4444',
      'medium': '#F59E0B',
      'low': '#10B981'
    };
    return colors[priority] || '#6B7280';
  }

  // Generate avatar initials
  generateAvatar(name) {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  // Validate email
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate hex color
  isValidHexColor(color) {
    const hexRegex = /^#[0-9A-F]{6}$/i;
    return hexRegex.test(color);
  }

  // Get status options
  getStatusOptions() {
    return [
      { value: 'new', label: 'New', color: '#3B82F6' },
      { value: 'connected', label: 'Connected', color: '#F59E0B' },
      { value: 'hot', label: 'Hot', color: '#EF4444' },
      { value: 'converted', label: 'Converted', color: '#10B981' },
      { value: 'lost', label: 'Lost', color: '#6B7280' }
    ];
  }

  // Get priority options
  getPriorityOptions() {
    return [
      { value: 'high', label: 'High', color: '#EF4444' },
      { value: 'medium', label: 'Medium', color: '#F59E0B' },
      { value: 'low', label: 'Low', color: '#10B981' }
    ];
  }

  // Parse file for bulk upload
  parseFileForBulkUpload(file) {
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Handle Excel files
        this.parseExcelFile(file)
          .then(phoneNumbers => resolve(phoneNumbers))
          .catch(error => reject(error));
      } else if (fileExtension === 'csv') {
        // Handle CSV files
        this.parseCsvFile(file)
          .then(phoneNumbers => resolve(phoneNumbers))
          .catch(error => reject(error));
      } else {
        // Handle text files
        this.parseTextFile(file)
          .then(phoneNumbers => resolve(phoneNumbers))
          .catch(error => reject(error));
      }
    });
  }

  // Parse Excel files
  parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          // Import xlsx dynamically to avoid bundling issues
          import('xlsx').then(XLSX => {
            try {
              const data = new Uint8Array(e.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              
              // Get the first worksheet
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              
              // Convert to JSON array
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              
              // Extract phone numbers from all rows
              const phoneNumbers = [];
              jsonData.forEach(row => {
                if (Array.isArray(row)) {
                  row.forEach(cell => {
                    if (cell && typeof cell === 'string') {
                      const normalized = this.parsePhoneNumber(cell);
                      if (normalized) {
                        phoneNumbers.push(normalized);
                      }
                    } else if (cell && typeof cell === 'number') {
                      // Handle numeric phone numbers
                      const normalized = this.parsePhoneNumber(cell.toString());
                      if (normalized) {
                        phoneNumbers.push(normalized);
                      }
                    }
                  });
                }
              });
              
              resolve(phoneNumbers);
            } catch (error) {
              reject(new Error('Failed to parse Excel file: ' + error.message));
            }
          }).catch(error => {
            reject(new Error('Failed to load Excel parser: ' + error.message));
          });
        } catch (error) {
          reject(new Error('Failed to read Excel file: ' + error.message));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Parse CSV files
  parseCsvFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const lines = content.split('\n').map(line => line.trim()).filter(line => line);
          
          const phoneNumbers = [];
          lines.forEach(line => {
            // Split CSV line by comma and process each cell
            const cells = line.split(',').map(cell => cell.trim().replace(/"/g, ''));
            cells.forEach(cell => {
              const normalized = this.parsePhoneNumber(cell);
              if (normalized) {
                phoneNumbers.push(normalized);
              }
            });
          });
          
          resolve(phoneNumbers);
        } catch (error) {
          reject(new Error('Failed to parse CSV file: ' + error.message));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read CSV file'));
      reader.readAsText(file);
    });
  }

  // Parse text files
  parseTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const lines = content.split('\n').map(line => line.trim()).filter(line => line);
          
          // Extract and normalize phone numbers using parsePhoneNumber
          const phoneNumbers = lines.map(line => {
            // Use parsePhoneNumber to normalize (same as single lead)
            return this.parsePhoneNumber(line);
          }).filter(phone => phone !== null);
          
          resolve(phoneNumbers);
        } catch (error) {
          reject(new Error('Failed to parse text file: ' + error.message));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  }

  // ==================== CLIENT MANAGEMENT METHODS ====================

  // Get all clients
  async getAllClients(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add role filter to get only clients
      queryParams.append('role', 'client');
      
      // Add other query parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const url = `/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await apiRequest(url, { method: 'GET' });
      
      // Filter to only return clients and format for display
      if (response.success && response.data) {
        const clients = response.data.filter(user => user.userType === 'client');
        return {
          ...response,
          data: clients.map(client => this.formatClientForDisplay(client))
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
      name: client.name || client.companyName || 'Unknown Client',
      email: client.email,
      phone: client.phone || client.phoneNumber,
      company: client.companyName || 'Unknown Company',
      contactPerson: client.contactPerson || client.name,
      industry: client.industry || 'Technology',
      location: client.location || client.address || 'N/A',
      status: client.isActive ? 'active' : 'inactive',
      avatar: client.name ? client.name.charAt(0).toUpperCase() : 'C',
      totalSpent: client.totalSpent || 0,
      projectsCompleted: client.projects || 0,
      joinDate: client.createdAt,
      lastContact: client.lastActivity || client.updatedAt,
      // Additional fields for compatibility
      revenue: client.totalSpent || 0,
      performance: client.isActive ? 85 : 0
    };
  }
}

export const adminSalesService = new AdminSalesService();
export default adminSalesService;
