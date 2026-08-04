/**
 * Lease Renewal module constants.
 * Manages the state machine status properties and event categories.
 */

export const RenewalStatus = {
  REQUESTED: 'requested',
  UNDER_REVIEW: 'under_review',
  COUNTER_OFFER: 'counter_offer',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SIGNED: 'signed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const RenewalEvents = {
  REQUESTED: 'lease_renewal_requested',
  COUNTER_OFFER: 'lease_renewal_counter_offer',
  APPROVED: 'lease_renewal_approved',
  REJECTED: 'lease_renewal_rejected',
  SIGNED: 'lease_renewal_signed',
  COMPLETED: 'lease_renewal_completed',
  CANCELLED: 'lease_renewal_cancelled',
};

// Permitted state machine transitions
export const ALLOWED_TRANSITIONS = {
  [RenewalStatus.REQUESTED]: [RenewalStatus.UNDER_REVIEW, RenewalStatus.COUNTER_OFFER, RenewalStatus.CANCELLED],
  [RenewalStatus.UNDER_REVIEW]: [RenewalStatus.COUNTER_OFFER, RenewalStatus.APPROVED, RenewalStatus.REJECTED, RenewalStatus.CANCELLED],
  [RenewalStatus.COUNTER_OFFER]: [RenewalStatus.SIGNED, RenewalStatus.APPROVED, RenewalStatus.COUNTER_OFFER, RenewalStatus.REJECTED, RenewalStatus.CANCELLED],
  [RenewalStatus.APPROVED]: [RenewalStatus.SIGNED, RenewalStatus.CANCELLED],
  [RenewalStatus.SIGNED]: [RenewalStatus.COMPLETED, RenewalStatus.CANCELLED],
  [RenewalStatus.REJECTED]: [],
  [RenewalStatus.COMPLETED]: [],
  [RenewalStatus.CANCELLED]: [],
};
