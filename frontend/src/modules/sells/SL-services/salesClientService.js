import { apiRequest } from './baseApiService';
import { getApiUrl } from '../../../config/env';

/**
 * Get client profile with project details
 * @param {string} clientId - Client ID
 * @param {string} [projectId] - Optional project ID to focus on
 * @returns {Promise} Client profile data
 */
export const getClientProfile = async (clientId, projectId) => {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const url = `/sales/clients/${clientId}/profile${query}`;
  return apiRequest(url, { method: 'GET' });
};

/**
 * Create payment receipt for client
 * @param {string} clientId - Client ID
 * @param {Object} paymentData - Payment data (amount, accountId, method, referenceId, notes)
 * @returns {Promise} Created payment receipt
 */
export const createPayment = async (clientId, paymentData) => {
  const url = `/sales/clients/${clientId}/payments`;
  return apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(paymentData)
  });
};

/**
 * Get accounts list (for payment dropdown)
 * @returns {Promise<Array>} List of active accounts (same shape as salesPaymentsService.getAccounts)
 */
export const getAccounts = async () => {
  const url = `/sales/accounts`;
  const res = await apiRequest(url, { method: 'GET' });
  return res?.data ?? [];
};

/**
 * Create project request (accelerate/hold work)
 * @param {string} clientId - Client ID
 * @param {Object} requestData - Request data (requestType: 'accelerate_work' | 'hold_work', reason)
 * @returns {Promise} Created request
 */
export const createProjectRequest = async (clientId, requestData) => {
  const url = `/sales/clients/${clientId}/project-requests`;
  return apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(requestData)
  });
};

/**
 * Get project requests for client
 * @param {string} clientId - Client ID
 * @returns {Promise} List of project requests
 */
export const getProjectRequests = async (clientId) => {
  const url = `/sales/clients/${clientId}/project-requests`;
  return apiRequest(url, { method: 'GET' });
};

/**
 * Increase project cost
 * @param {string} clientId - Client ID
 * @param {Object} costData - Cost data (amount, reason)
 * @returns {Promise} Updated project data
 */
export const increaseCost = async (clientId, costData) => {
  const url = `/sales/clients/${clientId}/increase-cost`;
  return apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(costData)
  });
};

/**
 * Transfer client to another sales employee
 * @param {string} clientId - Client ID
 * @param {string} newSalesId - New sales employee ID
 * @param {string} reason - Optional reason for transfer
 * @returns {Promise} Transfer result
 */
export const transferClient = async (clientId, newSalesId, reason = '') => {
  const url = `/sales/clients/${clientId}/transfer`;
  return apiRequest(url, {
    method: 'POST',
    body: JSON.stringify({
      toSalesId: newSalesId,
      reason: reason
    })
  });
};

/**
 * Mark project as completed (No Dues)
 * @param {string} clientId - Client ID
 * @returns {Promise} Updated project data
 */
export const markCompleted = async (clientId) => {
  const url = `/sales/clients/${clientId}/mark-completed`;
  return apiRequest(url, {
    method: 'POST'
  });
};

/**
 * Get transaction history for client
 * @param {string} clientId - Client ID
 * @returns {Promise} List of transactions
 */
export const getTransactions = async (clientId) => {
  const url = `/sales/clients/${clientId}/transactions`;
  return apiRequest(url, { method: 'GET' });
};

/**
 * Get sales team list (for transfer dropdown)
 * @returns {Promise} List of sales employees
 */
export const getSalesTeam = async () => {
  const url = `/sales/team`;
  return apiRequest(url, { method: 'GET' });
};

/**
 * Create a new project for an existing client
 * @param {string} clientId - Client ID
 * @param {Object} projectData - Project data (same shape as salesLeadService.convertLeadToClient)
 * @returns {Promise} Created project + client data
 */
export const createProjectForClient = async (clientId, projectData) => {
  const hasFile = projectData?.screenshot && projectData.screenshot instanceof File;

  if (hasFile) {
    const token = localStorage.getItem('salesToken');
    const apiUrl = getApiUrl(`/sales/clients/${clientId}/projects`);
    const formData = new FormData();

    formData.append('projectName', projectData.projectName || '');
    if (projectData.categoryId || projectData.category) {
      formData.append('categoryId', projectData.categoryId || projectData.category);
    }
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
  }

  const url = `/sales/clients/${clientId}/projects`;
  const res = await apiRequest(url, {
    method: 'POST',
    body: JSON.stringify({ projectData })
  });
  return res?.data ?? res;
};

export default {
  getClientProfile,
  createPayment,
  getAccounts,
  createProjectRequest,
  getProjectRequests,
  increaseCost,
  transferClient,
  markCompleted,
  getTransactions,
  getSalesTeam,
  createProjectForClient
};

