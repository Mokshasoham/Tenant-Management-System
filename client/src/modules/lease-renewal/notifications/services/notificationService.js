import apiClient from '../../../../services/apiClient';

/**
 * notificationService.js
 * Centralized REST client for Notification API operations.
 *
 * NOTE: apiClient's response interceptor returns `response.data` directly,
 * so every method here receives the already-unwrapped response body.
 * Do NOT chain .data again on the result.
 */
export const notificationService = {
    /**
     * Fetch paginated notifications with filters (offset & cursor support)
     */
    getNotifications: async (params = {}) => {
        const response = await apiClient.get('/v1/notifications', { params });
        // response is already the body: { success, data, pagination, metrics }
        return response || { success: true, data: [], pagination: {} };
    },

    /**
     * Light endpoint to get current unread count
     */
    getUnreadCount: async (params = {}) => {
        const response = await apiClient.get('/v1/notifications/unread-count', { params });
        // response = { success: true, data: { unreadCount: N } }
        return response?.data?.unreadCount ?? response?.unreadCount ?? 0;
    },

    /**
     * Mark single notification read
     */
    markAsRead: async (id) => {
        const response = await apiClient.patch(`/v1/notifications/${id}/read`);
        // response = { success, message, data: notificationDTO }
        return response?.data || response;
    },

    /**
     * Bulk mark selected notifications read
     * POST body: { notificationIds: string[] }
     */
    bulkMarkAsRead: async (notificationIds) => {
        console.log('[notificationService] bulkMarkAsRead called with IDs:', notificationIds);
        const response = await apiClient.patch('/v1/notifications/bulk-read', { notificationIds });
        // response = { success, message, data: { modifiedCount } }
        console.log('[notificationService] bulkMarkAsRead response:', response);
        return response;
    },

    /**
     * Mark all notifications read for current user
     */
    markAllAsRead: async () => {
        const response = await apiClient.patch('/v1/notifications/read-all');
        return response;
    },

    /**
     * Soft-delete single notification
     */
    deleteNotification: async (id) => {
        const response = await apiClient.delete(`/v1/notifications/${id}`);
        return response;
    },

    /**
     * Bulk soft-delete selected notifications
     * POST body: { notificationIds: string[] }
     */
    bulkDelete: async (notificationIds) => {
        console.log('[notificationService] bulkDelete called with IDs:', notificationIds);
        const response = await apiClient.post('/v1/notifications/bulk-delete', { notificationIds });
        // response = { success, message, data: { modifiedCount } }
        console.log('[notificationService] bulkDelete response:', response);
        return response;
    },

    /**
     * Soft-delete all read notifications for current user
     */
    clearAllRead: async () => {
        console.log('[notificationService] clearAllRead called');
        const response = await apiClient.delete('/v1/notifications/clear-read');
        console.log('[notificationService] clearAllRead response:', response);
        return response;
    }
};

export default notificationService;
