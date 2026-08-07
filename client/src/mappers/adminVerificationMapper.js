/**
 * Admin Verification Data Transformation Mapper
 * Standardizes raw API or mock responses into clean, UI-ready domain models for the Enterprise Admin Verification Center.
 * Decouples admin views from backend schema shifts across Manager, Tenant, Property, and Technician verification requests.
 */

import {
  MOCK_ADMIN_DASHBOARD,
  MOCK_ADMIN_QUEUE,
  MOCK_HIGH_RISK_QUEUE,
  MOCK_ADMIN_ANALYTICS,
  MOCK_ADMIN_AUDIT_LOGS,
  MOCK_CASE_NOTES,
  MOCK_WORKFLOWS,
  MOCK_DOCUMENT_TEMPLATES,
  MOCK_SLA,
} from '../mocks/adminVerificationMock';

export function mapDashboard(raw) {
  return raw || MOCK_ADMIN_DASHBOARD;
}

export function mapQueue(rawQueue) {
  const queue = rawQueue && rawQueue.length > 0 ? rawQueue : MOCK_ADMIN_QUEUE;
  return queue.map((item) => ({
    id: item._id || item.id || `vrf_${Math.random()}`,
    verificationNumber: item.verificationNumber || 'VRF-2026-000000',
    entityType: item.entityType || 'TENANT',
    entityName: item.entityName || 'Applicant Name',
    applicantName: item.applicantName || item.entityName || 'Applicant',
    email: item.email || 'applicant@example.com',
    phone: item.phone || '+1 (555) 000-0000',
    status: item.status || 'SUBMITTED',
    currentReviewLevel: item.currentReviewLevel || 1,
    trustScore: item.trustScore ?? 75,
    riskLevel: item.riskLevel || 'LOW',
    assignedReviewer: item.assignedReviewer || 'Unassigned',
    reviewerId: item.reviewerId || 'rev_unassigned',
    submittedAt: item.submittedAt || new Date().toISOString(),
    slaStatus: item.slaStatus || 'ON_TRACK',
    slaTargetHours: item.slaTargetHours || 24,
    slaRemainingHours: item.slaRemainingHours ?? 12,
  }));
}

export function mapDetails(id, rawQueue) {
  const queue = mapQueue(rawQueue);
  const found = queue.find((q) => q.id === id || q.verificationNumber === id);
  if (found) return found;
  return queue[0]; // fallback to first item
}

export function mapDocuments(rawDocs) {
  if (rawDocs && rawDocs.length > 0) return rawDocs;
  return [
    { id: 'ad_1', documentType: 'GOVT_ID', filename: 'government_id_passport.pdf', category: 'IDENTITY', status: 'VERIFIED', uploadedAt: new Date().toISOString() },
    { id: 'ad_2', documentType: 'PROOF_ADDRESS', filename: 'utility_bill_utility.pdf', category: 'ADDRESS', status: 'VERIFIED', uploadedAt: new Date().toISOString() },
    { id: 'ad_3', documentType: 'TRADE_LICENSE', filename: 'master_license_cert.pdf', category: 'LICENSE', status: 'PENDING', uploadedAt: new Date().toISOString() },
  ];
}

export function mapTrust(rawTrust) {
  if (rawTrust) return rawTrust;
  return {
    score: 84,
    statusTitle: 'Verified Enterprise Entity',
    percentileText: 'Top 15% Verified Score',
    breakdown: [
      { label: 'Identity Verification', score: 20, max: 20, status: 'complete' },
      { label: 'Document Authenticity', score: 20, max: 20, status: 'complete' },
      { label: 'Background & Risk Check', score: 20, max: 20, status: 'complete' },
      { label: 'Entity Credibility', score: 14, max: 20, status: 'partial' },
      { label: 'Audit Trail Completeness', score: 10, max: 20, status: 'partial' },
    ],
    penalties: [],
    netScore: 84,
  };
}

export function mapAnalytics(raw) {
  return raw || MOCK_ADMIN_ANALYTICS;
}

export function mapAudit(rawLogs) {
  return rawLogs && rawLogs.length > 0 ? rawLogs : MOCK_ADMIN_AUDIT_LOGS;
}

export function mapSettings(raw) {
  return {
    workflows: MOCK_WORKFLOWS,
    templates: MOCK_DOCUMENT_TEMPLATES,
    sla: MOCK_SLA,
  };
}

export function mapActivities(raw) {
  return MOCK_ADMIN_AUDIT_LOGS.slice(0, 5);
}

export function mapNotifications(raw) {
  return [
    { id: 'n1', title: 'SLA Breach Warning', message: 'VRF-2026-P00914 passed 48h SLA target', time: '10m ago', type: 'danger' },
    { id: 'n2', title: 'High Risk Escalation', message: 'VRF-2026-M00495 flagged for critical mismatch', time: '1h ago', type: 'warning' },
  ];
}

export function mapCaseNotes(raw) {
  return raw && raw.length > 0 ? raw : MOCK_CASE_NOTES;
}

export default {
  mapDashboard,
  mapQueue,
  mapDetails,
  mapDocuments,
  mapTrust,
  mapAnalytics,
  mapAudit,
  mapSettings,
  mapActivities,
  mapNotifications,
  mapCaseNotes,
};
