/**
 * @typedef {Object} TenantDashboardPayload
 * @property {boolean} hasActiveLease - Active lease exist flag
 * @property {Object} user - User context
 * @property {string} user.name
 * @property {string} user.email
 * @property {Object} tenant
 * @property {string} tenant.id
 * @property {string} tenant.name
 * @property {string} tenant.status
 * @property {Object} property
 * @property {string} property.id
 * @property {string} property.name
 * @property {string} property.address
 * @property {string} property.unitNumber
 * @property {Object} lease
 * @property {string} lease.id
 * @property {number} lease.rentAmount
 * @property {number} lease.securityDeposit
 * @property {string} lease.startDate
 * @property {string} lease.endDate
 * @property {string} lease.duration
 * @property {number} lease.daysRemaining
 * @property {string} lease.status
 * @property {Object} [activeRenewal]
 * @property {string} activeRenewal.id
 * @property {string} activeRenewal.renewalNumber
 * @property {string} activeRenewal.status
 * @property {number} activeRenewal.proposedRent
 * @property {string} activeRenewal.duration
 * @property {number} activeRenewal.version
 * @property {string} activeRenewal.message
 * @property {Object} payments
 * @property {number} payments.outstandingBalance
 * @property {number} payments.overdueCount
 * @property {number} payments.unpaidCount
 * @property {Object} maintenance
 * @property {number} maintenance.openCount
 * @property {number} maintenance.totalCount
 * @property {number} healthScore
 * @property {Array<Object>} timeline
 * @property {Object} eligibility
 * @property {boolean} eligibility.eligible
 * @property {Object} eligibility.checklist
 * @property {Array<Object>} documents
 * @property {Array<Object>} recentActivities
 */
export const Dummy = {};
