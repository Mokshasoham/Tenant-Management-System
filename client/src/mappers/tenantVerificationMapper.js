/**
 * Tenant Verification Data Transformation Mapper
 * Standardizes raw API or mock responses into clean, UI-ready domain models.
 * Isolates component views from backend schema shifts.
 */

import {
  MOCK_TENANT_VERIFICATION,
  MOCK_TIMELINE_EVENTS,
  MOCK_TRUST_SCORE,
  MOCK_RENTAL_HISTORY,
  MOCK_DOCUMENTS,
  MOCK_RENEWAL_STATUS,
  MOCK_VERIFICATION_LEVELS,
} from '../mocks/tenantVerificationMock';

/**
 * Maps raw verification record to standardized UI verification state.
 */
export function mapVerification(raw) {
  const v = raw || MOCK_TENANT_VERIFICATION;
  return {
    id: v._id || v.id || 'vrf_demo_001',
    verificationNumber: v.verificationNumber || 'VRF-2026-000842',
    status: v.status || 'UNVERIFIED',
    entityType: v.entityType || 'TENANT',
    entityId: v.entityId || 'tenant_demo_user',
    currentReviewLevel: v.currentReviewLevel || 1,
    trustScore: v.trustScore ?? 72,
    badge: v.verificationBadge || 'GOLD_VERIFIED',
    tenantLevel: v.tenantLevel || 'Trusted Tenant',
    submittedAt: v.submittedAt || null,
    updatedAt: v.updatedAt || new Date().toISOString(),
    remarks: v.verificationRemarks || null,
  };
}

/**
 * Maps raw trust score dataset to standardized gauge & breakdown state.
 */
export function mapTrustScore(rawScore, rawUser) {
  const scoreData = rawScore || MOCK_TRUST_SCORE;
  const scoreVal = scoreData.score ?? rawUser?.currentTrustScore ?? 72;
  const badgeVal = rawUser?.verificationBadge || scoreData.badge || 'GOLD_VERIFIED';

  let statusTitle = 'Building Trust';
  if (scoreVal >= 86) statusTitle = 'Outstanding Tenant';
  else if (scoreVal >= 71) statusTitle = 'Excellent Tenant';
  else if (scoreVal >= 51) statusTitle = 'Good Standing';
  else if (scoreVal >= 31) statusTitle = 'Building Trust';
  else statusTitle = 'Needs Work';

  return {
    score: scoreVal,
    badge: badgeVal,
    statusTitle,
    percentileText: scoreData.percentileText || `Top ${Math.max(1, 100 - scoreVal)}%`,
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
  const events = rawLogs && rawLogs.length > 0 ? rawLogs : MOCK_TIMELINE_EVENTS;
  return events.map((item, index) => {
    let colorType = item.colorType || 'info';
    const actionLower = (item.action || '').toLowerCase();
    if (actionLower.includes('approved') || actionLower.includes('passed') || actionLower.includes('verified')) {
      colorType = 'success';
    } else if (actionLower.includes('submitted') || actionLower.includes('auto-saved') || actionLower.includes('pending')) {
      colorType = 'pending';
    } else if (actionLower.includes('rejected') || actionLower.includes('failed') || actionLower.includes('expired')) {
      colorType = 'rejected';
    }
    return {
      id: item._id || `evt_${index}`,
      action: item.action || 'System Event',
      timestamp: item.timestamp || new Date().toISOString(),
      remarks: item.remarks || '',
      colorType,
    };
  });
}

/**
 * Maps document list into categorized repository entries.
 */
export function mapDocuments(rawDocs) {
  const docs = rawDocs && rawDocs.length > 0 ? rawDocs : MOCK_DOCUMENTS;
  return docs.map((d) => ({
    id: d._id || d.id || `doc_${Date.now()}_${Math.random()}`,
    documentType: d.documentType || 'GOVT_ID',
    filename: d.filename || 'uploaded_file.pdf',
    category: d.category || 'IDENTITY',
    status: d.status || 'VERIFIED',
    uploadedAt: d.uploadedAt || new Date().toISOString(),
    expiresAt: d.expiresAt || null,
  }));
}

/**
 * Maps rental reputation metrics.
 */
export function mapRentalHistory(raw) {
  return raw || MOCK_RENTAL_HISTORY;
}

/**
 * Maps renewal lifecycle status.
 */
export function mapRenewalStatus(raw) {
  return raw || MOCK_RENEWAL_STATUS;
}

export default {
  mapVerification,
  mapTrustScore,
  mapTimeline,
  mapDocuments,
  mapRentalHistory,
  mapRenewalStatus,
};
