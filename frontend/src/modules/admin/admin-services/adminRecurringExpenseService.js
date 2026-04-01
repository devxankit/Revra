import { apiRequest } from './baseApiService';

// Create new recurring expense
const createRecurringExpense = async (expenseData) => {
  const res = await apiRequest('/admin/users/recurring-expenses', {
    method: 'POST',
    body: JSON.stringify(expenseData)
  });
  return res;
};

// Get all recurring expenses with filters
const getAllRecurringExpenses = async (params = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.status && params.status !== 'all') queryParams.append('status', params.status);
  if (params.category && params.category !== 'all') queryParams.append('category', params.category);
  if (params.frequency && params.frequency !== 'all') queryParams.append('frequency', params.frequency);
  if (params.search) queryParams.append('search', params.search);
  
  const query = queryParams.toString();
  const url = `/admin/users/recurring-expenses${query ? `?${query}` : ''}`;
  const res = await apiRequest(url, { method: 'GET' });
  return res;
};

// Get single recurring expense by ID
const getRecurringExpenseById = async (id) => {
  const res = await apiRequest(`/admin/users/recurring-expenses/${id}`, { method: 'GET' });
  return res;
};

// Update recurring expense
const updateRecurringExpense = async (id, updates) => {
  const res = await apiRequest(`/admin/users/recurring-expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  return res;
};

// Delete recurring expense
const deleteRecurringExpense = async (id) => {
  const res = await apiRequest(`/admin/users/recurring-expenses/${id}`, {
    method: 'DELETE'
  });
  return res;
};

// Generate expense entries for a recurring expense
const generateExpenseEntries = async (id) => {
  const res = await apiRequest(`/admin/users/recurring-expenses/${id}/generate-entries`, {
    method: 'POST'
  });
  return res;
};

// Get expense entries with filters
const getExpenseEntries = async (params = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.recurringExpenseId) queryParams.append('recurringExpenseId', params.recurringExpenseId);
  if (params.month) queryParams.append('month', params.month);
  if (params.year) queryParams.append('year', params.year);
  if (params.status && params.status !== 'all') queryParams.append('status', params.status);
  if (params.category && params.category !== 'all') queryParams.append('category', params.category);
  
  const query = queryParams.toString();
  const url = `/admin/users/recurring-expenses/entries${query ? `?${query}` : ''}`;
  const res = await apiRequest(url, { method: 'GET' });
  return res;
};

// Mark expense entry as paid
const markEntryAsPaid = async (entryId, paymentData) => {
  const res = await apiRequest(`/admin/users/recurring-expenses/entries/${entryId}/pay`, {
    method: 'PUT',
    body: JSON.stringify(paymentData)
  });
  return res;
};

export const adminRecurringExpenseService = {
  createRecurringExpense,
  getAllRecurringExpenses,
  getRecurringExpenseById,
  updateRecurringExpense,
  deleteRecurringExpense,
  generateExpenseEntries,
  getExpenseEntries,
  markEntryAsPaid
};

export default adminRecurringExpenseService;

