import LeaseRenewalCampaign from '../../../models/LeaseRenewalCampaign.js';
import { RenewalCampaignStatus } from '../campaignConstants.js';

/**
 * TrendAnalyticsService.js
 * Executes MongoDB aggregation pipeline for status distributions and monthly creation/completion trends.
 */
export const fetchTrendAnalytics = async (matchQuery = {}) => {
  const pipeline = [
    // Rule 6: Always start pipeline with $match before $facet/$group
    { $match: matchQuery },
    {
      $facet: {
        statusDistribution: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } }
        ],
        monthlyTrends: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              created: { $sum: 1 },
              completed: {
                $sum: {
                  $cond: [{ $eq: ['$status', RenewalCampaignStatus.COMPLETED] }, 1, 0]
                }
              },
              expired: {
                $sum: {
                  $cond: [{ $eq: ['$status', RenewalCampaignStatus.EXPIRED] }, 1, 0]
                }
              }
            }
          },
          { $sort: { _id: 1 } },
          { $limit: 12 }
        ]
      }
    }
  ];

  const results = await LeaseRenewalCampaign.aggregate(pipeline);
  const facetResult = results[0] || {};

  return {
    statusDistribution: facetResult.statusDistribution || [],
    monthlyTrends: facetResult.monthlyTrends || []
  };
};
