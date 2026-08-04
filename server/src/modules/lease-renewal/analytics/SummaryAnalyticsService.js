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
 * SummaryAnalyticsService.js
 * Executes MongoDB aggregation pipeline for high-level summary KPIs.
 */
export const fetchSummaryAnalytics = async (matchQuery = {}) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const pipeline = [
    // Rule 6: Always start pipeline with $match before $facet/$group
    { $match: matchQuery },
    {
      $facet: {
        totalCampaigns: [{ $count: 'count' }],
        activeCampaigns: [
          { $match: { status: { $in: ACTIVE_STATUSES } } },
          { $count: 'count' }
        ],
        expiredToday: [
          { 
            $match: { 
              status: RenewalCampaignStatus.EXPIRED,
              $or: [
                { 'lifecycle.expiredAt': { $gte: startOfToday } },
                { updatedAt: { $gte: startOfToday } }
              ]
            } 
          },
          { $count: 'count' }
        ],
        escalated: [
          {
            $match: {
              $or: [
                { status: RenewalCampaignStatus.ESCALATED },
                { slaStatus: 'breached' }
              ]
            }
          },
          { $count: 'count' }
        ],
        completedThisMonth: [
          {
            $match: {
              status: RenewalCampaignStatus.COMPLETED,
              $or: [
                { 'lifecycle.completedAt': { $gte: startOfMonth } },
                { updatedAt: { $gte: startOfMonth } }
              ]
            }
          },
          { $count: 'count' }
        ],
        slaBreached: [
          { $match: { slaStatus: 'breached' } },
          { $count: 'count' }
        ],
        avgApprovalTime: [
          {
            $match: {
              'lifecycle.approvedAt': { $exists: true },
              'lifecycle.negotiationStartedAt': { $exists: true }
            }
          },
          {
            $project: {
              durationHours: {
                $divide: [
                  { $subtract: ['$lifecycle.approvedAt', '$lifecycle.negotiationStartedAt'] },
                  1000 * 60 * 60
                ]
              }
            }
          },
          { $group: { _id: null, avgHours: { $avg: '$durationHours' } } }
        ],
        avgNegotiationDuration: [
          {
            $match: {
              status: { $in: [RenewalCampaignStatus.APPROVED, RenewalCampaignStatus.COMPLETED] },
              'lifecycle.negotiationStartedAt': { $exists: true }
            }
          },
          {
            $project: {
              durationDays: {
                $divide: [
                  { 
                    $subtract: [
                      { $ifNull: ['$lifecycle.completedAt', '$lifecycle.approvedAt'] }, 
                      '$lifecycle.negotiationStartedAt'
                    ] 
                  },
                  1000 * 60 * 60 * 24
                ]
              }
            }
          },
          { $group: { _id: null, avgDays: { $avg: '$durationDays' } } }
        ]
      }
    }
  ];

  const results = await LeaseRenewalCampaign.aggregate(pipeline);
  const facetResult = results[0] || {};

  return {
    totalCampaigns: facetResult.totalCampaigns?.[0]?.count || 0,
    activeCampaigns: facetResult.activeCampaigns?.[0]?.count || 0,
    expiredToday: facetResult.expiredToday?.[0]?.count || 0,
    escalated: facetResult.escalated?.[0]?.count || 0,
    completedThisMonth: facetResult.completedThisMonth?.[0]?.count || 0,
    slaBreachedCount: facetResult.slaBreached?.[0]?.count || 0,
    avgApprovalDurationHours: facetResult.avgApprovalTime?.[0]?.avgHours || 0,
    avgNegotiationDurationDays: facetResult.avgNegotiationDuration?.[0]?.avgDays || 0
  };
};
