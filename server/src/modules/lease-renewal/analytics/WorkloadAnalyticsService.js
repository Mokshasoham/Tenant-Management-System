import LeaseRenewalCampaign from '../../../models/LeaseRenewalCampaign.js';
import { RenewalCampaignStatus } from '../campaignConstants.js';

const ACTIVE_STATUSES = [
  RenewalCampaignStatus.DRAFT,
  RenewalCampaignStatus.CREATED,
  RenewalCampaignStatus.WAITING_FOR_TENANT,
  RenewalCampaignStatus.WAITING_FOR_MANAGER,
  RenewalCampaignStatus.NEGOTIATING,
  RenewalCampaignStatus.PENDING_SIGNATURE,
  RenewalCampaignStatus.APPROVED,
  RenewalCampaignStatus.ESCALATED
];

/**
 * WorkloadAnalyticsService.js
 * Executes MongoDB aggregation pipeline for manager workload, overdue campaigns, and upcoming expirations.
 */
export const fetchWorkloadAnalytics = async (matchQuery = {}) => {
  const now = new Date();
  const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const pipeline = [
    // Rule 6: Always start pipeline with $match before $facet/$group
    { $match: matchQuery },
    {
      $facet: {
        managerWorkload: [
          {
            $group: {
              _id: '$manager',
              managerName: { $first: '$snapshot.managerName' },
              totalAssigned: { $sum: 1 },
              activeCount: {
                $sum: {
                  $cond: [{ $in: ['$status', ACTIVE_STATUSES] }, 1, 0]
                }
              },
              escalatedCount: {
                $sum: {
                  $cond: [{ $or: [{ $eq: ['$status', RenewalCampaignStatus.ESCALATED] }, { $eq: ['$slaStatus', 'breached'] }] }, 1, 0]
                }
              },
              avgRiskScore: { $avg: '$riskScore' }
            }
          },
          { $sort: { activeCount: -1 } },
          { $limit: 10 }
        ],
        overdueCampaigns: [
          {
            $match: {
              status: { $in: ACTIVE_STATUSES },
              $or: [
                { expiryDate: { $lt: now } },
                { slaStatus: 'breached' }
              ]
            }
          },
          { $sort: { expiryDate: 1 } },
          { $limit: 10 }
        ],
        upcomingExpirations: [
          {
            $match: {
              status: { $in: ACTIVE_STATUSES },
              expiryDate: { $gte: now, $lte: next30Days }
            }
          },
          { $sort: { expiryDate: 1 } },
          { $limit: 10 }
        ]
      }
    }
  ];

  const results = await LeaseRenewalCampaign.aggregate(pipeline);
  const facetResult = results[0] || {};

  return {
    managerWorkload: facetResult.managerWorkload || [],
    overdueCampaigns: facetResult.overdueCampaigns || [],
    upcomingExpirations: facetResult.upcomingExpirations || []
  };
};
