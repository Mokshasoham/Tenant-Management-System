/**
 * Standardized dot-notated Domain Event Categories.
 */
export const EventTypes = {
  LEASE: {
    RENEWAL_REQUESTED: 'lease.renewal.requested',
    RENEWAL_OFFERED: 'lease.renewal.offered',
    RENEWAL_APPROVED: 'lease.renewal.approved',
    RENEWAL_REJECTED: 'lease.renewal.rejected',
    RENEWAL_SIGNED: 'lease.renewal.signed',
    RENEWAL_COMPLETED: 'lease.renewal.completed',
    RENEWAL_CANCELLED: 'lease.renewal.cancelled'
  },
  PAYMENT: {
    COMPLETED: 'payment.completed',
    FAILED: 'payment.failed'
  },
  MAINTENANCE: {
    CREATED: 'maintenance.created',
    UPDATED: 'maintenance.updated'
  },
  USER: {
    LOGIN: 'user.login',
    LOGOUT: 'user.logout'
  },
  DOCUMENT: {
    UPLOADED: 'document.uploaded'
  },
  VERIFICATION: {
    SUBMITTED: 'verification.submitted',
    DOCUMENTS_UPLOADED: 'verification.documents.uploaded',
    AUTO_REVIEW_PASSED: 'verification.auto_review.passed',
    AUTO_REVIEW_FAILED: 'verification.auto_review.failed',
    APPROVED: 'verification.approved',
    REJECTED: 'verification.rejected',
    BADGE_ISSUED: 'verification.badge.issued',
    TRUST_UPDATED: 'verification.trust.updated',
    FLAG_RAISED: 'verification.flag.raised',
    EXPIRED: 'verification.expired',
    IDENTITY_STARTED: 'identity.verification.started',
    IDENTITY_DOC_UPLOADED: 'identity.document.uploaded',
    IDENTITY_PROCESSING: 'identity.verification.processing',
    IDENTITY_COMPLETED: 'identity.verification.completed',
    IDENTITY_VERIFIED: 'identity.verification.verified',
    IDENTITY_REVIEW_REQUIRED: 'identity.verification.review_required',
    IDENTITY_REJECTED: 'identity.verification.rejected',
    IDENTITY_FAILED: 'identity.verification.failed',
    PROPERTY_STARTED: 'property.verification.started',
    PROPERTY_DOC_UPLOADED: 'property.document.uploaded',
    PROPERTY_PROCESSING: 'property.document.processing',
    PROPERTY_COMPLETED: 'property.verification.completed',
    PROPERTY_VERIFIED: 'property.verification.verified',
    PROPERTY_REVIEW_REQUIRED: 'property.verification.review_required',
    PROPERTY_REJECTED: 'property.verification.rejected',
    PROPERTY_FAILED: 'property.verification.failed',
    PROPERTY_EXPIRED: 'property.verification.expired',
    PROPERTY_LOCKED: 'property.verification.locked',
    DIGILOCKER_STARTED: 'digilocker.connection.started',
    DIGILOCKER_COMPLETED: 'digilocker.connection.completed',
    DIGILOCKER_FAILED: 'digilocker.connection.failed',
    DIGILOCKER_DOC_LISTED: 'digilocker.document.listed',
    DIGILOCKER_DOC_IMPORTED: 'digilocker.document.imported',
    DIGILOCKER_DOC_FAILED: 'digilocker.document.failed',
    DIGILOCKER_REVOKED: 'digilocker.connection.revoked',
  }
};
