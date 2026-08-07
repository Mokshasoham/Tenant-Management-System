/**
 * Technician Verification Data Transformation Mapper
 * Standardizes raw API or mock responses into clean, UI-ready domain models for Technician verification.
 * Decouples technician views from backend schema shifts.
 */

import {
  MOCK_TECHNICIAN_VERIFICATION,
  MOCK_TECHNICIAN_TIMELINE,
  MOCK_TECHNICIAN_TRUST,
  MOCK_TECHNICIAN_SUMMARY,
  MOCK_TECHNICIAN_DOCUMENTS,
  MOCK_TECHNICIAN_PORTFOLIO,
  MOCK_TECHNICIAN_SKILLS,
  MOCK_TECHNICIAN_RENEWAL,
  MOCK_TECHNICIAN_LEVELS,
} from '../mocks/technicianVerificationMock';

/**
 * Maps raw technician verification record to standardized UI verification state.
 */
export function mapVerification(raw) {
  const v = raw || MOCK_TECHNICIAN_VERIFICATION;
  return {
    id: v._id || v.id || 'vrf_tech_demo_001',
    verificationNumber: v.verificationNumber || 'VRF-2026-T00712',
    status: v.status || 'APPROVED',
    entityType: v.entityType || 'TECHNICIAN',
    entityId: v.entityId || 'technician_marcus_vance',
    currentReviewLevel: v.currentReviewLevel || 3,
    trustScore: v.trustScore ?? 91,
    badge: v.verificationBadge || 'GOLD_TECHNICIAN',
    technicianLevel: v.technicianLevel || 'Professional Technician',
    submittedAt: v.submittedAt || null,
    updatedAt: v.updatedAt || new Date().toISOString(),
    remarks: v.verificationRemarks || null,
  };
}

/**
 * Maps technician trust score data.
 */
export function mapTrustScore(rawScore) {
  const scoreData = rawScore || MOCK_TECHNICIAN_TRUST;
  const scoreVal = scoreData.score ?? 91;

  let statusTitle = 'Professional Technician';
  if (scoreVal >= 90) statusTitle = 'Elite Technician';
  else if (scoreVal >= 80) statusTitle = 'Professional Technician';
  else if (scoreVal >= 60) statusTitle = 'Verified Technician';
  else statusTitle = 'Registered Technician';

  return {
    score: scoreVal,
    badge: scoreData.badge || 'GOLD_TECHNICIAN',
    statusTitle,
    percentileText: scoreData.percentileText || 'Top Rated Technician',
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
  const events = rawLogs && rawLogs.length > 0 ? rawLogs : MOCK_TECHNICIAN_TIMELINE;
  return events.map((item, index) => {
    let colorType = item.colorType || 'info';
    const actionLower = (item.action || '').toLowerCase();
    if (actionLower.includes('approved') || actionLower.includes('passed') || actionLower.includes('verified')) {
      colorType = 'success';
    } else if (actionLower.includes('submitted') || actionLower.includes('started') || actionLower.includes('pending')) {
      colorType = 'pending';
    } else if (actionLower.includes('rejected') || actionLower.includes('failed') || actionLower.includes('expired')) {
      colorType = 'rejected';
    }
    return {
      id: item._id || `evt_tech_${index}`,
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
  const docs = rawDocs && rawDocs.length > 0 ? rawDocs : MOCK_TECHNICIAN_DOCUMENTS;
  return docs.map((d) => ({
    id: d._id || d.id || `doc_tech_${Date.now()}_${Math.random()}`,
    documentType: d.documentType || 'GOVT_ID',
    filename: d.filename || 'technician_document.pdf',
    category: d.category || 'IDENTITY',
    status: d.status || 'VERIFIED',
    uploadedAt: d.uploadedAt || new Date().toISOString(),
    expiresAt: d.expiresAt || null,
  }));
}

/**
 * Maps professional summary details.
 */
export function mapProfessionalSummary(raw) {
  return raw || MOCK_TECHNICIAN_SUMMARY;
}

/**
 * Maps technician portfolio photos.
 */
export function mapPortfolio(rawPortfolio) {
  return rawPortfolio && rawPortfolio.length > 0 ? rawPortfolio : MOCK_TECHNICIAN_PORTFOLIO;
}

/**
 * Maps technician trade skills & certifications.
 */
export function mapSkills(rawSkills) {
  return rawSkills && rawSkills.length > 0 ? rawSkills : MOCK_TECHNICIAN_SKILLS;
}

/**
 * Maps renewal status and renewal history array.
 */
export function mapRenewalStatus(raw) {
  const r = raw || MOCK_TECHNICIAN_RENEWAL;
  return {
    expiresOn: r.expiresOn || '20 Dec 2027',
    daysRemaining: r.daysRemaining ?? 683,
    renewalRequired: r.renewalRequired || false,
    statusLabel: r.statusLabel || 'Not Required (Valid)',
    lastRenewal: r.lastRenewal || '20 Dec 2025',
    renewalHistory: r.renewalHistory || [],
  };
}

/**
 * Maps technician verification levels.
 */
export function mapVerificationLevels(raw) {
  return raw || MOCK_TECHNICIAN_LEVELS;
}

export default {
  mapVerification,
  mapTrustScore,
  mapTimeline,
  mapDocuments,
  mapProfessionalSummary,
  mapPortfolio,
  mapSkills,
  mapRenewalStatus,
  mapVerificationLevels,
};
