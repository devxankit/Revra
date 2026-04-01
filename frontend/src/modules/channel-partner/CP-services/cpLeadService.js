import { apiRequest } from './baseApiService';

export const cpLeadService = {
  // Get all leads
  getLeads: async (params = {}) => {
    // Filter out undefined, null, and empty string values
    const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});
    
    const queryParams = new URLSearchParams(cleanParams).toString();
    const url = `/cp/leads${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(url, { method: 'GET' });
  },

  // Get single lead by ID
  getLeadById: async (leadId) => {
    return await apiRequest(`/cp/leads/${leadId}`, { method: 'GET' });
  },

  // Create new lead
  createLead: async (leadData) => {
    return await apiRequest('/cp/leads', {
      method: 'POST',
      body: JSON.stringify(leadData)
    });
  },

  // Update lead
  updateLead: async (leadId, leadData) => {
    return await apiRequest(`/cp/leads/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify(leadData)
    });
  },

  // Update lead status
  updateLeadStatus: async (leadId, status, lostReason = null) => {
    return await apiRequest(`/cp/leads/${leadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, lostReason })
    });
  },

  // Delete lead
  deleteLead: async (leadId) => {
    return await apiRequest(`/cp/leads/${leadId}`, { method: 'DELETE' });
  },

  // Share lead with Sales
  shareLeadWithSales: async (leadId, salesId) => {
    return await apiRequest(`/cp/leads/${leadId}/share`, {
      method: 'POST',
      body: JSON.stringify({ salesId })
    });
  },

  // Unshare lead with Sales
  unshareLeadWithSales: async (leadId, salesId) => {
    return await apiRequest(`/cp/leads/${leadId}/unshare`, {
      method: 'POST',
      body: JSON.stringify({ salesId })
    });
  },

  // Get leads shared from Sales
  getSharedLeadsFromSales: async (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') acc[key] = value;
      return acc;
    }, {});
    const queryParams = new URLSearchParams(cleanParams).toString();
    const url = `/cp/leads/shared/from-sales${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(url, { method: 'GET' });
  },

  // Get leads shared with Sales
  getSharedLeadsWithSales: async (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') acc[key] = value;
      return acc;
    }, {});
    const queryParams = new URLSearchParams(cleanParams).toString();
    const url = `/cp/leads/shared/with-sales${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(url, { method: 'GET' });
  },

  // Create lead profile
  createLeadProfile: async (leadId, profileData) => {
    return await apiRequest(`/cp/leads/${leadId}/profile`, {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
  },

  // Update lead profile
  updateLeadProfile: async (leadId, profileData) => {
    return await apiRequest(`/cp/leads/${leadId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  // Convert lead to client
  convertLeadToClient: async (leadId, conversionData) => {
    return await apiRequest(`/cp/leads/${leadId}/convert`, {
      method: 'POST',
      body: JSON.stringify(conversionData)
    });
  },

  // Add follow-up
  addFollowUp: async (leadId, followUpData) => {
    return await apiRequest(`/cp/leads/${leadId}/followup`, {
      method: 'POST',
      body: JSON.stringify(followUpData)
    });
  },

  // Update follow-up
  updateFollowUp: async (leadId, followupId, followUpData) => {
    return await apiRequest(`/cp/leads/${leadId}/followup/${followupId}`, {
      method: 'PUT',
      body: JSON.stringify(followUpData)
    });
  },

  // Get lead categories
  getLeadCategories: async () => {
    return await apiRequest('/cp/lead-categories', { method: 'GET' });
  },

  // Get sales team leads for sharing
  getSalesTeamLeads: async () => {
    return await apiRequest('/cp/sales-team-leads', { method: 'GET' });
  },

  // Get assigned sales manager details
  getSalesManagerDetails: async () => {
    return await apiRequest('/cp/sales-manager', { method: 'GET' });
  },

  // Get all converted clients
  getConvertedClients: async (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});
    const queryParams = new URLSearchParams(cleanParams).toString();
    const url = `/cp/clients${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(url, { method: 'GET' });
  },

  // Get client details with project progress
  getClientDetails: async (clientId) => {
    return await apiRequest(`/cp/clients/${clientId}`, { method: 'GET' });
  },

  // Get sales team leads (for sharing) - same as getSalesTeamLeads for backward compatibility
  getSalesTeam: async () => {
    try {
      const response = await apiRequest('/cp/sales-team-leads', { method: 'GET' });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching sales team:', error);
      return [];
    }
  }
};

export default cpLeadService;
