import { apiRequest } from './baseApiService';

// Admin Finance Management Service
export const adminFinanceService = {
  // Get financial overview
  getFinancialOverview: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/admin/finance/overview?${queryString}` : '/admin/finance/overview';
      
      const response = await apiRequest(url, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get transactions
  getTransactions: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/admin/finance/transactions?${queryString}` : '/admin/finance/transactions';
      
      const response = await apiRequest(url, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get revenue reports
  getRevenueReports: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/admin/finance/revenue?${queryString}` : '/admin/finance/revenue';
      
      const response = await apiRequest(url, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get expense reports
  getExpenseReports: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/admin/finance/expenses?${queryString}` : '/admin/finance/expenses';
      
      const response = await apiRequest(url, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create transaction
  createTransaction: async (transactionData) => {
    try {
      const response = await apiRequest('/admin/finance/transactions', {
        method: 'POST',
        body: JSON.stringify(transactionData)
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update transaction
  updateTransaction: async (transactionId, transactionData) => {
    try {
      const response = await apiRequest(`/admin/finance/transactions/${transactionId}`, {
        method: 'PUT',
        body: JSON.stringify(transactionData)
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete transaction
  deleteTransaction: async (transactionId) => {
    try {
      const response = await apiRequest(`/admin/finance/transactions/${transactionId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get transaction statistics
  getTransactionStats: async (timeFilter = 'all') => {
    try {
      const response = await apiRequest(`/admin/finance/transactions/stats?timeFilter=${timeFilter}`, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get single transaction
  getTransaction: async (transactionId) => {
    try {
      const response = await apiRequest(`/admin/finance/transactions/${transactionId}`, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // ========== ACCOUNT MANAGEMENT ==========

  // Get all accounts
  getAccounts: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/admin/finance/accounts?${queryString}` : '/admin/finance/accounts';
      
      const response = await apiRequest(url, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get single account
  getAccount: async (accountId) => {
    try {
      const response = await apiRequest(`/admin/finance/accounts/${accountId}`, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create account
  createAccount: async (accountData) => {
    try {
      const response = await apiRequest('/admin/finance/accounts', {
        method: 'POST',
        body: JSON.stringify(accountData)
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update account
  updateAccount: async (accountId, accountData) => {
    try {
      const response = await apiRequest(`/admin/finance/accounts/${accountId}`, {
        method: 'PUT',
        body: JSON.stringify(accountData)
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete account
  deleteAccount: async (accountId) => {
    try {
      const response = await apiRequest(`/admin/finance/accounts/${accountId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // ========== EXPENSE MANAGEMENT ==========

  // Get all expenses
  getExpenses: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/admin/finance/expenses?${queryString}` : '/admin/finance/expenses';
      
      const response = await apiRequest(url, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get single expense
  getExpense: async (expenseId) => {
    try {
      const response = await apiRequest(`/admin/finance/expenses/${expenseId}`, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create expense
  createExpense: async (expenseData) => {
    try {
      const response = await apiRequest('/admin/finance/expenses', {
        method: 'POST',
        body: JSON.stringify(expenseData)
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update expense
  updateExpense: async (expenseId, expenseData) => {
    try {
      const response = await apiRequest(`/admin/finance/expenses/${expenseId}`, {
        method: 'PUT',
        body: JSON.stringify(expenseData)
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete expense
  deleteExpense: async (expenseId) => {
    try {
      const response = await apiRequest(`/admin/finance/expenses/${expenseId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Approve expense
  approveExpense: async (expenseId) => {
    try {
      const response = await apiRequest(`/admin/finance/expenses/${expenseId}/approve`, {
        method: 'PUT'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // ========== PROJECT EXPENSE MANAGEMENT ==========

  // Get all project expenses
  getProjectExpenses: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/admin/project-expenses?${queryString}` : '/admin/project-expenses';
      
      const response = await apiRequest(url, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get expenses for a specific project
  getProjectExpensesByProject: async (projectId, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString 
        ? `/admin/project-expenses/project/${projectId}?${queryString}` 
        : `/admin/project-expenses/project/${projectId}`;
      
      const response = await apiRequest(url, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create project expense
  createProjectExpense: async (expenseData) => {
    try {
      const response = await apiRequest('/admin/project-expenses', {
        method: 'POST',
        body: JSON.stringify(expenseData)
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update project expense
  updateProjectExpense: async (expenseId, expenseData) => {
    try {
      const response = await apiRequest(`/admin/project-expenses/${expenseId}`, {
        method: 'PUT',
        body: JSON.stringify(expenseData)
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete project expense
  deleteProjectExpense: async (expenseId) => {
    try {
      const response = await apiRequest(`/admin/project-expenses/${expenseId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get project expense statistics
  getProjectExpenseStats: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/admin/project-expenses/stats?${queryString}` : '/admin/project-expenses/stats';
      
      const response = await apiRequest(url, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // ========== BUDGET MANAGEMENT ==========

  // Get all budgets
  getBudgets: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/admin/finance/budgets?${queryString}` : '/admin/finance/budgets';
      
      const response = await apiRequest(url, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get single budget
  getBudget: async (budgetId) => {
    try {
      const response = await apiRequest(`/admin/finance/budgets/${budgetId}`, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create budget
  createBudget: async (budgetData) => {
    try {
      const response = await apiRequest('/admin/finance/budgets', {
        method: 'POST',
        body: JSON.stringify(budgetData)
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update budget
  updateBudget: async (budgetId, budgetData) => {
    try {
      const response = await apiRequest(`/admin/finance/budgets/${budgetId}`, {
        method: 'PUT',
        body: JSON.stringify(budgetData)
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete budget
  deleteBudget: async (budgetId) => {
    try {
      const response = await apiRequest(`/admin/finance/budgets/${budgetId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // ========== FINANCE STATISTICS ==========

  // Get comprehensive finance statistics
  getFinanceStatistics: async (timeFilter = 'all', params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('timeFilter', timeFilter);
      
      // Add date parameters if provided
      if (params.startDate) {
        queryParams.append('startDate', params.startDate);
      }
      if (params.endDate) {
        queryParams.append('endDate', params.endDate);
      }
      
      const response = await apiRequest(`/admin/finance/statistics?${queryParams.toString()}`, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get all projects with pending recovery (outstanding amount to collect)
  getPendingRecovery: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/admin/finance/pending-recovery?${queryString}` : '/admin/finance/pending-recovery';
      const response = await apiRequest(url, { method: 'GET' });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get all GST projects (projects with includeGST = true) for finance management
  getGstProjects: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/admin/finance/gst-projects?${queryString}` : '/admin/finance/gst-projects';
      const response = await apiRequest(url, { method: 'GET' });
      return response;
    } catch (error) {
      throw error;
    }
  },

};

export default adminFinanceService;
