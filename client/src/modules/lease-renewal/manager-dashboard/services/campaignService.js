import apiClient from '../../../../services/apiClient';

/**
 * campaignService.js
 * Frontend service wrapper for Lease Renewal Campaign operations.
 */
export const campaignService = {
  /**
   * Fetch paginated campaigns list with filters.
   */
  getCampaigns: async (params = {}) => {
    const response = await apiClient.get('/v1/lease-renewals/campaigns/index', { params });
    return response.data || { success: true, data: [], meta: { total: 0 } };
  },

  /**
   * Fetch details of a single campaign by ID.
   */
  getCampaignDetails: async (id) => {
    const response = await apiClient.get(`/v1/lease-renewals/campaigns/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Transition campaign status (e.g. escalated, negotiating, approved, expired, cancelled).
   */
  transitionStatus: async (id, status, reason = '') => {
    const response = await apiClient.post(`/v1/lease-renewals/campaigns/${id}/transition`, { status, reason });
    return response.data?.data || response.data;
  },

  /**
   * Create a new campaign for a lease.
   */
  createCampaign: async (leaseId, source = 'manual') => {
    const response = await apiClient.post('/v1/lease-renewals/campaigns', { leaseId, source });
    return response.data?.data || response.data;
  }
};

export default campaignService;
