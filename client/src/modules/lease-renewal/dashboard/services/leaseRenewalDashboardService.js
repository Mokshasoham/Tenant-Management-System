import apiClient from '../../../../services/apiClient';

/**
 * Service to fetch tenant dashboard data and initiate renewals.
 */
export const leaseRenewalDashboardService = {
  /**
   * Fetch aggregated lease renewal dashboard metrics.
   */
  getDashboardData: async (params = {}) => {
    const response = await apiClient.get('/v1/lease-renewals/dashboard', { params });
    return response.data?.data || response.data;
  },

  /**
   * Submit a new lease renewal request.
   */
  submitRenewalRequest: async (payload) => {
    const response = await apiClient.post('/v1/lease-renewals', payload);
    return response.data?.data || response.data;
  },

  /**
   * Update an existing lease renewal request (e.g. modify rent/duration).
   */
  updateRenewalRequest: async (id, payload) => {
    const response = await apiClient.put(`/v1/lease-renewals/${id}`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Cancel / delete a renewal request.
   */
  cancelRenewalRequest: async (id) => {
    const response = await apiClient.delete(`/v1/lease-renewals/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Submit a counter offer.
   */
  submitCounterOffer: async (id, payload) => {
    const response = await apiClient.post(`/v1/lease-renewals/${id}/offers`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Post message inside the negotiation chat.
   */
  postMessage: async (id, content) => {
    const response = await apiClient.post(`/v1/lease-renewals/${id}/messages`, { content });
    return response.data?.data || response.data;
  },

  /**
   * Approve/accept lease renewal terms.
   */
  approveRenewal: async (id) => {
    const response = await apiClient.post(`/v1/lease-renewals/${id}/approve`);
    return response.data?.data || response.data;
  },

  /**
   * Digitally sign the lease renewal agreement.
   */
  signRenewal: async (id, signatureData) => {
    const response = await apiClient.post(`/v1/lease-renewals/${id}/sign`, { signatureData });
    return response.data?.data || response.data;
  }
};
