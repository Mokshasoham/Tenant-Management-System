/**
 * Payment Schedule & Next Rent Date Calculation Engine (Frontend)
 * 
 * Provides deterministic, calendar-accurate payment cycle calculations anchored to
 * the active lease start date and real payment history.
 * 
 * Rules:
 * 1. Payment due date is anchored to the lease start date's day of month (or activation day).
 * 2. Handles months with fewer days via calendar clamping (e.g. Jan 31 -> Feb 28 -> Mar 31).
 * 3. Incorporates existing pending/overdue DB payments as authoritative (CONFIRMED).
 * 4. Counts paid rent cycles to project the next unpaid scheduled monthly date (ESTIMATED).
 * 5. Prevents any reliance on `today + 30 days` or midnight shifts.
 */

/**
 * Calculates a specific monthly cycle date for a given start date.
 * @param {string|Date} startDateInput - The lease start date
 * @param {number} cycleIndex - 0-indexed monthly cycle (0 = start month, 1 = month 2, etc.)
 * @returns {Date} Date object anchored at 00:00:00.000 UTC on the target day
 */
export function getLeaseCycleDate(startDateInput, cycleIndex) {
  if (!startDateInput) return null;
  const start = new Date(startDateInput);
  if (isNaN(start.getTime())) return null;

  // Use UTC to prevent local timezone offsets from shifting the day
  const baseYear = start.getUTCFullYear();
  const baseMonth = start.getUTCMonth();
  const origDay = start.getUTCDate();

  const targetMonthIndex = baseMonth + cycleIndex;
  const targetYear = baseYear + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  // Calculate days in the target month (day 0 of next month in UTC gives last day of target month)
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(origDay, daysInTargetMonth);

  return new Date(Date.UTC(targetYear, targetMonth, clampedDay, 0, 0, 0, 0));
}

/**
 * Calculates the authoritative next payment due for a lease based on active records and payment history.
 * @param {Object} lease - The lease object
 * @param {Array} leasePayments - Array of payments associated with the tenant / lease
 * @returns {Object|null} Object containing nextPaymentDueAt, amount, status, isEstimate, isConfirmed
 */
export function calculateNextPaymentDue(lease, leasePayments = []) {
  if (!lease || !lease.startDate) {
    return null;
  }

  // If the backend already provided authoritative nextPaymentDueAt / nextPaymentSchedule on the lease object
  if (lease.nextPaymentDueAt && lease.nextPaymentSchedule) {
    return {
      nextPaymentDueAt: lease.nextPaymentDueAt,
      amount: lease.nextPaymentAmount ?? lease.rentAmount,
      status: lease.nextPaymentStatus || 'scheduled',
      isEstimate: lease.nextPaymentIsEstimate !== undefined ? lease.nextPaymentIsEstimate : true,
      isConfirmed: !lease.nextPaymentIsEstimate,
      paymentId: lease.nextPaymentSchedule?.paymentId || null
    };
  }

  const leaseIdStr = lease._id ? lease._id.toString() : '';
  const payments = Array.isArray(leasePayments) ? leasePayments.filter(p => {
    if (!p) return false;
    const pLeaseId = p.lease?._id ? p.lease._id.toString() : (p.lease ? p.lease.toString() : '');
    return pLeaseId === leaseIdStr;
  }) : [];

  // 1. Check for active pending, overdue, generated, or partially_paid payment in DB
  const pendingPayment = payments.find(p => 
    ['pending', 'overdue', 'partially_paid', 'generated'].includes(p.status) && p.dueDate
  );

  if (pendingPayment && pendingPayment.dueDate) {
    const dueTime = new Date(pendingPayment.dueDate).getTime();
    const isOverdue = dueTime < Date.now() || pendingPayment.status === 'overdue';
    const amountDue = pendingPayment.amountDue !== undefined
      ? (pendingPayment.amountDue - (pendingPayment.amountPaid || 0))
      : (pendingPayment.amount || lease.rentAmount || 0);

    return {
      nextPaymentDueAt: new Date(pendingPayment.dueDate).toISOString(),
      amount: amountDue,
      status: isOverdue ? 'overdue' : (pendingPayment.status || 'pending'),
      isEstimate: false, // CONFIRMED because an explicit DB payment record exists
      isConfirmed: true,
      paymentId: pendingPayment._id
    };
  }

  // 2. Determine next cycle from paid rent records and lease start date
  const paidRentPayments = payments.filter(p => 
    p.status === 'paid' && (!p.type || p.type === 'rent')
  );

  const startDate = new Date(lease.startDate);
  const endDate = lease.endDate ? new Date(lease.endDate) : null;
  const now = new Date();

  let targetCycle = 0;

  if (paidRentPayments.length > 0) {
    // If tenant already paid N months of rent, next cycle is cycle N
    targetCycle = paidRentPayments.length;
  } else {
    // If no paid rent payments exist:
    // If lease start date is in the future, the next payment is cycle 0 (move-in rent)
    if (startDate.getTime() > now.getTime()) {
      targetCycle = 0;
    } else {
      // Start date is in the past.
      // Move-in / initial period was cycle 0.
      // Advance month by month until we find the first cycle that is upcoming (>= start of today in UTC)
      let c = 0;
      while (c < 120) {
        const cycleDate = getLeaseCycleDate(startDate, c);
        const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        if (cycleDate.getTime() >= todayStart.getTime()) {
          targetCycle = c;
          break;
        }
        c++;
      }
      // If start date was in the past and no cycle found >= today, default to cycle 1 (the next upcoming cycle)
      if (targetCycle === 0 && startDate.getTime() < now.getTime()) {
        targetCycle = 1;
      }
    }
  }

  const nextDueDate = getLeaseCycleDate(startDate, targetCycle);
  if (!nextDueDate) return null;

  // If the computed due date is beyond the lease end date and current time is past end date
  if (endDate && nextDueDate.getTime() > endDate.getTime() && now.getTime() > endDate.getTime()) {
    return null; // Lease completed
  }

  return {
    nextPaymentDueAt: nextDueDate.toISOString(),
    amount: lease.rentAmount || 0,
    status: 'scheduled',
    isEstimate: true, // ESTIMATED because derived from lease cycle
    isConfirmed: false,
    paymentId: null
  };
}
