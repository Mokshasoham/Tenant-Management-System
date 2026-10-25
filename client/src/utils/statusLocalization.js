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
    documents_uploaded: 'verification.status_documents_uploaded',
    submitted: 'verification.submitted',
    auto_review: 'verification.status_auto_review',
    manager_review: 'verification.status_manager_review',
    admin_review: 'verification.status_admin_review',
    approved: 'verification.status_approved',
    expired: 'verification.status_expired',
    renewal_required: 'verification.status_renewal_required',
    uploaded: 'verification.status_uploaded',
  },
  // Verification Badges
  verificationBadge: {
    unverified: 'verification.badge_unverified',
    bronze: 'verification.badge_bronze',
    bronze_trust: 'verification.badge_bronze',
    silver: 'verification.badge_silver',
    silver_verified: 'verification.badge_silver',
    gold: 'verification.badge_gold',
    gold_verified: 'verification.badge_gold',
    gold_property: 'verification.badge_gold_property',
    platinum: 'verification.badge_platinum',
    platinum_elite: 'verification.badge_platinum',
  },
  // Document Types
  documentType: {
    sale_deed: 'verification.doc_sale_deed',
    title_deed: 'verification.doc_sale_deed',
    property_registration: 'verification.doc_property_registration',
    tax_receipt: 'verification.doc_tax_receipt',
    occupancy_cert: 'verification.doc_occupancy_cert',
    building_approval: 'verification.doc_building_approval',
    electricity_bill: 'verification.doc_electricity_bill',
    water_bill: 'verification.doc_water_bill',
    fire_noc: 'verification.doc_fire_noc',
    lift_safety: 'verification.doc_lift_safety',
    business_registration: 'verification.doc_business_registration',
    govt_id: 'verification.doc_govt_id',
    identity_proof: 'verification.doc_identity_proof',
    utility_bill: 'verification.doc_utility_bill',
    tax_pin: 'verification.doc_tax_pin',
  },
  // Ownership Types
  ownershipType: {
    individual_owner: 'verification.ownership_individual_owner',
    company: 'verification.ownership_company',
    builder: 'verification.ownership_builder',
    housing_society: 'verification.ownership_housing_society',
    property_management_company: 'verification.ownership_property_management_company',
    government: 'verification.ownership_government',
    trust: 'verification.ownership_trust',
    inherited_property: 'verification.ownership_inherited_property',
    joint_ownership: 'verification.ownershipJoint',
    corporate_entity_company: 'verification.ownershipCorporate',
    trust_society: 'verification.ownershipTrust',
    inherited_estate: 'verification.ownershipInherited',
  },
  // Business Categories
  businessCategory: {
    real_estate_management: 'verification.biz_real_estate_mgmt',
    residential_property_management: 'verification.biz_residential_mgmt',
    commercial_leasing_operations: 'verification.biz_commercial_leasing',
    individual_landlord_broker: 'verification.biz_individual_landlord',
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
  const cleanNormalized = String(status).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  // If category is provided, look in that category first
  if (category && STATUS_KEY_MAP[category]) {
    const key = STATUS_KEY_MAP[category][normalized] || STATUS_KEY_MAP[category][cleanNormalized];
    if (key) {
      return t(key, formatFallback(status));
    }
  }

  // Cross-category search if category omitted or not found in specified category
  for (const cat of Object.keys(STATUS_KEY_MAP)) {
    const key = STATUS_KEY_MAP[cat][normalized] || STATUS_KEY_MAP[cat][cleanNormalized];
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
