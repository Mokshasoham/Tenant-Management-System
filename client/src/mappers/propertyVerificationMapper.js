/**
 * Property Verification Data Transformation Mapper
 * Standardizes raw API or mock responses into clean, UI-ready domain models for Property verification.
 * Decouples property views from backend schema changes.
 */

import {
  MOCK_PROPERTY_VERIFICATION,
  MOCK_PROPERTY_TIMELINE,
  MOCK_PROPERTY_TRUST,
  MOCK_PROPERTY_SUMMARY,
  MOCK_PROPERTY_DOCUMENTS,
  MOCK_PROPERTY_PHOTOS,
  MOCK_PROPERTY_RENEWAL,
  MOCK_PROPERTY_LEVELS,
  MOCK_PROPERTY_HEALTH,
} from '../mocks/propertyVerificationMock';

/**
 * Maps raw property verification record to standardized UI verification state.
 */
export function mapVerification(raw) {
  const v = raw || MOCK_PROPERTY_VERIFICATION;
  return {
    id: v._id || v.id || 'vrf_prop_demo_001',
    verificationNumber: v.verificationNumber || 'VRF-2026-P00419',
    status: v.status || 'APPROVED',
    entityType: v.entityType || 'PROPERTY',
    entityId: v.entityId || 'property_oakwood_4b',
    currentReviewLevel: v.currentReviewLevel || 3,
    trustScore: v.trustScore ?? 88,
    badge: v.verificationBadge || 'GOLD_PROPERTY',
    propertyLevel: v.propertyLevel || 'Verified Property',
    submittedAt: v.submittedAt || null,
    updatedAt: v.updatedAt || new Date().toISOString(),
    remarks: v.verificationRemarks || null,
  };
}

/**
 * Maps property trust score data.
 */
export function mapTrustScore(rawScore) {
  const scoreData = rawScore || MOCK_PROPERTY_TRUST;
  const scoreVal = scoreData.score ?? 88;

  let statusTitle = 'Verified Property';
  if (scoreVal >= 90) statusTitle = 'Certified Property';
  else if (scoreVal >= 80) statusTitle = 'Verified Property';
  else if (scoreVal >= 60) statusTitle = 'Basic Verified';
  else statusTitle = 'Unverified Property';

  return {
    score: scoreVal,
    badge: scoreData.badge || 'GOLD_PROPERTY',
    statusTitle,
    percentileText: scoreData.percentileText || 'Top Rated Property',
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
  const events = rawLogs && rawLogs.length > 0 ? rawLogs : MOCK_PROPERTY_TIMELINE;
  return events.map((item, index) => {
    let colorType = item.colorType || 'info';
    const actionLower = (item.action || '').toLowerCase();
    if (actionLower.includes('approved') || actionLower.includes('passed') || actionLower.includes('verified')) {
      colorType = 'success';
    } else if (actionLower.includes('submitted') || actionLower.includes('scheduled') || actionLower.includes('pending')) {
      colorType = 'pending';
    } else if (actionLower.includes('rejected') || actionLower.includes('failed') || actionLower.includes('expired')) {
      colorType = 'rejected';
    }
    return {
      id: item._id || `evt_prop_${index}`,
      action: item.action || 'System Event',
      timestamp: item.timestamp || new Date().toISOString(),
      remarks: item.remarks || '',
      colorType,
    };
  });
}

/**
 * Maps document list.
 */
export function mapDocuments(rawDocs) {
  const docs = rawDocs && rawDocs.length > 0 ? rawDocs : MOCK_PROPERTY_DOCUMENTS;
  return docs.map((d) => ({
    id: d._id || d.id || `doc_prop_${Date.now()}_${Math.random()}`,
    documentType: d.documentType || 'SALE_DEED',
    filename: d.filename || 'oakwood_4b_document.pdf',
    category: d.category || 'OWNERSHIP',
    status: d.status || 'VERIFIED',
    uploadedAt: d.uploadedAt || new Date().toISOString(),
    expiresAt: d.expiresAt || null,
  }));
}

/**
 * Maps property photos repository.
 */
export function mapPropertyPhotos(rawPhotos) {
  return rawPhotos && rawPhotos.length > 0 ? rawPhotos : MOCK_PROPERTY_PHOTOS;
}

/**
 * Maps property summary specs.
 */
export function mapPropertySummary(raw) {
  return raw || MOCK_PROPERTY_SUMMARY;
}

/**
 * Maps renewal status and renewal history array (Enhancement #1).
 */
export function mapRenewalStatus(raw) {
  const r = raw || MOCK_PROPERTY_RENEWAL;
  return {
    expiresOn: r.expiresOn || '15 Nov 2027',
    daysRemaining: r.daysRemaining ?? 648,
    renewalRequired: r.renewalRequired || false,
    statusLabel: r.statusLabel || 'Not Required (Valid)',
    lastRenewal: r.lastRenewal || '15 Nov 2025',
    renewalHistory: r.renewalHistory || [],
  };
}

/**
 * Maps property level progression requirements (Enhancement #3).
 */
export function mapPropertyLevels(raw) {
  return raw || MOCK_PROPERTY_LEVELS;
}

/**
 * Maps property health score completeness metrics (Enhancement #4).
 */
export function mapPropertyHealth(raw) {
  return raw || MOCK_PROPERTY_HEALTH;
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
