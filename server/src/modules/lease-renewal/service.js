import Lease from '../../models/Lease.js';
import Tenant from '../../models/Tenant.js';
import Property from '../../models/Property.js';
import Payment from '../../models/Payment.js';
import Maintenance from '../../models/Maintenance.js';
import User from '../../models/User.js';
import { DomainError, ErrorCatalog } from '../../platform/errors/errorCatalog.js';
import { RenewalStatus, ALLOWED_TRANSITIONS } from './constants.js';
import * as repository from './repository.js';
import { generateSequenceNumber } from '../../platform/sequence/sequenceService.js';
import { logRenewalAudit } from '../../platform/audit/auditService.js';
import { dispatchEvent } from '../../platform/events/eventDispatcher.js';
import { EventTypes } from '../../platform/events/eventTypes.js';

/**
 * State Machine Transition Validator.
 */
export const canTransition = (currentStatus, nextStatus) => {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
};

/**
 * Check if the tenant user is authorized to access this renewal record.
 */
export const checkAuthorization = async (renewal, user) => {
  if (user.role === 'admin') return true;
  
  if (user.role === 'tenant') {
    const tenantRecord = await Tenant.findById(renewal.tenant);
    if (!tenantRecord) {
      throw new DomainError(ErrorCatalog.UNAUTHORIZED_RENEWAL);
    }
    // Check email match
    const userRecord = await User.findById(user.userId);
    if (!userRecord || userRecord.email !== tenantRecord.email) {
      throw new DomainError(ErrorCatalog.UNAUTHORIZED_RENEWAL);
    }
    return true;
  }
  
  if (user.role === 'manager') {
    const propertyRecord = await Property.findById(renewal.property);
    if (!propertyRecord || (propertyRecord.manager?.toString() !== user.userId && propertyRecord.owner?.toString() !== user.userId)) {
      throw new DomainError(ErrorCatalog.UNAUTHORIZED_RENEWAL);
    }
    return true;
  }
  
  throw new DomainError(ErrorCatalog.UNAUTHORIZED_RENEWAL);
};

/**
 * Validate lease status and tenant metrics before allowing a renewal request.
 */
export const canRenew = async (lease, tenantRecord) => {
  // 1. Current lease must be active
  if (lease.status !== 'active') {
    throw new DomainError(ErrorCatalog.LEASE_ALREADY_EXPIRED);
  }

  // 2. Lease is already expired check
  if (new Date(lease.endDate) < new Date()) {
    throw new DomainError(ErrorCatalog.LEASE_ALREADY_EXPIRED);
  }

  // 3. Current lease decision check
  if (lease.leaseDecision !== 'pending' && lease.leaseDecision !== 'offer_sent') {
    throw new DomainError(ErrorCatalog.RENEWAL_ALREADY_EXISTS);
  }

  // 4. Inactive property check
  const propertyRecord = await Property.findById(lease.property);
  if (!propertyRecord || propertyRecord.status === 'inactive') {
    throw new DomainError(ErrorCatalog.INACTIVE_PROPERTY);
  }

  // 5. Outstanding payments check
  const unpaidPayments = await Payment.findOne({
    lease: lease._id,
    status: { $in: ['pending', 'partially_paid', 'overdue'] }
  });
  if (unpaidPayments) {
    throw new DomainError(ErrorCatalog.OUTSTANDING_RENT_BALANCE);
  }

  // 6. Open maintenance requests check
  const openMaintenance = await Maintenance.findOne({
    property: lease.property,
    tenant: lease.tenant,
    status: { $in: ['open', 'in_progress'] }
  });
  if (openMaintenance) {
    throw new DomainError(ErrorCatalog.OPEN_MAINTENANCE_TICKETS);
  }

  return true;
};

/**
 * Create a new lease renewal request.
 */
export const createRenewalRequest = async ({
  leaseId,
  duration,
  message,
  proposedRent,
  requestedStartDate,
  requestedEndDate,
  userId,
  auditContext = {}
}) => {
  const lease = await Lease.findById(leaseId);
  if (!lease) {
    throw new DomainError(ErrorCatalog.LEASE_NOT_FOUND);
  }

  const tenantRecord = await Tenant.findById(lease.tenant);
  if (!tenantRecord) {
    throw new DomainError(ErrorCatalog.INACTIVE_PROPERTY);
  }

  // Validate business rules
  await canRenew(lease, tenantRecord);

  // Prevent multiple pending requests
  const existingPending = await repository.findPendingByLeaseId(leaseId);
  if (existingPending && ['requested', 'under_review', 'counter_offer', 'pending', 'offered'].includes(existingPending.status)) {
    throw new DomainError(ErrorCatalog.RENEWAL_ALREADY_EXISTS);
  }

  // Generate sequence LRN number atomically
  const renewalNumber = await generateSequenceNumber('LRN', 'leaserenewal');

  // Create document
  const renewal = await repository.create({
    lease: leaseId,
    tenant: lease.tenant,
    manager: lease.createdBy,
    property: lease.property,
    requestedStartDate: new Date(requestedStartDate),
    requestedEndDate: new Date(requestedEndDate),
    duration,
    message,
    proposedRent: Number(proposedRent) || lease.rentAmount,
    type: 'tenant_request',
    status: RenewalStatus.REQUESTED,
    renewalNumber,
    createdBy: userId,
  });

  // Log audit trail
  await logRenewalAudit({
    leaseRenewalId: renewal._id,
    userId,
    action: 'CREATE',
    oldValue: null,
    newValue: renewal.toObject(),
    ...auditContext
  });

  return renewal;
};

/**
 * Get renewal request details by ID.
 */
export const getRenewalDetails = async (id, user) => {
  const renewal = await repository.findById(id);
  if (!renewal) {
    throw new DomainError(ErrorCatalog.LEASE_NOT_FOUND);
  }

  await checkAuthorization(renewal, user);
  return renewal;
};

/**
 * Update a renewal request with optimistic concurrency locks.
 */
export const updateRenewalRequest = async (id, payload, user, auditContext = {}) => {
  const renewal = await repository.findById(id);
  if (!renewal) {
    throw new DomainError(ErrorCatalog.LEASE_NOT_FOUND);
  }

  await checkAuthorization(renewal, user);

  if (renewal.status !== RenewalStatus.REQUESTED && renewal.status !== RenewalStatus.COUNTER_OFFER) {
    throw new DomainError(ErrorCatalog.INVALID_STATE_TRANSITION);
  }

  // Optimistic concurrency locking verification
  if (payload.version !== undefined && renewal.version !== payload.version) {
    throw new DomainError(ErrorCatalog.CONCURRENT_UPDATE_REVISION);
  }

  const oldValue = renewal.toObject();

  // Map updates
  if (payload.duration) renewal.duration = payload.duration;
  if (payload.message) renewal.message = payload.message;
  if (payload.proposedRent) renewal.proposedRent = Number(payload.proposedRent);
  if (payload.requestedStartDate) renewal.requestedStartDate = new Date(payload.requestedStartDate);
  if (payload.requestedEndDate) renewal.requestedEndDate = new Date(payload.requestedEndDate);

  renewal.updatedBy = user.userId;
  const updatedRenewal = await repository.save(renewal);

  // Log audit
  await logRenewalAudit({
    leaseRenewalId: renewal._id,
    userId: user.userId,
    action: 'UPDATE',
    oldValue,
    newValue: updatedRenewal.toObject(),
    ...auditContext
  });

  return updatedRenewal;
};

/**
 * Cancel a renewal request (Soft Delete).
 */
export const cancelRenewalRequest = async (id, user, auditContext = {}) => {
  const renewal = await repository.findById(id);
  if (!renewal) {
    throw new DomainError(ErrorCatalog.LEASE_NOT_FOUND);
  }

  await checkAuthorization(renewal, user);

  if (!canTransition(renewal.status, RenewalStatus.CANCELLED)) {
    throw new DomainError(ErrorCatalog.INVALID_STATE_TRANSITION);
  }

  const oldValue = renewal.toObject();

  // Set status
  renewal.status = RenewalStatus.CANCELLED;
  renewal.isDeleted = true;
  renewal.deletedAt = new Date();
  renewal.deletedBy = user.userId;

  const cancelledRenewal = await repository.save(renewal);

  // Log audit
  await logRenewalAudit({
    leaseRenewalId: renewal._id,
    userId: user.userId,
    action: 'CANCEL',
    oldValue,
    newValue: cancelledRenewal.toObject(),
    ...auditContext
  });

  return cancelledRenewal;
};

/**
 * Fetch tenant renewals.
 */
export const getTenantRenewals = async (userId) => {
  const userRecord = await User.findById(userId).select('email');
  if (!userRecord) {
    throw new DomainError(ErrorCatalog.UNAUTHORIZED_RENEWAL);
  }

  const tenantRecord = await Tenant.findOne({ email: userRecord.email });
  if (!tenantRecord) {
    return [];
  }

  return await repository.findByTenantId(tenantRecord._id);
};

/**
 * Fetch manager renewals.
 */
export const getManagerRenewals = async (userId) => {
  return await repository.findByManagerId(userId);
};

export { getTenantDashboardData } from './dashboardService.js';

/**
 * Submit a counter offer (negotiation versioning).
 */
export const submitCounterOffer = async (id, { proposedRent, duration, message }, user, auditContext = {}) => {
  const renewal = await repository.findById(id);
  if (!renewal) {
    throw new DomainError(ErrorCatalog.LEASE_NOT_FOUND);
  }

  await checkAuthorization(renewal, user);

  if (!canTransition(renewal.status, RenewalStatus.COUNTER_OFFER)) {
    throw new DomainError(ErrorCatalog.INVALID_STATE_TRANSITION);
  }

  const oldValue = renewal.toObject();

  // Version counter offers
  renewal.counterOffers.push({
    proposedRent: Number(proposedRent),
    duration,
    message,
    createdBy: user.userId,
    createdAt: new Date()
  });

  renewal.proposedRent = Number(proposedRent);
  renewal.duration = duration;
  renewal.status = RenewalStatus.COUNTER_OFFER;
  renewal.renewalVersion += 1;
  renewal.updatedBy = user.userId;

  const savedRenewal = await repository.save(renewal);

  // Dispatch Domain Event
  const isManager = user.role === 'manager' || user.role === 'admin';
  const eventType = isManager ? EventTypes.LEASE.RENEWAL_OFFERED : EventTypes.LEASE.RENEWAL_REQUESTED;
  await dispatchEvent(eventType, {
    leaseRenewalId: savedRenewal._id,
    proposedRent: savedRenewal.proposedRent,
    duration: savedRenewal.duration,
    version: savedRenewal.renewalVersion,
    userId: user.userId
  });

  // Log Audit Entry
  await logRenewalAudit({
    leaseRenewalId: renewal._id,
    userId: user.userId,
    action: 'COUNTER',
    oldValue,
    newValue: savedRenewal.toObject(),
    ...auditContext
  });

  return savedRenewal;
};

/**
 * Add message to the renewal conversation thread.
 */
export const addMessage = async (id, content, user) => {
  const renewal = await repository.findById(id);
  if (!renewal) {
    throw new DomainError(ErrorCatalog.LEASE_NOT_FOUND);
  }

  await checkAuthorization(renewal, user);

  const userName = user.name || user.email || 'User';

  renewal.messages.push({
    sender: user.userId,
    senderName: userName,
    content,
    createdAt: new Date()
  });

  const savedRenewal = await repository.save(renewal);
  return savedRenewal.messages;
};

/**
 * Get message logs history.
 */
export const getRenewalMessages = async (id, user) => {
  const renewal = await repository.findById(id);
  if (!renewal) {
    throw new DomainError(ErrorCatalog.LEASE_NOT_FOUND);
  }

  await checkAuthorization(renewal, user);
  return renewal.messages;
};

/**
 * Get counter offers version history.
 */
export const getRenewalOffers = async (id, user) => {
  const renewal = await repository.findById(id);
  if (!renewal) {
    throw new DomainError(ErrorCatalog.LEASE_NOT_FOUND);
  }

  await checkAuthorization(renewal, user);
  return renewal.counterOffers;
};

/**
 * Approve and accept renewal terms.
 */
export const acceptRenewal = async (id, user, auditContext = {}) => {
  const renewal = await repository.findById(id);
  if (!renewal) {
    throw new DomainError(ErrorCatalog.LEASE_NOT_FOUND);
  }

  await checkAuthorization(renewal, user);

  if (!canTransition(renewal.status, RenewalStatus.APPROVED)) {
    throw new DomainError(ErrorCatalog.INVALID_STATE_TRANSITION);
  }

  const oldValue = renewal.toObject();

  renewal.status = RenewalStatus.APPROVED;
  renewal.approvalDate = new Date();
  renewal.approvedBy = user.userId;
  renewal.updatedBy = user.userId;

  const savedRenewal = await repository.save(renewal);

  // Dispatch Domain Event
  await dispatchEvent(EventTypes.LEASE.RENEWAL_APPROVED, {
    leaseRenewalId: savedRenewal._id,
    approvedBy: user.userId
  });

  // Log Audit
  await logRenewalAudit({
    leaseRenewalId: renewal._id,
    userId: user.userId,
    action: 'APPROVE',
    oldValue,
    newValue: savedRenewal.toObject(),
    ...auditContext
  });

  return savedRenewal;
};

/**
 * Reject renewal request.
 */
export const rejectRenewal = async (id, rejectionReason, user, auditContext = {}) => {
  const renewal = await repository.findById(id);
  if (!renewal) {
    throw new DomainError(ErrorCatalog.LEASE_NOT_FOUND);
  }

  await checkAuthorization(renewal, user);

  if (!canTransition(renewal.status, RenewalStatus.REJECTED)) {
    throw new DomainError(ErrorCatalog.INVALID_STATE_TRANSITION);
  }

  const oldValue = renewal.toObject();

  renewal.status = RenewalStatus.REJECTED;
  renewal.rejectionReason = rejectionReason;
  renewal.updatedBy = user.userId;

  const savedRenewal = await repository.save(renewal);

  // Dispatch Domain Event
  await dispatchEvent(EventTypes.LEASE.RENEWAL_REJECTED, {
    leaseRenewalId: savedRenewal._id,
    rejectedBy: user.userId
  });

  // Log Audit
  await logRenewalAudit({
    leaseRenewalId: renewal._id,
    userId: user.userId,
    action: 'REJECT',
    oldValue,
    newValue: savedRenewal.toObject(),
    ...auditContext
  });

  return savedRenewal;
};

/**
 * Sign renewal agreement document.
 */
export const signRenewal = async (id, signatureData, user, ipAddress, userAgent, auditContext = {}) => {
  const renewal = await repository.findById(id);
  if (!renewal) {
    throw new DomainError(ErrorCatalog.LEASE_NOT_FOUND);
  }

  await checkAuthorization(renewal, user);

  if (!canTransition(renewal.status, RenewalStatus.SIGNED)) {
    throw new DomainError(ErrorCatalog.INVALID_STATE_TRANSITION);
  }

  const oldValue = renewal.toObject();

  const signatureRecord = {
    signatureData,
    signedAt: new Date(),
    ipAddress,
    userAgent
  };

  const isTenant = user.role === 'tenant';
  if (isTenant) {
    renewal.tenantSignature = signatureRecord;
  } else {
    renewal.managerSignature = signatureRecord;
  }

  renewal.status = RenewalStatus.SIGNED;
  renewal.updatedBy = user.userId;

  // If both parties signed -> auto-complete and promote to COMPLETED
  const bothSigned = renewal.tenantSignature?.signatureData && renewal.managerSignature?.signatureData;
  if (bothSigned) {
    renewal.status = RenewalStatus.COMPLETED;
    
    // Auto-create/extend actual Lease record
    const currentLease = await Lease.findById(renewal.lease);
    if (currentLease) {
      currentLease.status = 'expired';
      await currentLease.save();

      // Create new Lease record
      await Lease.create({
        leaseNumber: `LSE-${Date.now()}`,
        tenant: renewal.tenant,
        property: renewal.property,
        rentAmount: renewal.proposedRent,
        securityDeposit: currentLease.securityDeposit,
        startDate: renewal.requestedStartDate,
        endDate: renewal.requestedEndDate,
        duration: renewal.duration,
        status: 'active',
        createdBy: renewal.manager
      });
    }
  }

  const savedRenewal = await repository.save(renewal);

  // Dispatch Domain Event
  const eventType = bothSigned ? EventTypes.LEASE.RENEWAL_COMPLETED : EventTypes.LEASE.RENEWAL_SIGNED;
  await dispatchEvent(eventType, {
    leaseRenewalId: savedRenewal._id,
    signedBy: user.userId
  });

  // Log Audit
  await logRenewalAudit({
    leaseRenewalId: renewal._id,
    userId: user.userId,
    action: bothSigned ? 'COMPLETE' : 'SIGN',
    oldValue,
    newValue: savedRenewal.toObject(),
    ...auditContext
  });

  return savedRenewal;
};
