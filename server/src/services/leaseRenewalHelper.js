import Lease from '../models/Lease.js';
import logger from '../utils/logger.js';

/**
 * Shared Idempotent Helper to Approve a Lease Renewal and Provision the Next Lease.
 * Used by both leaseRenewalController and modular lease-renewal service.
 * Guarantees that duplicate requests do not create duplicate Lease documents.
 */
export const executeRenewalApproval = async ({ renewal, currentLease, userId }) => {
  if (!renewal || !currentLease) {
    throw new Error('Renewal and current lease are required for approval execution');
  }

  // 1. Idempotency Check on currentLease.renewedTo
  if (currentLease.renewedTo) {
    const existing = await Lease.findById(currentLease.renewedTo);
    if (existing) {
      logger.info(`[RENEWAL APPROVAL] Found existing renewed lease ${existing._id} on currentLease.renewedTo. Skipping duplicate creation.`);
      if (renewal.status !== 'approved') {
        renewal.status = 'approved';
        renewal.approvedBy = userId;
        renewal.approvalDate = new Date();
        renewal.timeline.push({ event: 'Approved', note: 'Lease renewal marked approved (idempotent link).' });
        await renewal.save();
      }
      return existing;
    }
  }

  // 2. Idempotency Check by query: has a renewed lease already been created from this lease?
  let existingRenewedLease = await Lease.findOne({
    property: currentLease.property,
    renewedFrom: currentLease._id,
    status: { $in: ['pending', 'active'] }
  });

  if (existingRenewedLease) {
    logger.info(`[RENEWAL APPROVAL] Found existing renewed lease ${existingRenewedLease._id} via renewedFrom query. Linking idempotently.`);
    currentLease.renewedTo = existingRenewedLease._id;
    currentLease.leaseDecision = 'renewed';
    await currentLease.save();

    if (renewal.status !== 'approved') {
      renewal.status = 'approved';
      renewal.approvedBy = userId;
      renewal.approvalDate = new Date();
      renewal.timeline.push({ event: 'Approved', note: 'Lease renewal marked approved.' });
      await renewal.save();
    }
    return existingRenewedLease;
  }

  // 3. Mark renewal as approved
  renewal.status = 'approved';
  renewal.approvedBy = userId;
  renewal.approvalDate = new Date();
  renewal.timeline.push({ event: 'Approved', note: 'Lease renewal request approved.' });
  await renewal.save();

  // 4. Create single renewed future lease
  const count = await Lease.countDocuments();
  const leaseNumber = `LEASE-${Date.now()}-${count + 1}`;

  const newLease = await Lease.create({
    leaseNumber,
    property: currentLease.property,
    tenant: currentLease.tenant,
    startDate: renewal.requestedStartDate,
    endDate: renewal.requestedEndDate,
    rentAmount: renewal.proposedRent || currentLease.rentAmount,
    depositAmount: currentLease.depositAmount,
    utilities: currentLease.utilities,
    terms: currentLease.terms,
    status: 'pending', // Pending until startDate arrives
    leaseDecision: 'pending',
    createdBy: userId,
    leaseVersion: (currentLease.leaseVersion || 1) + 1,
    parentLease: currentLease.parentLease || currentLease._id,
    renewedFrom: currentLease._id
  });

  // 5. Link currentLease to the newly created lease
  currentLease.renewedTo = newLease._id;
  currentLease.leaseDecision = 'renewed';
  await currentLease.save();

  logger.info(`[RENEWAL APPROVAL] Successfully created renewed lease ${newLease.leaseNumber} for parent ${currentLease.leaseNumber}`);
  return newLease;
};
