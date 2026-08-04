import LeaseRenewalCampaign from '../../../models/LeaseRenewalCampaign.js';

/**
 * DashboardAnalyticsService.js
 * Queries recent activity feed for the manager dashboard.
 */
export const fetchRecentActivity = async (matchQuery = {}, limit = 10) => {
  return await LeaseRenewalCampaign.find(matchQuery)
    .select('campaignNumber status slaStatus snapshot createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
};
