import apiClient from '../../../../services/apiClient';

/**
 * analyticsService.js
 * Frontend service wrapper for backend Lease Renewal Campaign Analytics APIs.
 */
export const analyticsService = {
  /**
   * Fetch consolidated dashboard metrics payload.
   */
  getDashboard: async (params = {}) => {
    const response = await apiClient.get('/v1/lease-renewals/campaigns/dashboard', { params });
    return response.data?.data || response.data;
  },

  /**
   * Fetch summary KPIs (totals, SLA %, avg duration).
   */
  getSummary: async (params = {}) => {
    const response = await apiClient.get('/v1/lease-renewals/campaigns/dashboard/summary', { params });
    return response.data?.data || response.data;
  },

  /**
   * Fetch status and monthly timeline trends.
   */
  getTrends: async (params = {}) => {
    const response = await apiClient.get('/v1/lease-renewals/campaigns/dashboard/trends', { params });
    return response.data?.data || response.data;
  },

  /**
   * Fetch risk distribution and top risky properties.
   */
  getRisk: async (params = {}) => {
    const response = await apiClient.get('/v1/lease-renewals/campaigns/dashboard/risk', { params });
    return response.data?.data || response.data;
  },

  /**
   * Fetch manager workload, overdue campaigns, and upcoming expirations.
   */
  getWorkload: async (params = {}) => {
    const response = await apiClient.get('/v1/lease-renewals/campaigns/dashboard/workload', { params });
    return response.data?.data || response.data;
  },

  /**
   * Fetch recent activity feed.
   */
  getRecentActivity: async (params = {}) => {
    const response = await apiClient.get('/v1/lease-renewals/campaigns/dashboard/recent-activity', { params });
    return response.data?.data || response.data;
  }
};

export default analyticsService;
