export const toCampaignDto = (campaign) => {
  if (!campaign) return null;
  return {
    id: campaign._id,
    campaignNumber: campaign.campaignNumber,
    status: campaign.status,
    priority: campaign.priority,
    source: campaign.source,
    riskScore: campaign.riskScore,
    expiryDate: campaign.expiryDate,
    slaLimitDate: campaign.slaLimitDate,
    slaStatus: campaign.slaStatus,
    snapshot: campaign.snapshot,
    lifecycle: campaign.lifecycle,
    metrics: campaign.metrics,
    version: campaign.version,
    tags: campaign.tags || [],
    labels: campaign.labels || [],
    customFields: campaign.customFields || {},
    metadata: campaign.metadata || {},
    lastActivityAt: campaign.lastActivityAt
  };
};
