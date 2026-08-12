/**
 * Verification Analytics Utility
 * Decouples UI event triggers from underlying analytics providers (GA4, Mixpanel, PostHog).
 * In development / demo mode, logs debug events cleanly.
 */

export const VERIFICATION_EVENTS = {
  VERIFICATION_STARTED: 'verification.started',
  DRAFT_SAVED: 'verification.draft_saved',
  DRAFT_RESUMED: 'verification.draft_resumed',
  DOCUMENT_UPLOADED: 'verification.document_uploaded',
  DOCUMENT_REMOVED: 'verification.document_removed',
  DOCUMENT_REPLACED: 'verification.document_replaced',
  VERIFICATION_SUBMITTED: 'verification.submitted',
  VERIFICATION_RESUBMITTED: 'verification.resubmitted',
  REFERENCE_ADDED: 'verification.reference_added',
  TIMELINE_VIEWED: 'verification.timeline_viewed',
  TRUST_VIEWED: 'verification.trust_viewed',
  IMPROVEMENT_TIP_CLICKED: 'verification.tip_clicked',
  STEP_CHANGED: 'verification.step_changed',
  CATEGORY_CHANGED: 'verification.category_changed',

  // Property Verification Events
  PROPERTY_STARTED: 'property_verification.started',
  PROPERTY_SUBMITTED: 'property_verification.submitted',
  PROPERTY_APPROVED: 'property_verification.approved',
  PROPERTY_DOCUMENT: 'property_verification.document_action',
  PROPERTY_PHOTO: 'property_verification.photo_action',
  PROPERTY_TIMELINE: 'property_verification.timeline_viewed',
  PROPERTY_TRUST: 'property_verification.trust_viewed',
  PROPERTY_RENEWAL: 'property_verification.renewal_action',

  // Technician Verification Events
  TECHNICIAN_STARTED: 'technician_verification.started',
  TECHNICIAN_SUBMITTED: 'technician_verification.submitted',
  TECHNICIAN_APPROVED: 'technician_verification.approved',
  TECHNICIAN_DOCUMENT: 'technician_verification.document_action',
  TECHNICIAN_SKILL: 'technician_verification.skill_action',
  TECHNICIAN_PORTFOLIO: 'technician_verification.portfolio_action',
  TECHNICIAN_TIMELINE: 'technician_verification.timeline_viewed',
  TECHNICIAN_TRUST: 'technician_verification.trust_viewed',
  TECHNICIAN_RENEWAL: 'technician_verification.renewal_action',

  // Admin Verification Center Events
  ADMIN_QUEUE_OPEN: 'admin_verification.queue_open',
  ADMIN_APPROVE: 'admin_verification.approve',
  ADMIN_REJECT: 'admin_verification.reject',
  ADMIN_ASSIGN: 'admin_verification.assign',
  ADMIN_EXPORT: 'admin_verification.export',
  ADMIN_SETTINGS_UPDATE: 'admin_verification.settings_update',
  ADMIN_ANALYTICS_VIEW: 'admin_verification.analytics_view',
  ADMIN_AUDIT_VIEW: 'admin_verification.audit_view',
  ADMIN_BULK_ACTION: 'admin_verification.bulk_action',
  ADMIN_DETAILS_OPEN: 'admin_verification.details_open',
};

/**
 * Emit an analytics tracking event.
 * @param {string} eventName - One of VERIFICATION_EVENTS
 * @param {Object} metadata - Optional event parameters
 */
export function trackEvent(eventName, metadata = {}) {
  try {
    if (import.meta.env.DEV) {
      console.debug(`[Analytics Event] ${eventName}`, metadata);
    }
    // Production integration hook:
    // if (typeof window !== 'undefined' && window.gtag) {
    //   window.gtag('event', eventName, metadata);
    // }
  } catch (err) {
    // Silent fail for analytics to prevent blocking main UI threads
  }
}

export default trackEvent;
