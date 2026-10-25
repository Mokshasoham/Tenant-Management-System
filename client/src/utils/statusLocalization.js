/**
 * Centralized Localized Status & Enum Display Mapping
 * 
 * Provides consistent, localized UI representations of backend entity states,
 * priority levels, and workflow categories without mutating canonical backend values.
 */

export const STATUS_KEY_MAP = {
  // Property statuses
  property: {
    available: 'properties.statusAvailable',
    occupied: 'properties.statusOccupied',
    rented: 'properties.statusRented',
    maintenance: 'properties.statusMaintenance',
    under_maintenance: 'properties.statusMaintenance',
    draft: 'properties.statusDraft',
    sold_out: 'properties.statusSoldOut',
    pending_approval: 'properties.statusPendingApproval',
  },
  // Lease statuses
  lease: {
    active: 'leases.statusActive',
    pending: 'leases.statusPending',
    expired: 'leases.statusExpired',
    terminated: 'leases.statusTerminated',
    draft: 'leases.statusDraft',
    renewed: 'leases.statusRenewed',
    renewal_pending: 'leases.statusRenewalPending',
    expiring_soon: 'leases.statusExpiringSoon',
  },
  // Maintenance statuses
  maintenance: {
    open: 'maintenance.status_open',
    submitted: 'maintenance.status_submitted',
    assigned: 'maintenance.status_assigned',
    in_progress: 'maintenance.status_in_progress',
    scheduled: 'maintenance.status_scheduled',
    resolved: 'maintenance.status_resolved',
    completed: 'maintenance.status_completed',
    cancelled: 'maintenance.status_cancelled',
    manager_review: 'maintenance.status_manager_review',
    sla_risk: 'maintenance.status_sla_risk',
  },
  // Payment statuses
  payment: {
    paid: 'payments.statusPaid',
    pending: 'payments.statusPending',
    overdue: 'payments.statusOverdue',
    partial: 'payments.statusPartial',
    partially_paid: 'payments.statusPartial',
    failed: 'payments.statusFailed',
    refunded: 'payments.statusRefunded',
  },
  // Verification statuses
  verification: {
    verified: 'verification.verified',
    unverified: 'verification.unverified',
    pending: 'verification.pending',
    draft: 'verification.draft',
    rejected: 'verification.rejected',
    in_review: 'verification.inReview',
  },
  // Priority levels
  priority: {
    low: 'maintenance.priorityLow',
    medium: 'maintenance.priorityMedium',
    high: 'maintenance.priorityHigh',
    urgent: 'maintenance.priorityUrgent',
    emergency: 'maintenance.priorityEmergency',
  },
  // Property types
  propertyType: {
    apartment: 'properties.apartment',
    house: 'properties.house',
    commercial: 'properties.commercial',
    land: 'properties.land',
    villa: 'properties.villa',
    studio: 'properties.studio',
    penthouse: 'properties.penthouse',
    co_living: 'properties.coLiving',
  },
  // Furnishing types
  furnishing: {
    furnished: 'property.furnished',
    semi_furnished: 'property.semiFurnished',
    unfurnished: 'property.unfurnished',
  },
  // Technician availability & workforce statuses
  technician: {
    available: 'technician.statusAvailable',
    free: 'technician.statusAvailable',
    working: 'technician.statusWorking',
    busy: 'technician.statusWorking',
    travelling: 'technician.statusTravelling',
    break: 'technician.statusBreak',
    meeting: 'technician.statusMeeting',
    emergency_call: 'technician.statusEmergencyCall',
    on_leave: 'technician.statusOnLeave',
    training: 'technician.statusTraining',
    off_duty: 'technician.statusOffDuty',
    offline: 'technician.statusOffline',
    invited: 'technician.statusInvited',
    active: 'technician.statusActive',
  },
  // Dispatch statuses
  dispatch: {
    unassigned: 'workforce.statusUnassigned',
    assigned: 'workforce.statusAssigned',
    in_transit: 'workforce.statusInTransit',
    on_site: 'workforce.statusOnSite',
    completed: 'workforce.statusCompleted',
  },
  // Subscription plans
  plan: {
    starter: 'subscription.starter',
    plus: 'subscription.plus',
    pro: 'subscription.pro',
    manager_starter: 'subscription.managerStarter',
    manager_plus: 'subscription.managerPlus',
    manager_pro: 'subscription.managerPro',
  }
};

/**
 * Format raw status identifier into human-readable English words as fallback
 */
function formatFallback(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Get localized display string for an enum/status value
 * @param {string} status - Canonical backend status code
 * @param {Function} t - Translation function from useLanguage()
 * @param {string} [category] - Optional category namespace ('property', 'lease', 'maintenance', 'payment', 'verification', 'priority', 'propertyType')
 * @returns {string} Localized label with safe fallback
 */
export function getLocalizedStatus(status, t, category) {
  if (!status) return '';
  if (typeof t !== 'function') return formatFallback(status);

  const normalized = String(status).trim().toLowerCase().replace(/\s+/g, '_');

  // If category is provided, look in that category first
  if (category && STATUS_KEY_MAP[category]) {
    const key = STATUS_KEY_MAP[category][normalized];
    if (key) {
      return t(key, formatFallback(status));
    }
  }

  // Cross-category search if category omitted or not found in specified category
  for (const cat of Object.keys(STATUS_KEY_MAP)) {
    const key = STATUS_KEY_MAP[cat][normalized];
    if (key) {
      return t(key, formatFallback(status));
    }
  }

  // Safe fallback & dev diagnostics
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[statusLocalization] Unknown status code "${status}" in category "${category}". Using fallback.`);
  }

  return formatFallback(status);
}

export default getLocalizedStatus;
