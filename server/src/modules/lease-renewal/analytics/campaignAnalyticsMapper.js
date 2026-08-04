/**
 * campaignAnalyticsMapper.js
 * 
 * Maps raw MongoDB aggregation results into standardized DTO response schemas.
 * Guarantees empty-state defaults, formatted percentages, risk band labels,
 * and future API compatibility.
 */

export const mapSummaryAnalytics = (raw = {}) => {
  const total = raw.totalCampaigns || 0;
  const active = raw.activeCampaigns || 0;
  const expiredToday = raw.expiredToday || 0;
  const escalated = raw.escalated || 0;
  const completedThisMonth = raw.completedThisMonth || 0;
  const slaBreachedCount = raw.slaBreachedCount || 0;

  const slaCompliantCount = Math.max(0, total - slaBreachedCount);
  const slaCompliancePercentage = total > 0 
    ? Number(((slaCompliantCount / total) * 100).toFixed(1)) 
    : 100;

  const avgApprovalHours = raw.avgApprovalDurationHours ? Number(raw.avgApprovalDurationHours.toFixed(1)) : 0;
  const avgNegotiationDays = raw.avgNegotiationDurationDays ? Number(raw.avgNegotiationDurationDays.toFixed(1)) : 0;

  return {
    totalCampaigns: total,
    activeCampaigns: active,
    expiredToday,
    escalated,
    completedThisMonth,
    slaMetrics: {
      slaBreachedCount,
      slaCompliantCount,
      slaCompliancePercentage,
      slaComplianceFormatted: `${slaCompliancePercentage.toFixed(1)}%`
    },
    performanceMetrics: {
      averageApprovalTimeHours: avgApprovalHours,
      averageNegotiationDurationDays: avgNegotiationDays
    }
  };
};

export const mapRiskAnalytics = (raw = {}) => {
  const distribution = raw.riskDistribution || { critical: 0, high: 0, medium: 0, low: 0 };
  const total = (distribution.critical || 0) + (distribution.high || 0) + (distribution.medium || 0) + (distribution.low || 0);

  const formatBand = (count, label, key) => {
    const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
    return {
      key,
      label,
      count,
      percentage,
      formattedPercentage: `${percentage.toFixed(1)}%`
    };
  };

  const bands = [
    formatBand(distribution.critical || 0, 'Critical Risk (0-30)', 'critical'),
    formatBand(distribution.high || 0, 'High Risk (31-50)', 'high'),
    formatBand(distribution.medium || 0, 'Medium Risk (51-75)', 'medium'),
    formatBand(distribution.low || 0, 'Low Risk (76-100)', 'low')
  ];

  const topRiskyProperties = (raw.topRiskyProperties || []).map(p => ({
    propertyId: p.propertyId || p._id,
    propertyName: p.propertyName || p.name || 'Unknown Property',
    propertyAddress: p.propertyAddress || p.address || '',
    averageRiskScore: p.avgRiskScore ? Number(p.avgRiskScore.toFixed(1)) : 100,
    totalCampaigns: p.totalCampaigns || 0,
    criticalCount: p.criticalCount || 0
  }));

  return {
    totalEvaluated: total,
    bands,
    distribution,
    topRiskyProperties
  };
};

export const mapTrendAnalytics = (raw = {}) => {
  const statusDistribution = (raw.statusDistribution || []).map(s => ({
    status: s._id || s.status,
    count: s.count || 0
  }));

  const monthlyTrends = (raw.monthlyTrends || []).map(m => ({
    yearMonth: m._id || m.yearMonth,
    created: m.created || 0,
    completed: m.completed || 0,
    expired: m.expired || 0
  }));

  return {
    statusDistribution,
    monthlyTrends
  };
};

export const mapWorkloadAnalytics = (raw = {}) => {
  const managerWorkload = (raw.managerWorkload || []).map(m => ({
    managerId: m.managerId || m._id,
    managerName: m.managerName || 'Unassigned',
    totalAssigned: m.totalAssigned || 0,
    activeCount: m.activeCount || 0,
    escalatedCount: m.escalatedCount || 0,
    averageRiskScore: m.avgRiskScore ? Number(m.avgRiskScore.toFixed(1)) : 100
  }));

  const overdueCampaigns = (raw.overdueCampaigns || []).map(c => ({
    id: c._id,
    campaignNumber: c.campaignNumber,
    status: c.status,
    slaStatus: c.slaStatus,
    expiryDate: c.expiryDate,
    tenantName: c.snapshot?.tenantName || 'N/A',
    propertyName: c.snapshot?.propertyName || 'N/A',
    managerName: c.snapshot?.managerName || 'N/A'
  }));

  const upcomingExpirations = (raw.upcomingExpirations || []).map(c => ({
    id: c._id,
    campaignNumber: c.campaignNumber,
    status: c.status,
    expiryDate: c.expiryDate,
    daysRemaining: c.expiryDate ? Math.max(0, Math.ceil((new Date(c.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24))) : 0,
    tenantName: c.snapshot?.tenantName || 'N/A',
    propertyName: c.snapshot?.propertyName || 'N/A'
  }));

  return {
    managerWorkload,
    overdueCampaigns,
    upcomingExpirations
  };
};

export const mapRecentActivityAnalytics = (raw = []) => {
  return raw.map(activity => ({
    id: activity._id,
    campaignNumber: activity.campaignNumber,
    action: activity.action || activity.status,
    status: activity.status,
    slaStatus: activity.slaStatus,
    timestamp: activity.updatedAt || activity.createdAt,
    tenantName: activity.snapshot?.tenantName || 'N/A',
    propertyName: activity.snapshot?.propertyName || 'N/A',
    managerName: activity.snapshot?.managerName || 'N/A'
  }));
};

export const mapDashboardPayload = (summary, risk, trends, workload, recentActivity) => {
  return {
    summary: mapSummaryAnalytics(summary),
    risk: mapRiskAnalytics(risk),
    trends: mapTrendAnalytics(trends),
    workload: mapWorkloadAnalytics(workload),
    recentActivity: mapRecentActivityAnalytics(recentActivity),
    generatedAt: new Date().toISOString()
  };
};
