import { apiRequest } from './baseApiService';

export const cpNotificationService = {
  // Get all notifications
  getNotifications: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/cp/notifications${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(url, { method: 'GET' });
  },

  // Get unread count
  getUnreadCount: async () => {
    return await apiRequest('/cp/notifications/unread-count', { method: 'GET' });
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    return await apiRequest(`/cp/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    return await apiRequest('/cp/notifications/read-all', {
      method: 'PATCH'
    });
  }
};

export default cpNotificationService;
