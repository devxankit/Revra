import { apiRequest } from './baseApiService';

// Admin Project Expense Category Service
export const adminProjectExpenseCategoryService = {
  // Get all categories
  getAllCategories: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/admin/project-expense-categories?${queryString}` : '/admin/project-expense-categories';
      
      const response = await apiRequest(url, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get category by ID
  getCategoryById: async (categoryId) => {
    try {
      const response = await apiRequest(`/admin/project-expense-categories/${categoryId}`, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create category
  createCategory: async (categoryData) => {
    try {
      const response = await apiRequest('/admin/project-expense-categories', {
        method: 'POST',
        body: JSON.stringify(categoryData)
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update category
  updateCategory: async (categoryId, categoryData) => {
    try {
      const response = await apiRequest(`/admin/project-expense-categories/${categoryId}`, {
        method: 'PUT',
        body: JSON.stringify(categoryData)
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete category
  deleteCategory: async (categoryId) => {
    try {
      const response = await apiRequest(`/admin/project-expense-categories/${categoryId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default adminProjectExpenseCategoryService;
