import { apiRequest } from './baseApiService';
import { getApiUrl } from '../../../config/env';

// Dashboard & Statistics
export const getDashboardStatistics = async () => {
  try {
    const response = await apiRequest('/sales/dashboard/statistics', {
      method: 'GET'
    });
    
    // The backend returns { success: true, data: { statusCounts, totalLeads } }
    if (response.success && response.data) {
      return response.data;
    } else {
      console.error('Invalid response structure:', response);
      throw new Error('Invalid response structure');
    }
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    // Return default stats if API fails
    return {
      statusCounts: {
        new: 0,
        connected: 0,
        not_picked: 0,
        followup: 0, // Changed from today_followup to followup to match backend
        quotation_sent: 0,
        dq_sent: 0,
        app_client: 0,
        web: 0,
        converted: 0,
        lost: 0,
        hot: 0,
        demo_requested: 0,
        not_interested: 0
      },
      totalLeads: 0
    };
  }
};

// Lead Management
export const getMyLeads = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add parameters if they exist
    if (params.status) queryParams.append('status', params.status);
    if (params.category) queryParams.append('category', params.category);
    if (params.priority) queryParams.append('priority', params.priority);
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `/sales/leads${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiRequest(url, {
      method: 'GET'
    });
    return response;
  } catch (error) {
    console.error('Error fetching leads:', error);
    throw error;
  }
};

export const getLeadsByStatus = async (status, params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add parameters if they exist
    if (params.category) queryParams.append('category', params.category);
    if (params.priority) queryParams.append('priority', params.priority);
    if (params.search) queryParams.append('search', params.search);
    if (params.timeFrame) queryParams.append('timeFrame', params.timeFrame);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const url = `/sales/leads/status/${status}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await apiRequest(url, {
      method: 'GET'
    });
    
    return response;
  } catch (error) {
    console.error('Error fetching leads by status:', error);
    throw error;
  }
};

export const getLeadDetail = async (leadId) => {
  try {
    const response = await apiRequest(`/sales/leads/${leadId}`, {
      method: 'GET'
    });
    return response?.data ?? response?.lead ?? null;
  } catch (error) {
    console.error('Error fetching lead detail:', error);
    throw error;
  }
};

export const updateLeadStatus = async (leadId, status, payload = '') => {
  try {
    let requestBody = { status };
    
    // Handle different payload types for backward compatibility
    if (typeof payload === 'string') {
      // Legacy: notes as string
      requestBody.notes = payload;
    } else if (typeof payload === 'object' && payload !== null) {
      // New: follow-up data object
      requestBody = {
        ...requestBody,
        ...payload
      };
    }
    
    const response = await apiRequest(`/sales/leads/${leadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody)
    });
    
    return response.data;
  } catch (error) {
    console.error('Error updating lead status:', error);
    throw error;
  }
};

// Follow-up Management
export const addFollowUp = async (leadId, followUpData) => {
  try {
    // Handle both 'date'/'time' and 'followupDate'/'followupTime' formats
    const requestBody = {
      date: followUpData.date || followUpData.followupDate,
      time: followUpData.time || followUpData.followupTime,
      notes: followUpData.notes || '',
      type: followUpData.type || 'call',
      priority: followUpData.priority || 'medium'
    };
    
    if (!requestBody.date || !requestBody.time) {
      throw new Error('Date and time are required for follow-up');
    }
    
    const response = await apiRequest(`/sales/leads/${leadId}/followups`, {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
    return response.data;
  } catch (error) {
    console.error('Error adding follow-up:', error);
    throw error;
  }
};

export const completeFollowUp = async (leadId, followUpId) => {
  try {
    const response = await apiRequest(`/sales/leads/${leadId}/followups/${followUpId}/complete`, {
      method: 'PATCH'
    });
    return response.data;
  } catch (error) {
    console.error('Error completing follow-up:', error);
    throw error;
  }
};

export const cancelFollowUp = async (leadId, followUpId) => {
  try {
    const response = await apiRequest(`/sales/leads/${leadId}/followups/${followUpId}/cancel`, {
      method: 'PATCH'
    });
    return response.data;
  } catch (error) {
    console.error('Error cancelling follow-up:', error);
    throw error;
  }
};

export const rescheduleFollowUp = async (leadId, followUpId, followUpData) => {
  try {
    // Handle both 'date'/'time' and 'followupDate'/'followupTime' formats
    let scheduledDate = followUpData.date || followUpData.followupDate || followUpData.scheduledDate;
    let scheduledTime = followUpData.time || followUpData.followupTime || followUpData.scheduledTime;
    
    // Keep date-only strings (YYYY-MM-DD) as-is to avoid timezone shift; only convert Date objects
    if (scheduledDate instanceof Date) {
      scheduledDate = scheduledDate.toISOString();
    }
    
    const requestBody = {
      scheduledDate: scheduledDate,
      scheduledTime: scheduledTime,
      notes: followUpData.notes || '',
      type: followUpData.type || 'call',
      priority: followUpData.priority || 'medium'
    };
    
    const response = await apiRequest(`/sales/leads/${leadId}/followups/${followUpId}`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody)
    });
    return response.data;
  } catch (error) {
    console.error('Error rescheduling follow-up:', error);
    throw error;
  }
};

// LeadProfile Management
export const createLeadProfile = async (leadId, profileData) => {
  try {
    const response = await apiRequest(`/sales/leads/${leadId}/profile`, {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
    return response.data;
  } catch (error) {
    console.error('Error creating lead profile:', error);
    throw error;
  }
};

export const updateLeadProfile = async (leadId, profileData) => {
  try {
    const response = await apiRequest(`/sales/leads/${leadId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    return response.data;
  } catch (error) {
    console.error('Error updating lead profile:', error);
    throw error;
  }
};

export const convertLeadToClient = async (leadId, projectData) => {
  try {
    const token = localStorage.getItem('salesToken');
    const apiUrl = getApiUrl(`/sales/leads/${leadId}/convert`);
    
    // Check if screenshot file exists
    if (projectData.screenshot && projectData.screenshot instanceof File) {
      // Use FormData for file upload
      const formData = new FormData();
      
      // Append all fields to FormData
      formData.append('projectName', projectData.projectName || '');
      // Send categoryId (preferred) or fall back to legacy projectType
      if (projectData.categoryId || projectData.category) {
        formData.append('categoryId', projectData.categoryId || projectData.category);
      }
      // Legacy support: still send projectType if provided
      if (projectData.projectType) {
        formData.append('projectType', JSON.stringify(projectData.projectType));
      }
      formData.append('totalCost', projectData.totalCost || 0);
      if (projectData.finishedDays) formData.append('finishedDays', projectData.finishedDays);
      formData.append('advanceReceived', projectData.advanceReceived || 0);
      if (projectData.advanceAccount) formData.append('advanceAccount', projectData.advanceAccount);
      formData.append('includeGST', projectData.includeGST || false);
      if (projectData.clientDateOfBirth) formData.append('clientDateOfBirth', projectData.clientDateOfBirth);
      formData.append('description', projectData.description || '');
      formData.append('screenshot', projectData.screenshot);
      // Project expense configuration
      if (typeof projectData.includeProjectExpenses !== 'undefined') {
        formData.append('includeProjectExpenses', projectData.includeProjectExpenses ? 'true' : 'false');
      }
      if (typeof projectData.projectExpenseReservedAmount !== 'undefined' && projectData.projectExpenseReservedAmount !== null && projectData.projectExpenseReservedAmount !== '') {
        formData.append('projectExpenseReservedAmount', projectData.projectExpenseReservedAmount);
      }
      if (typeof projectData.projectExpenseRequirements === 'string' && projectData.projectExpenseRequirements.trim()) {
        formData.append('projectExpenseRequirements', projectData.projectExpenseRequirements.trim());
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: formData,
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }
      
      return data.data || data;
    } else {
      // Use JSON for regular request
      const response = await apiRequest(`/sales/leads/${leadId}/convert`, {
        method: 'POST',
        body: JSON.stringify({ projectData })
      });
      return response.data;
    }
  } catch (error) {
    console.error('Error converting lead:', error);
    throw error;
  }
};

export const getLeadCategories = async () => {
  try {
    const response = await apiRequest('/sales/lead-categories', {
      method: 'GET'
    });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

// Create a new lead
export const createLead = async (leadData) => {
  try {
    const response = await apiRequest('/sales/leads', {
      method: 'POST',
      body: JSON.stringify(leadData)
    });
    return response;
  } catch (error) {
    console.error('Error creating lead:', error);
    throw error;
  }
};

// Utility functions for status management
export const getStatusDisplayName = (status) => {
  const statusMap = {
    'new': 'New',
    'connected': 'Connected',
    'not_picked': 'Not Picked',
    'followup': 'Follow Up',
    'today_followup': 'Today Followup', // Backward compatibility
    'quotation_sent': 'Quotation Sent',
    'dq_sent': 'DQ Sent',
    'app_client': 'App Client',
    'web': 'Web',
    'converted': 'Converted',
    'lost': 'Lost',
    'not_interested': 'Not Interested',
    'hot': 'Hot',
    'demo_requested': 'Demo Requested'
  };
  return statusMap[status] || status;
};

export const getStatusColor = (status) => {
  const colorMap = {
    'new': 'bg-blue-100 text-blue-800',
    'connected': 'bg-green-100 text-green-800',
    'not_picked': 'bg-gray-100 text-gray-800',
    'followup': 'bg-yellow-100 text-yellow-800',
    'today_followup': 'bg-yellow-100 text-yellow-800', // Backward compatibility
    'quotation_sent': 'bg-purple-100 text-purple-800',
    'dq_sent': 'bg-indigo-100 text-indigo-800',
    'app_client': 'bg-pink-100 text-pink-800',
    'web': 'bg-cyan-100 text-cyan-800',
    'converted': 'bg-emerald-100 text-emerald-800',
    'lost': 'bg-red-100 text-red-800',
    'not_interested': 'bg-orange-100 text-orange-800',
    'hot': 'bg-orange-100 text-orange-800',
    'demo_requested': 'bg-teal-100 text-teal-800'
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
};

export const getValidStatusTransitions = (currentStatus) => {
  const transitions = {
    'new': ['connected', 'not_picked', 'not_interested', 'lost'],
    'connected': ['hot', 'followup', 'quotation_sent', 'demo_requested', 'not_interested', 'lost'],
    'not_picked': ['connected', 'followup', 'not_interested', 'lost'],
    'followup': ['connected', 'hot', 'quotation_sent', 'demo_requested', 'not_interested', 'lost'],
    'today_followup': ['connected', 'hot', 'quotation_sent', 'demo_requested', 'not_interested', 'lost'], // Backward compatibility
    'quotation_sent': ['connected', 'hot', 'demo_requested', 'converted', 'not_interested', 'lost'],
    'demo_requested': ['connected', 'hot', 'quotation_sent', 'converted', 'not_interested', 'lost'],
    'hot': ['connected', 'followup', 'quotation_sent', 'demo_requested', 'converted', 'not_interested', 'lost'],
    'converted': [],
    'lost': ['connected'],
    'not_interested': ['connected'],
    // Backward compat: existing leads with removed statuses can still transition out
    'dq_sent': ['connected', 'hot', 'quotation_sent', 'demo_requested', 'converted', 'not_interested', 'lost'],
    'app_client': ['connected', 'hot', 'quotation_sent', 'demo_requested', 'converted', 'not_interested', 'lost'],
    'web': ['connected', 'hot', 'quotation_sent', 'demo_requested', 'converted', 'not_interested', 'lost']
  };
  return transitions[currentStatus] || [];
};

// Get activity indicators for a lead (follow-ups)
// Note: Removed quotation sent and demo sent as they're status-related and redundant since leads appear on status-specific pages
export const getLeadActivities = (lead) => {
  const activities = [];
  
  // Check follow-ups
  if (lead.followUps && Array.isArray(lead.followUps) && lead.followUps.length > 0) {
    const pendingFollowUps = lead.followUps.filter(fu => fu.status === 'pending');
    if (pendingFollowUps.length > 0) {
      activities.push({ type: 'followup', label: `${pendingFollowUps.length} Follow-up${pendingFollowUps.length > 1 ? 's' : ''}`, color: 'bg-amber-100 text-amber-800' });
    }
  }
  
  return activities;
};

// Get channel partner leads (type: 'received' = from CP, 'shared' = shared by me with CP)
export const getChannelPartnerLeads = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.type) queryParams.append('type', params.type);
    if (params.category) queryParams.append('category', params.category);
    if (params.priority) queryParams.append('priority', params.priority);
    if (params.search) queryParams.append('search', params.search);
    if (params.timeFrame) queryParams.append('timeFrame', params.timeFrame);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const url = `/sales/channel-partner-leads${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiRequest(url, { method: 'GET' });
    return response;
  } catch (error) {
    console.error('Error fetching channel partner leads:', error);
    return { data: [], count: 0, total: 0, page: 1, pages: 0 };
  }
};

// Get single channel partner lead detail (CPLead) for Sales
export const getChannelPartnerLeadDetail = async (cpLeadId) => {
  try {
    const response = await apiRequest(`/sales/channel-partner-leads/${cpLeadId}`, { method: 'GET' });
    return response.data;
  } catch (error) {
    console.error('Error fetching channel partner lead detail:', error);
    throw error;
  }
};

// Update channel partner lead (CPLead) for Sales
export const updateChannelPartnerLead = async (cpLeadId, updateData) => {
  try {
    const response = await apiRequest(`/sales/channel-partner-leads/${cpLeadId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData || {})
    });
    return response.data;
  } catch (error) {
    console.error('Error updating channel partner lead:', error);
    throw error;
  }
};

// Upsert channel partner lead profile (CPLeadProfile) for Sales
export const upsertChannelPartnerLeadProfile = async (cpLeadId, updateData) => {
  try {
    const response = await apiRequest(`/sales/channel-partner-leads/${cpLeadId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(updateData || {})
    });
    return response.data;
  } catch (error) {
    console.error('Error updating channel partner lead profile:', error);
    throw error;
  }
};

// Add follow-up to channel partner lead (CPLead) for Sales
export const addChannelPartnerLeadFollowUp = async (cpLeadId, followUpPayload) => {
  try {
    const response = await apiRequest(`/sales/channel-partner-leads/${cpLeadId}/followups`, {
      method: 'POST',
      body: JSON.stringify(followUpPayload || {})
    });
    return response.data;
  } catch (error) {
    console.error('Error adding channel partner lead follow-up:', error);
    throw error;
  }
};

// Get channel partners assigned to this sales (for sharing leads)
export const getAssignedChannelPartners = async () => {
  try {
    const response = await apiRequest('/sales/assigned-channel-partners', { method: 'GET' });
    return response.success ? (response.data || []) : [];
  } catch (error) {
    console.error('Error fetching assigned channel partners:', error);
    return [];
  }
};

// Share a sales lead with a channel partner
export const shareLeadWithCP = async (leadId, cpId) => {
  try {
    const response = await apiRequest(`/sales/leads/${leadId}/share-with-cp`, {
      method: 'POST',
      body: JSON.stringify({ cpId })
    });
    return response;
  } catch (error) {
    console.error('Error sharing lead with CP:', error);
    throw error;
  }
};

// Get all sales team members
export const getSalesTeam = async () => {
  try {
    const response = await apiRequest('/sales/team', {
      method: 'GET'
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching sales team:', error);
    return [];
  }
};

// Get my team data (for team leads only)
export const getMyTeam = async () => {
  try {
    const response = await apiRequest('/sales/my-team', {
      method: 'GET'
    });
    return response.data || { teamLead: null, teamMembers: [], teamStats: {} };
  } catch (error) {
    console.error('Error fetching my team:', error);
    throw error;
  }
};

// Request demo for lead
export const requestDemo = async (leadId, demoData) => {
  try {
    const response = await apiRequest(`/sales/leads/${leadId}/request-demo`, {
      method: 'POST',
      body: JSON.stringify(demoData)
    });
    return response.data;
  } catch (error) {
    console.error('Error requesting demo:', error);
    throw error;
  }
};

// Transfer lead to another sales employee
export const transferLead = async (leadId, transferData) => {
  try {
    const response = await apiRequest(`/sales/leads/${leadId}/transfer`, {
      method: 'POST',
      body: JSON.stringify(transferData)
    });
    return response.data;
  } catch (error) {
    console.error('Error transferring lead:', error);
    throw error;
  }
};

// Add note to lead profile
export const addNoteToLead = async (leadId, noteData) => {
  try {
    const response = await apiRequest(`/sales/leads/${leadId}/notes`, {
      method: 'POST',
      body: JSON.stringify(noteData)
    });
    return response.data;
  } catch (error) {
    console.error('Error adding note:', error);
    throw error;
  }
};

// Default export with all functions
const salesLeadService = {
  getDashboardStatistics,
  getMyLeads,
  getLeadsByStatus,
  getChannelPartnerLeads,
  getChannelPartnerLeadDetail,
  updateChannelPartnerLead,
  upsertChannelPartnerLeadProfile,
  addChannelPartnerLeadFollowUp,
  getAssignedChannelPartners,
  shareLeadWithCP,
  getLeadDetail,
  updateLeadStatus,
  createLeadProfile,
  updateLeadProfile,
  convertLeadToClient,
  getLeadCategories,
  createLead,
  getStatusDisplayName,
  getStatusColor,
  getValidStatusTransitions,
  getLeadActivities,
  getSalesTeam,
  getMyTeam,
  requestDemo,
  transferLead,
  addNoteToLead,
  addFollowUp,
  completeFollowUp,
  cancelFollowUp,
  rescheduleFollowUp
};

export default salesLeadService;
