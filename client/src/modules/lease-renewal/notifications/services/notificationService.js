import apiClient from '../../../../services/apiClient';

/**
 * notificationService.js
 * Centralized REST client for Notification API operations
 */
export const notificationService = {
    /**
     * Fetch paginated notifications with filters (offset & cursor support)
     */
    getNotifications: async (params = {}) => {
        const response = await apiClient.get('/v1/notifications', { params });
        return response.data || { success: true, data: [], pagination: {} };
    },

    /**
     * Light endpoint to get current unread count
     */
    getUnreadCount: async () => {
        const response = await apiClient.get('/v1/notifications/unread-count');
        return response.data?.data?.unreadCount ?? 0;
    },

    /**
     * Mark single notification read
     */
    markAsRead: async (id) => {
        const response = await apiClient.patch(`/v1/notifications/${id}/read`);
        return response.data?.data || response.data;
    },

    /**
     * Bulk mark selected notifications read
     */
    bulkMarkAsRead: async (notificationIds) => {
        const response = await apiClient.patch('/v1/notifications/bulk-read', { notificationIds });
        return response.data;
    },

    /**
     * Mark all notifications read for current user
     */
    markAllAsRead: async () => {
        const response = await apiClient.patch('/v1/notifications/read-all');
        return response.data;
    },

    /**
     * Soft-delete single notification
     */
    deleteNotification: async (id) => {
        const response = await apiClient.delete(`/v1/notifications/${id}`);
        return response.data;
    },

    /**
     * Bulk soft-delete selected notifications
     */
    bulkDelete: async (notificationIds) => {
        const response = await apiClient.post('/v1/notifications/bulk-delete', { notificationIds });
        return response.data;
    },

    /**
     * Soft-delete all read notifications
     */
    clearAllRead: async () => {
        const response = await apiClient.delete('/v1/notifications/clear-read');
        return response.data;
    }
};

export default notificationService;
