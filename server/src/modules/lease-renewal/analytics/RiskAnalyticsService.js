import LeaseRenewalCampaign from '../../../models/LeaseRenewalCampaign.js';

/**
 * RiskAnalyticsService.js
 * Executes MongoDB aggregation pipeline for risk distribution and top risky properties.
 */
export const fetchRiskAnalytics = async (matchQuery = {}) => {
  const pipeline = [
    // Rule 6: Always start pipeline with $match before $facet/$group/$lookup
    { $match: matchQuery },
    {
      $facet: {
        riskDistribution: [
          {
            $group: {
              _id: null,
              critical: {
                $sum: {
                  $cond: [{ $and: [{ $gte: ['$riskScore', 0] }, { $lte: ['$riskScore', 30] }] }, 1, 0]
                }
              },
              high: {
                $sum: {
                  $cond: [{ $and: [{ $gt: ['$riskScore', 30] }, { $lte: ['$riskScore', 50] }] }, 1, 0]
                }
              },
              medium: {
                $sum: {
                  $cond: [{ $and: [{ $gt: ['$riskScore', 50] }, { $lte: ['$riskScore', 75] }] }, 1, 0]
                }
              },
              low: {
                $sum: {
                  $cond: [{ $and: [{ $gt: ['$riskScore', 75] }, { $lte: ['$riskScore', 100] }] }, 1, 0]
                }
              }
            }
          }
        ],
        topRiskyProperties: [
          {
            $group: {
              _id: '$property',
              propertyName: { $first: '$snapshot.propertyName' },
              propertyAddress: { $first: '$snapshot.propertyAddress' },
              avgRiskScore: { $avg: '$riskScore' },
              totalCampaigns: { $sum: 1 },
              criticalCount: {
                $sum: {
                  $cond: [{ $lte: ['$riskScore', 30] }, 1, 0]
                }
              }
            }
          },
          { $sort: { avgRiskScore: 1 } },
          { $limit: 5 }
        ]
      }
    }
  ];

  const results = await LeaseRenewalCampaign.aggregate(pipeline);
  const facetResult = results[0] || {};

  const dist = facetResult.riskDistribution?.[0] || { critical: 0, high: 0, medium: 0, low: 0 };

  return {
    riskDistribution: {
      critical: dist.critical || 0,
      high: dist.high || 0,
      medium: dist.medium || 0,
      low: dist.low || 0
    },
    topRiskyProperties: (facetResult.topRiskyProperties || []).map(p => ({
      propertyId: p._id,
      propertyName: p.propertyName || 'Property',
      propertyAddress: p.propertyAddress || '',
      avgRiskScore: p.avgRiskScore || 100,
      totalCampaigns: p.totalCampaigns || 0,
      criticalCount: p.criticalCount || 0
    }))
  };
};
