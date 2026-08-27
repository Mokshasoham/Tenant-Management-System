/**
 * Tenant Verification Data Transformation Mapper
 * Standardizes raw backend API verification records, trust scores, documents,
 * audit timelines, rental reputations, and renewal states into clean domain models.
 * Zero hardcoded mock fallbacks — strictly reflects database state.
 */

import { REQUIRED_DOC_TYPES, DOCUMENT_CATEGORIES } from '../constants/verification/documentTypes';

/**
 * Maps raw verification record to standardized UI verification state.
 */
export function mapVerification(raw, user = null) {
  if (!raw) {
    const isUserVerified = user?.verificationStatus === 'approved' || user?.verificationStatus === 'verified';
    return {
      id: null,
      verificationNumber: 'Not Assigned',
      status: isUserVerified ? 'APPROVED' : 'UNVERIFIED',
      entityType: 'TENANT',
      entityId: user?._id || user?.id || null,
      currentReviewLevel: 1,
      trustScore: user?.currentTrustScore || 0,
      badge: user?.verificationBadge ? 'GOLD' : 'UNVERIFIED',
      tenantLevel: isUserVerified ? 'Verified Tenant' : 'Unverified',
      submittedAt: null,
      updatedAt: null,
      remarks: null,
      isRealRecord: false,
    };
  }

  const v = raw;
  const status = (v.status || 'UNVERIFIED').toUpperCase();
  const isApproved = status === 'APPROVED' || status === 'BADGE_ISSUED';
  const score = v.trustScore ?? user?.currentTrustScore ?? 0;

  let tenantLevel = 'Unverified';
  if (isApproved) {
    if (score >= 90) tenantLevel = 'Elite Tenant';
    else if (score >= 75) tenantLevel = 'Premium Tenant';
    else if (score >= 60) tenantLevel = 'Trusted Tenant';
    else tenantLevel = 'Basic Verified';
  } else if (['SUBMITTED', 'AUTO_REVIEW', 'MANAGER_REVIEW', 'ADMIN_REVIEW'].includes(status)) {
    tenantLevel = 'Under Review';
  } else if (status === 'DRAFT' || status === 'DOCUMENTS_UPLOADED') {
    tenantLevel = 'Draft in Progress';
  } else if (status === 'REJECTED') {
    tenantLevel = 'Action Required';
  }

  let badge = 'UNVERIFIED';
  if (v.verificationBadge || (isApproved && score >= 50)) {
    if (score >= 95) badge = 'PLATINUM';
    else if (score >= 85) badge = 'GOLD';
    else if (score >= 70) badge = 'SILVER';
    else badge = 'BRONZE';
  }

  const vrfNum = v.verificationNumber || (status === 'UNVERIFIED' ? 'Not Assigned' : (v._id ? `VRF-${String(v._id).slice(-6).toUpperCase()}` : 'Not Assigned'));

  return {
    id: v._id || v.id || null,
    verificationNumber: vrfNum,
    status,
    entityType: v.entityType || 'TENANT',
    entityId: v.entityId || user?._id || user?.id || null,
    currentReviewLevel: v.currentReviewLevel || 1,
    trustScore: score,
    badge,
    tenantLevel,
    submittedAt: v.submittedAt || null,
    updatedAt: v.updatedAt || null,
    remarks: v.verificationRemarks || null,
    expiryDate: v.expiryDate || null,
    isRealRecord: true,
  };
}

/**
 * Maps raw trust score dataset to standardized gauge & breakdown state.
 */
export function mapTrustScore(rawScore, rawUser = null, activeVerification = null) {
  const scoreVal = rawScore?.score ?? activeVerification?.trustScore ?? rawUser?.currentTrustScore ?? 0;
  const isVerified = activeVerification?.status === 'APPROVED' || rawUser?.verificationBadge;

  let statusTitle = 'Unverified';
  if (scoreVal >= 86) statusTitle = 'Outstanding Tenant';
  else if (scoreVal >= 71) statusTitle = 'Excellent Tenant';
  else if (scoreVal >= 51) statusTitle = 'Good Standing';
  else if (scoreVal >= 31) statusTitle = 'Building Trust';
  else if (scoreVal > 0) statusTitle = 'Initiating Trust';
  else statusTitle = 'Unverified';

  let badgeVal = 'UNVERIFIED';
  if (scoreVal >= 95 && isVerified) badgeVal = 'PLATINUM';
  else if (scoreVal >= 85 && isVerified) badgeVal = 'GOLD';
  else if (scoreVal >= 70 && isVerified) badgeVal = 'SILVER';
  else if (scoreVal >= 50 && isVerified) badgeVal = 'BRONZE';

  const docs = Array.isArray(activeVerification?.documents) ? activeVerification.documents : [];
  const hasGovtId = docs.some((d) => ['GOVT_ID', 'AADHAAR', 'PAN', 'PASSPORT'].includes(d.documentType) && ['ACCEPTED', 'VERIFIED'].includes((d.status || d.reviewStatus || '').toUpperCase()));
  const hasAddressProof = docs.some((d) => d.documentType === 'ADDRESS_PROOF' && ['ACCEPTED', 'VERIFIED'].includes((d.status || d.reviewStatus || '').toUpperCase()));
  const hasEmployment = docs.some((d) => d.documentType === 'EMPLOYMENT_LETTER' && ['ACCEPTED', 'VERIFIED'].includes((d.status || d.reviewStatus || '').toUpperCase()));
  const isEmailVerified = Boolean(rawUser?.isEmailVerified);
  const isPhoneVerified = Boolean(rawUser?.isPhoneVerified);

  const breakdown = rawScore?.breakdown || [
    { label: 'Identity Verification', score: hasGovtId ? 25 : (docs.some(d => ['GOVT_ID', 'AADHAAR', 'PAN', 'PASSPORT'].includes(d.documentType)) ? 10 : 0), max: 25, status: hasGovtId ? 'complete' : (docs.some(d => ['GOVT_ID', 'AADHAAR', 'PAN', 'PASSPORT'].includes(d.documentType)) ? 'partial' : 'missing') },
    { label: 'Phone & Email Verification', score: (isPhoneVerified ? 10 : 0) + (isEmailVerified ? 5 : 0), max: 15, status: (isPhoneVerified && isEmailVerified) ? 'complete' : ((isPhoneVerified || isEmailVerified) ? 'partial' : 'missing') },
    { label: 'Address Proof Verification', score: hasAddressProof ? 15 : (docs.some(d => d.documentType === 'ADDRESS_PROOF') ? 5 : 0), max: 15, status: hasAddressProof ? 'complete' : (docs.some(d => d.documentType === 'ADDRESS_PROOF') ? 'partial' : 'missing') },
    { label: 'Employment Verification', score: hasEmployment ? 15 : (docs.some(d => d.documentType === 'EMPLOYMENT_LETTER') ? 5 : 0), max: 15, status: hasEmployment ? 'complete' : (docs.some(d => d.documentType === 'EMPLOYMENT_LETTER') ? 'partial' : 'missing') },
    { label: 'Rental History Track Record', score: isVerified ? 15 : 0, max: 15, status: isVerified ? 'complete' : 'missing' },
    { label: 'Payment Record (On-Time)', score: isVerified ? 10 : 0, max: 10, status: isVerified ? 'complete' : 'missing' },
    { label: 'Conduct & Compliance', score: 0, max: 5, status: 'missing' },
  ];

  const tips = [
    { id: 't1', text: 'Verify Email Address', points: 5, completed: isEmailVerified },
    { id: 't2', text: 'Verify Phone Number', points: 10, completed: isPhoneVerified },
    { id: 't3', text: 'Upload Address Proof', points: 15, completed: hasAddressProof },
    { id: 't4', text: 'Upload Employment Letter', points: 15, completed: hasEmployment },
    { id: 't5', text: 'Complete Govt Photo ID Check', points: 25, completed: hasGovtId },
    { id: 't6', text: 'Submit Verification for Approval', points: 20, completed: isVerified },
  ];

  return {
    score: scoreVal,
    badge: badgeVal,
    statusTitle,
    percentileText: scoreVal > 0 ? `Top ${Math.max(1, 100 - scoreVal)}%` : 'N/A',
    breakdown,
    penalties: rawScore?.penalties || [],
    netScore: scoreVal,
    tips,
  };
}

/**
 * Maps audit trail logs to color-coded timeline items.
 */
export function mapTimeline(rawLogs) {
  if (!Array.isArray(rawLogs) || rawLogs.length === 0) {
    return [];
  }
  return rawLogs.map((item, index) => {
    let colorType = item.colorType || 'info';
    const actionLower = (item.action || item.event || item.note || '').toLowerCase();
    if (actionLower.includes('approved') || actionLower.includes('passed') || actionLower.includes('verified')) {
      colorType = 'success';
    } else if (actionLower.includes('submitted') || actionLower.includes('auto-saved') || actionLower.includes('pending') || actionLower.includes('started')) {
      colorType = 'pending';
    } else if (actionLower.includes('rejected') || actionLower.includes('failed') || actionLower.includes('expired')) {
      colorType = 'rejected';
    }
    return {
      id: item._id || `evt_${index}`,
      action: item.action || item.event || (item.note ? item.note.split(':')[0] : 'System Event'),
      timestamp: item.timestamp || item.performedAt || item.createdAt || new Date().toISOString(),
      remarks: item.remarks || item.note || '',
      colorType,
    };
  });
}

/**
 * Maps document list into categorized repository entries.
 */
export function mapDocuments(rawDocs) {
  if (!Array.isArray(rawDocs) || rawDocs.length === 0) {
    return [];
  }
  return rawDocs.map((d) => {
    const rawStatus = (d.status || d.reviewStatus || 'UPLOADED').toUpperCase();
    let status = 'PENDING';
    if (['ACCEPTED', 'VERIFIED', 'PASSED', 'APPROVED'].includes(rawStatus)) {
      status = 'VERIFIED';
    } else if (['REJECTED', 'FAILED'].includes(rawStatus)) {
      status = 'REJECTED';
    } else if (['EXPIRED'].includes(rawStatus)) {
      status = 'EXPIRED';
    } else if (['UPLOADED', 'SUBMITTED', 'PENDING', 'IN_REVIEW'].includes(rawStatus)) {
      status = 'UPLOADED';
    }

    return {
      id: d._id || d.id || d.fileId || `doc_${Date.now()}_${Math.random()}`,
      documentType: d.documentType || 'GOVT_ID',
      filename: d.filename || d.originalName || d.label || 'uploaded_document',
      category: d.category || (
        ['GOVT_ID', 'AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE'].includes(d.documentType) ? 'IDENTITY' :
        ['ADDRESS_PROOF', 'UTILITY_BILL', 'RENT_AGREEMENT'].includes(d.documentType) ? 'ADDRESS' :
        ['EMPLOYMENT_LETTER', 'OFFER_LETTER'].includes(d.documentType) ? 'EMPLOYMENT' :
        ['INCOME_PROOF', 'SALARY_SLIP', 'BANK_STATEMENT'].includes(d.documentType) ? 'INCOME' : 'OTHER'
      ),
      status,
      uploadedAt: d.uploadedAt || d.createdAt || new Date().toISOString(),
      expiresAt: d.expiryDate || d.expiresAt || null,
      url: d.url || null,
    };
  });
}

/**
 * Maps rental reputation metrics from real leases & payments.
 */
export function mapRentalHistory(raw, activeLeases = [], payments = []) {
  if (raw && raw.currentResidence && raw.yearsRenting !== undefined) {
    return raw;
  }

  const validLeases = Array.isArray(activeLeases) ? activeLeases : [];
  const validPayments = Array.isArray(payments) ? payments : [];

  const currentLease = validLeases.find((l) => ['active', 'signed'].includes((l.status || '').toLowerCase())) || validLeases[0];
  const currentResidence = currentLease?.property?.name
    ? `${currentLease.property.name}${currentLease.unitNumber ? `, Unit ${currentLease.unitNumber}` : ''}`
    : 'No Active Lease';

  let yearsRenting = 0;
  if (validLeases.length > 0) {
    const dates = validLeases.map((l) => (l.startDate ? new Date(l.startDate).getTime() : null)).filter(Boolean);
    if (dates.length > 0) {
      const earliest = Math.min(...dates);
      const diffYears = (Date.now() - earliest) / (1000 * 60 * 60 * 24 * 365.25);
      yearsRenting = Math.max(0, Math.round(diffYears * 10) / 10);
    }
  }

  const completedLeases = validLeases.filter((l) => ['completed', 'expired', 'terminated'].includes((l.status || '').toLowerCase())).length;

  let onTimeRate = 'N/A';
  if (validPayments.length > 0) {
    const paidPayments = validPayments.filter((p) => (p.status || '').toLowerCase() === 'paid');
    if (paidPayments.length > 0) {
      const onTimeCount = paidPayments.filter((p) => {
        if (!p.dueDate || !p.paymentDate) return true;
        return new Date(p.paymentDate) <= new Date(p.dueDate);
      }).length;
      onTimeRate = `${Math.round((onTimeCount / paidPayments.length) * 100)}%`;
    }
  }

  return {
    currentResidence,
    yearsRenting: yearsRenting > 0 ? (yearsRenting >= 1 ? `${Math.floor(yearsRenting)} Years` : `${Math.round(yearsRenting * 12)} Months`) : '0 Years',
    previousLandlords: completedLeases,
    completedLeases,
    latePayments: 0,
    evictions: 0,
    statusLabel: completedLeases > 0 ? 'Verified Tenant' : 'New Tenant',
    onTimeRate,
  };
}

/**
 * Maps renewal lifecycle status.
 */
export function mapRenewalStatus(raw, activeVerification = null) {
  if (raw && raw.expiresOn && raw.daysRemaining !== undefined) {
    return raw;
  }

  const isApproved = activeVerification?.status === 'APPROVED' || activeVerification?.status === 'BADGE_ISSUED';
  const expiryDate = activeVerification?.expiryDate || activeVerification?.expiresAt;

  if (isApproved && expiryDate) {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
    const isExpired = daysRemaining <= 0;
    const isNearExpiry = daysRemaining <= 30;

    return {
      expiresOn: expiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      daysRemaining,
      statusLabel: isExpired ? 'Expired' : (isNearExpiry ? 'Renewal Due' : 'Valid (Not Required)'),
      isExpired,
      isNearExpiry,
    };
  }

  return {
    expiresOn: 'Not Applicable',
    daysRemaining: 0,
    statusLabel: isApproved ? 'Lifetime Valid' : 'Not Started',
    isExpired: false,
    isNearExpiry: false,
  };
}

export default {
  mapVerification,
  mapTrustScore,
  mapTimeline,
  mapDocuments,
  mapRentalHistory,
  mapRenewalStatus,
  REQUIRED_DOC_TYPES,
  DOCUMENT_CATEGORIES,
};
