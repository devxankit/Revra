import { apiRequest } from './baseApiService';

const API_BASE_URL = '/payments';

export const paymentService = {
  // Create a new payment record
  createPaymentRecord: async (paymentData) => {
    try {
      const response = await apiRequest(API_BASE_URL, {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payments by project
  getPaymentsByProject: async (projectId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/project/${projectId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payments by client
  getPaymentsByClient: async (clientId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/client/${clientId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update payment status
  updatePaymentStatus: async (paymentId, status, transactionId = null, notes = null) => {
    try {
      const updateData = { status };
      if (transactionId) updateData.transactionId = transactionId;
      if (notes) updateData.notes = notes;

      const response = await apiRequest(`${API_BASE_URL}/${paymentId}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payment statistics
  getPaymentStatistics: async () => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/statistics`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get project payment statistics
  getProjectPaymentStatistics: async (projectId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/project/${projectId}/statistics`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get client payment statistics
  getClientPaymentStatistics: async (clientId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/client/${clientId}/statistics`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Mark payment as completed
  markPaymentCompleted: async (paymentId, transactionId, paymentMethod = null) => {
    try {
      const updateData = {
        status: 'completed',
        transactionId
      };
      if (paymentMethod) updateData.paymentMethod = paymentMethod;

      const response = await apiRequest(`${API_BASE_URL}/${paymentId}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Mark payment as failed
  markPaymentFailed: async (paymentId, notes = null) => {
    try {
      const updateData = { status: 'failed' };
      if (notes) updateData.notes = notes;

      const response = await apiRequest(`${API_BASE_URL}/${paymentId}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Mark payment as refunded
  markPaymentRefunded: async (paymentId, notes = null) => {
    try {
      const updateData = { status: 'refunded' };
      if (notes) updateData.notes = notes;

      const response = await apiRequest(`${API_BASE_URL}/${paymentId}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payment by ID
  getPaymentById: async (paymentId) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/${paymentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get pending payments
  getPendingPayments: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      params.append('status', 'pending');
      
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.paymentType) params.append('paymentType', filters.paymentType);

      const queryString = params.toString();
      const response = await apiRequest(`${API_BASE_URL}?${queryString}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get overdue payments
  getOverduePayments: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      params.append('status', 'pending');
      params.append('overdue', 'true');
      
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.clientId) params.append('clientId', filters.clientId);

      const queryString = params.toString();
      const response = await apiRequest(`${API_BASE_URL}?${queryString}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Calculate payment summary
  calculatePaymentSummary: async (filters = {}) => {
    try {
      let payments = [];
      
      if (filters.projectId) {
        const response = await this.getPaymentsByProject(filters.projectId);
        payments = response.data;
      } else if (filters.clientId) {
        const response = await this.getPaymentsByClient(filters.clientId);
        payments = response.data;
      } else {
        const response = await this.getPaymentStatistics();
        return response;
      }

      const summary = {
        total: payments.length,
        totalAmount: 0,
        pending: { count: 0, amount: 0 },
        completed: { count: 0, amount: 0 },
        failed: { count: 0, amount: 0 },
        refunded: { count: 0, amount: 0 },
        overdue: { count: 0, amount: 0 }
      };

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      payments.forEach(payment => {
        summary.totalAmount += payment.amount;
        summary[payment.status].count++;
        summary[payment.status].amount += payment.amount;

        // Check if payment is overdue (pending for more than 30 days)
        if (payment.status === 'pending' && new Date(payment.createdAt) < thirtyDaysAgo) {
          summary.overdue.count++;
          summary.overdue.amount += payment.amount;
        }
      });

      return { success: true, data: summary };
    } catch (error) {
      throw error;
    }
  }
};
