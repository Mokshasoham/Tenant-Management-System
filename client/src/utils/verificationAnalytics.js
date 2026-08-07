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
};

/**
 * Emit an analytics tracking event.
 * @param {string} eventName - One of VERIFICATION_EVENTS
 * @param {Object} metadata - Optional event parameters
 */
export function trackEvent(eventName, metadata = {}) {
  try {
    if (process.env.NODE_ENV !== 'production') {
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
