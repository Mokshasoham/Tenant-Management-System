/**
 * Shared Verification Lifecycle Architecture
 * Unified 12-stage lifecycle engine shared across Manager, Tenant, Property, Technician, and Admin portals.
 * Renders entity-specific terminology (Business, Rental, Property, Skill) while sharing a single workflow state machine.
 */

export const VERIFICATION_LIFECYCLE_STATES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  AUTO_REVIEW: 'AUTO_REVIEW',
  LEVEL_1_REVIEW: 'LEVEL_1_REVIEW',
  LEVEL_2_REVIEW: 'LEVEL_2_REVIEW',
  LEVEL_3_REVIEW: 'LEVEL_3_REVIEW',
  APPROVED: 'APPROVED',
  ACTIVE: 'ACTIVE',
  EXPIRING: 'EXPIRING',
  RENEWAL: 'RENEWAL',
  EXPIRED: 'EXPIRED',
  ARCHIVED: 'ARCHIVED',
};

export const LIFECYCLE_TERMINOLOGY_MAP = {
  MANAGER: {
    DRAFT: { label: 'Draft Application', description: 'Business registration draft in progress' },
    SUBMITTED: { label: 'Submitted for Audit', description: 'Company credentials submitted to legal compliance' },
    AUTO_REVIEW: { label: 'Automated Format Check', description: 'System verifying GST & Tax PIN formats' },
    LEVEL_1_REVIEW: { label: 'Level 1 Document Check', description: 'Format & size check passed' },
    LEVEL_2_REVIEW: { label: 'Level 2 Manager Audit', description: 'Manager profile under review' },
    LEVEL_3_REVIEW: { label: 'Level 3 Compliance Review', description: 'Executive compliance approval' },
    APPROVED: { label: 'Business Verified', description: 'Manager business credentials approved' },
    ACTIVE: { label: 'Certified Manager', description: 'Active verified manager account' },
    EXPIRING: { label: 'Tax License Expiring', description: 'Annual business registration renewal due soon' },
    RENEWAL: { label: 'Renewal Pending', description: 'Updated tax clearance under review' },
    EXPIRED: { label: 'Credentials Expired', description: 'Business license expired' },
    ARCHIVED: { label: 'Archived Account', description: 'Inactive or legacy manager registration' },
  },
  TENANT: {
    DRAFT: { label: 'Draft Profile', description: 'Rental trust draft in progress' },
    SUBMITTED: { label: 'Application Submitted', description: 'Identity & income submitted for rental check' },
    AUTO_REVIEW: { label: 'Automated Check', description: 'System checking photo ID & address proof' },
    LEVEL_1_REVIEW: { label: 'Level 1 Check Passed', description: 'Identity proof validated' },
    LEVEL_2_REVIEW: { label: 'Manager Review', description: 'Property manager verifying employment & references' },
    LEVEL_3_REVIEW: { label: 'Admin Audit', description: 'Final background check approval' },
    APPROVED: { label: 'Rental Verified', description: 'Tenant rental trust profile certified' },
    ACTIVE: { label: 'Verified Tenant', description: 'Gold rental trust badge active' },
    EXPIRING: { label: 'Verification Expiring', description: 'Annual address proof renewal due' },
    RENEWAL: { label: 'Renewal in Progress', description: 'Updated utility bill submitted' },
    EXPIRED: { label: 'Verification Expired', description: 'Rental trust badge expired' },
    ARCHIVED: { label: 'Archived Profile', description: 'Past tenant verification record' },
  },
  PROPERTY: {
    DRAFT: { label: 'Property Draft', description: 'Real estate listing verification draft' },
    SUBMITTED: { label: 'Title Deed Submitted', description: 'Ownership & tax records submitted for legal review' },
    AUTO_REVIEW: { label: 'Automated Title Search', description: 'System matching Khata ID with city registry' },
    LEVEL_1_REVIEW: { label: 'Level 1 Document Check', description: 'Sale deed resolution & size check clear' },
    LEVEL_2_REVIEW: { label: 'Physical Inspection', description: 'Property manager conducting on-site audit' },
    LEVEL_3_REVIEW: { label: 'Municipal Audit', description: 'City tax & building safety clearance' },
    APPROVED: { label: 'Property Certified', description: 'Gold Property certification granted' },
    ACTIVE: { label: 'Verified Property', description: 'Active certified listing' },
    EXPIRING: { label: 'Property Tax Expiring', description: 'Annual municipal tax receipt update due' },
    RENEWAL: { label: 'Inspection Renewal', description: 'Annual physical re-inspection scheduled' },
    EXPIRED: { label: 'Certification Expired', description: 'Property verification certificate expired' },
    ARCHIVED: { label: 'Archived Property', description: 'De-listed or sold property record' },
  },
  TECHNICIAN: {
    DRAFT: { label: 'Skill Draft', description: 'Trade certification draft initiated' },
    SUBMITTED: { label: 'Certificates Submitted', description: 'Trade license & insurance submitted' },
    AUTO_REVIEW: { label: 'Automated License Check', description: 'System verifying license number format' },
    LEVEL_1_REVIEW: { label: 'Level 1 Trade Check', description: 'Diploma & ID check passed' },
    LEVEL_2_REVIEW: { label: 'Dispatch Lead Review', description: 'Workforce supervisor evaluating skill level' },
    LEVEL_3_REVIEW: { label: 'Admin Compliance', description: 'Background check & insurance audit' },
    APPROVED: { label: 'Skill Certified', description: 'Technician certified for dispatch' },
    ACTIVE: { label: 'Verified Technician', description: 'Active certified service technician' },
    EXPIRING: { label: 'Insurance Expiring', description: 'Annual liability insurance renewal due' },
    RENEWAL: { label: 'License Renewal', description: 'Trade license renewal submitted' },
    EXPIRED: { label: 'License Expired', description: 'Trade license expired' },
    ARCHIVED: { label: 'Archived Technician', description: 'Inactive service technician record' },
  },
};

/**
 * Returns localized lifecycle state info based on state key and entity type.
 * @param {string} state - Key from VERIFICATION_LIFECYCLE_STATES
 * @param {string} entityType - 'MANAGER' | 'TENANT' | 'PROPERTY' | 'TECHNICIAN'
 * @returns {Object} { label, description }
 */
export function getLifecycleStateInfo(state = 'DRAFT', entityType = 'TENANT') {
  const normalizedEntity = (entityType || 'TENANT').toUpperCase();
  const normalizedState = (state || 'DRAFT').toUpperCase();
  const entityMap = LIFECYCLE_TERMINOLOGY_MAP[normalizedEntity] || LIFECYCLE_TERMINOLOGY_MAP.TENANT;
  return entityMap[normalizedState] || { label: state, description: 'Verification state' };
}

export default {
  VERIFICATION_LIFECYCLE_STATES,
  LIFECYCLE_TERMINOLOGY_MAP,
  getLifecycleStateInfo,
};
