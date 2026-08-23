/**
 * Property Verification Data Transformation Mapper
 * Standardizes raw API responses into clean, UI-ready domain models for Property verification.
 * Decouples property views from backend schema changes and prevents mock data leakage.
 */

/**
 * Maps raw property verification record to standardized UI verification state.
 */
export function mapVerification(raw) {
  if (!raw) {
    return {
      id: null,
      verificationNumber: 'N/A',
      status: 'NOT_SUBMITTED',
      entityType: 'PROPERTY',
      entityId: null,
      currentReviewLevel: 0,
      trustScore: 0,
      badge: 'UNVERIFIED',
      propertyLevel: 'Unverified Property',
      submittedAt: null,
      updatedAt: null,
      remarks: null,
    };
  }
  const v = raw;
  return {
    id: v._id || v.id || null,
    verificationNumber: v.verificationNumber || 'N/A',
    status: v.status || 'PENDING',
    entityType: v.entityType || 'PROPERTY',
    entityId: v.entityId || null,
    currentReviewLevel: v.currentReviewLevel || 1,
    trustScore: v.trustScore ?? 0,
    badge: v.verificationBadge || (v.trustScore >= 80 ? 'GOLD_PROPERTY' : 'UNVERIFIED'),
    propertyLevel: v.propertyLevel || (v.trustScore >= 80 ? 'Verified Property' : 'Unverified Property'),
    submittedAt: v.submittedAt || null,
    updatedAt: v.updatedAt || null,
    remarks: v.verificationRemarks || null,
  };
}

/**
 * Maps property trust score data.
 */
export function mapTrustScore(rawScore) {
  if (!rawScore) {
    return {
      score: 0,
      badge: 'UNVERIFIED',
      statusTitle: 'Unverified Property',
      percentileText: 'Verification not initiated',
      breakdown: [],
      penalties: [],
      netScore: 0,
      tips: [],
    };
  }
  const scoreData = rawScore;
  const scoreVal = scoreData.score ?? 0;

  let statusTitle = 'Unverified Property';
  if (scoreVal >= 90) statusTitle = 'Certified Property';
  else if (scoreVal >= 80) statusTitle = 'Verified Property';
  else if (scoreVal >= 60) statusTitle = 'Basic Verified';

  return {
    score: scoreVal,
    badge: scoreData.badge || (scoreVal >= 80 ? 'GOLD_PROPERTY' : 'UNVERIFIED'),
    statusTitle,
    percentileText: scoreData.percentileText || '',
    breakdown: scoreData.breakdown || [],
    penalties: scoreData.penalties || [],
    netScore: scoreData.netScore || scoreVal,
    tips: scoreData.tips || [],
  };
}

/**
 * Maps audit trail logs to color-coded timeline items.
 */
export function mapTimeline(rawLogs) {
  const events = rawLogs && Array.isArray(rawLogs) ? rawLogs : [];
  return events.map((item, index) => {
    let colorType = item.colorType || 'info';
    const actionLower = (item.action || item.event || '').toLowerCase();
    if (actionLower.includes('approved') || actionLower.includes('passed') || actionLower.includes('verified')) {
      colorType = 'success';
    } else if (actionLower.includes('submitted') || actionLower.includes('scheduled') || actionLower.includes('pending')) {
      colorType = 'pending';
    } else if (actionLower.includes('rejected') || actionLower.includes('failed') || actionLower.includes('expired')) {
      colorType = 'rejected';
    }
    return {
      id: item._id || `evt_prop_${index}`,
      action: item.action || item.event || 'System Event',
      timestamp: item.timestamp || item.performedAt || new Date().toISOString(),
      remarks: item.remarks || item.note || '',
      colorType,
    };
  });
}

/**
 * Maps document list.
 */
export function mapDocuments(rawDocs) {
  const docs = rawDocs && Array.isArray(rawDocs) ? rawDocs : [];
  return docs.map((d) => ({
    id: d._id || d.id || `doc_prop_${Date.now()}_${Math.random()}`,
    documentType: d.documentType || 'DOCUMENT',
    filename: d.filename || d.label || 'Document',
    category: d.category || 'OWNERSHIP',
    status: d.status || d.reviewStatus || 'PENDING',
    uploadedAt: d.uploadedAt || null,
    expiresAt: d.expiresAt || null,
  }));
}

/**
 * Maps property photos repository.
 */
export function mapPropertyPhotos(rawPhotos) {
  return rawPhotos && Array.isArray(rawPhotos) ? rawPhotos : [];
}

/**
 * Maps property summary specs.
 */
export function mapPropertySummary(raw) {
  if (!raw) {
    return {
      title: 'No property selected',
      unit: '',
      type: 'N/A',
      sqft: 0,
      bedrooms: 0,
      bathrooms: 0,
      address: '',
      furnishing: 'N/A',
      parking: 'N/A',
      builtYear: 'N/A',
    };
  }
  return raw;
}

/**
 * Maps renewal status and renewal history array.
 */
export function mapRenewalStatus(raw) {
  if (!raw) {
    return {
      expiresOn: 'N/A',
      daysRemaining: 0,
      renewalRequired: false,
      statusLabel: 'Not Applicable',
      lastRenewal: 'N/A',
      renewalHistory: [],
    };
  }
  const r = raw;
  return {
    expiresOn: r.expiresOn || 'N/A',
    daysRemaining: r.daysRemaining ?? 0,
    renewalRequired: r.renewalRequired || false,
    statusLabel: r.statusLabel || 'Not Required',
    lastRenewal: r.lastRenewal || 'N/A',
    renewalHistory: r.renewalHistory || [],
  };
}

/**
 * Maps property level progression requirements.
 */
export function mapPropertyLevels(raw) {
  if (!raw) {
    return {
      currentLevel: 'Unverified',
      nextLevel: 'Level 1: Basic Identity',
      progressPercent: 0,
      remainingRequirements: ['Add Property Details', 'Upload Title Deed'],
    };
  }
  return raw;
}

/**
 * Maps property health score completeness metrics.
 */
export function mapPropertyHealth(raw) {
  if (!raw) {
    return {
      healthScore: 0,
      status: 'Incomplete',
      checks: [],
    };
  }
  return raw;
}

export default {
  mapVerification,
  mapTrustScore,
  mapTimeline,
  mapDocuments,
  mapPropertyPhotos,
  mapPropertySummary,
  mapRenewalStatus,
  mapPropertyLevels,
  mapPropertyHealth,
};
