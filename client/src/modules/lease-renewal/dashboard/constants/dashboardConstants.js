export const RenewalStatuses = {
  ELIGIBLE: 'eligible',
  REQUESTED: 'requested',
  UNDER_REVIEW: 'under_review',
  COUNTER_OFFER: 'counter_offer',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SIGNED: 'signed',
  COMPLETED: 'completed',
  EXPIRED: 'expired'
};

export const StatusMetadata = {
  [RenewalStatuses.ELIGIBLE]: {
    label: 'Eligible for Renewal',
    color: 'emerald',
    progress: 10,
    description: 'You are eligible to request a lease renewal.',
    actionText: 'Begin Renewal'
  },
  [RenewalStatuses.REQUESTED]: {
    label: 'Renewal Requested',
    color: 'blue',
    progress: 25,
    description: 'Your renewal request is submitted and waiting for review.',
    actionText: 'View Details'
  },
  [RenewalStatuses.UNDER_REVIEW]: {
    label: 'Under Review',
    color: 'amber',
    progress: 50,
    description: 'The property manager is currently reviewing your terms.',
    actionText: 'Check Progress'
  },
  [RenewalStatuses.COUNTER_OFFER]: {
    label: 'Counter Offer Received',
    color: 'purple',
    progress: 70,
    description: 'The manager sent a counter offer. Please review the updated rent.',
    actionText: 'Review Offer'
  },
  [RenewalStatuses.APPROVED]: {
    label: 'Offer Approved',
    color: 'teal',
    progress: 85,
    description: 'Renewal terms approved! Document signing is now prepared.',
    actionText: 'Sign Agreement'
  },
  [RenewalStatuses.REJECTED]: {
    label: 'Renewal Rejected',
    color: 'rose',
    progress: 100,
    description: 'Your lease renewal request was declined.',
    actionText: 'Contact Manager'
  },
  [RenewalStatuses.SIGNED]: {
    label: 'Agreement Signed',
    color: 'cyan',
    progress: 95,
    description: 'You signed the renewal agreement. Waiting for manager finalization.',
    actionText: 'Download Agreement'
  },
  [RenewalStatuses.COMPLETED]: {
    label: 'Completed',
    color: 'indigo',
    progress: 100,
    description: 'Lease renewal completed. Your next lease term is locked in.',
    actionText: 'View New Lease'
  },
  [RenewalStatuses.EXPIRED]: {
    label: 'Lease Expired',
    color: 'slate',
    progress: 100,
    description: 'The lease term has expired.',
    actionText: 'Contact Property Owner'
  }
};
