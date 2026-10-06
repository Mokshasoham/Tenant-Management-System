/**
 * Authoritative Lease Lifecycle & Payment Resolution Engine
 * Handles status derivation, decision window enforcement,
 * capability flags, and strict payment balance accounting.
 */

/**
 * Calculates the exact outstanding balance on a payment record.
 * Handles partial payments, missing amountPaid, and never returns negative.
 * Failed or cancelled payments are not treated as unpaid rent.
 */
export const getPaymentOutstandingBalance = (payment) => {
  if (!payment) return 0;
  // Only 'pending', 'overdue', 'partially_paid' are considered outstanding obligations
  if (!['pending', 'overdue', 'partially_paid'].includes(payment.status)) {
    return 0;
  }
  const total = Number(payment.amount != null ? payment.amount : (payment.totalAmount || 0));
  const paid = Number(payment.amountPaid || 0);
  const balance = total - paid;
  return balance > 0 ? balance : 0;
};

/**
 * Strictly aggregates payment summary for a single specific lease ID.
 * Prevents payment data bleed between properties or successive renewed leases.
 */
export const computeLeasePaymentSummary = (payments = [], leaseId) => {
  const leaseIdStr = String(leaseId || '');
  if (!leaseIdStr) {
    return {
      totalPayments: 0,
      unpaidCount: 0,
      hasUnpaidDues: false,
      totalOutstandingBalance: 0,
      unpaidPayments: []
    };
  }

  const leasePayments = payments.filter(p => {
    const pLeaseId = String(p.lease?._id || p.lease || '');
    return pLeaseId && pLeaseId === leaseIdStr;
  });

  const unpaidPayments = [];
  let totalOutstandingBalance = 0;

  for (const p of leasePayments) {
    const balance = getPaymentOutstandingBalance(p);
    if (balance > 0) {
      totalOutstandingBalance += balance;
      unpaidPayments.push({
        _id: p._id,
        type: p.type || 'rent',
        status: p.status,
        amount: p.amount,
        amountPaid: p.amountPaid || 0,
        balance,
        dueDate: p.dueDate,
        paymentDate: p.paymentDate,
        billingPeriod: p.dueDate 
          ? new Date(p.dueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : 'Tenancy Dues',
        invoiceUrl: p.invoiceUrl || null,
        property: p.property
      });
    }
  }

  return {
    totalPayments: leasePayments.length,
    unpaidCount: unpaidPayments.length,
    hasUnpaidDues: unpaidPayments.length > 0,
    hasOutstandingDues: unpaidPayments.length > 0,
    totalOutstandingBalance,
    unpaidTotal: totalOutstandingBalance,
    unpaidPayments
  };
};

/**
 * Resolves the authoritative lifecycle state, capabilities, and dates for a lease.
 * Distinguishes automatic expiration from tenant-submitted decisions.
 */
export const resolveLeaseLifecycle = (lease, payments = [], now = new Date()) => {
  if (!lease) return null;

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const endMs = new Date(lease.endDate).getTime();
  const startMs = new Date(lease.startDate).getTime();

  // Authoritative day difference calculation (1 day = 86,400,000 ms)
  const diffMs = endMs - nowMs;
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Authoritative 7-day decision window
  // Time remaining rules:
  // > 7 days: Decision window closed / no prompt
  // 1 <= daysRemaining <= 7: Decision window open (Renew or Move Out)
  // <= 0 days: Expiry date reached/passed (Renewal closed; Move Out only unless already submitted)
  const isWithinDecisionWindow = daysRemaining > 0 && daysRemaining <= 7;
  const isDecisionDeadlinePassed = daysRemaining <= 0;
  const isPastEndDate = nowMs > endMs;

  // Specific tenant-submitted actions
  const isMoveOutFinalized = lease.moveOutStatus === 'completed';
  const isMoveOutSubmitted = [
    'requested',
    'notice_submitted',
    'inspection_scheduled',
    'inspection_completed',
    'refund_processing',
    'completed'
  ].includes(lease.moveOutStatus) || lease.leaseDecision === 'moving_out';

  const hasTenantSubmittedMoveOut = isMoveOutSubmitted;
  const hasTenantSubmittedRenewal = lease.leaseDecision === 'renewal_requested';
  const isRenewed = lease.leaseDecision === 'renewed' || Boolean(lease.renewedTo);

  // IMPORTANT SAFEGUARD:
  // Setting leaseDecision to 'expired' or automatic expiry does NOT mean the tenant submitted a decision!
  // Only actual tenant submissions count:
  const hasTenantSubmittedDecision = hasTenantSubmittedMoveOut || hasTenantSubmittedRenewal || isRenewed;

  // Signatures check for pending leases
  const isTenantSigned = Boolean(lease.signature && lease.signedBy && lease.signedAt);
  const isManagerSigned = Boolean(lease.managerSignature || lease.managerSignedAt);
  const isBothSigned = isTenantSigned && isManagerSigned;

  // Determine Effective Status
  let effectiveStatus = 'active';

  if (isRenewed) {
    effectiveStatus = 'renewed';
  } else if (isMoveOutFinalized && (isPastEndDate || daysRemaining <= 0 || lease.status === 'expired')) {
    effectiveStatus = 'expired';
  } else if (hasTenantSubmittedMoveOut) {
    effectiveStatus = 'moving_out';
  } else if (hasTenantSubmittedRenewal) {
    effectiveStatus = 'renewal_requested';
  } else if (isPastEndDate || daysRemaining <= 0 || lease.status === 'expired') {
    effectiveStatus = 'expired';
  } else if (isWithinDecisionWindow) {
    effectiveStatus = 'expiring_soon';
  } else if (lease.status === 'pending') {
    if (isBothSigned) {
      effectiveStatus = nowMs >= startMs ? 'active' : 'upcoming';
    } else if (isTenantSigned && !isManagerSigned) {
      effectiveStatus = 'pending_manager';
    } else {
      effectiveStatus = 'pending';
    }
  } else {
    effectiveStatus = 'active';
  }

  // Capability flags:
  // Renewal allowed ONLY if:
  // 1. Within 7-day decision window (1 <= daysRemaining <= 7)
  // 2. Lease is active
  // 3. No decision already submitted
  // 4. Expiry deadline has NOT passed
  const canRenew = isWithinDecisionWindow && !hasTenantSubmittedDecision && !isDecisionDeadlinePassed && lease.status === 'active';

  // Move-out allowed if:
  // 1. Within 7-day window OR expiry deadline reached/passed
  // 2. Tenant has NOT already submitted move-out
  // 3. Not already renewed
  const canMoveOut = (isWithinDecisionWindow || isDecisionDeadlinePassed || effectiveStatus === 'expired')
                    && !hasTenantSubmittedMoveOut
                    && !isRenewed;

  // Decision deadline date: the exact lease end date (or end of the 7-day window)
  const decisionDeadlineDate = new Date(lease.endDate);

  // Attached payment summary for this specific lease
  const paymentSummary = computeLeasePaymentSummary(payments, lease._id);

  return {
    effectiveStatus,
    daysRemaining,
    isWithinDecisionWindow,
    isDecisionDeadlinePassed,
    isPastEndDate,
    canRenew,
    canMoveOut,
    hasTenantSubmittedDecision,
    hasTenantSubmittedMoveOut,
    hasTenantSubmittedRenewal,
    isRenewed,
    isMoveOutSubmitted,
    isMoveOutFinalized,
    moveOutStatus: lease.moveOutStatus || 'none',
    decisionDeadlineDate,
    paymentSummary
  };
};
