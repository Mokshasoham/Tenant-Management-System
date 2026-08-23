/**
 * Payment Schedule & Next Rent Date Calculation Engine (Server)
 * 
 * Provides deterministic, calendar-accurate payment cycle calculations anchored to
 * the active lease start date and real payment history.
 * 
 * Rules:
 * 1. Payment due date is anchored to the lease start date's day of month.
 * 2. Unpaid rent cycles NEVER disappear or get skipped when due date passes.
 * 3. Lifecycle progression per cycle: UPCOMING -> DUE TODAY -> OVERDUE (daily late fee) -> PAID.
 * 4. Advances to cycle N+1 ONLY after cycle N is confirmed PAID.
 * 5. Overdue and late fees are calculated dynamically in real-time from the exact currentDate.
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
 * @param {Date|string} currentDate - Optional current reference date (defaults to now)
 * @returns {Object|null} Object containing nextPaymentDueAt, rentAmount, lateFee, totalDue, status, etc.
 */
export function calculateNextPaymentDue(lease, leasePayments = [], currentDate = new Date()) {
  if (!lease || !lease.startDate) {
    return null;
  }

  const leaseIdStr = lease._id ? lease._id.toString() : (lease.id ? lease.id.toString() : '');
  const payments = Array.isArray(leasePayments) ? leasePayments.filter(p => {
    if (!p) return false;
    const pLeaseId = p.lease?._id ? p.lease._id.toString() : (p.lease ? p.lease.toString() : '');
    return !leaseIdStr || !pLeaseId || pLeaseId === leaseIdStr;
  }) : [];

  const lateFeePerDay = Number(lease.lateFeePerDay) || 100;
  const rentAmount = Number(lease.rentAmount) || 0;
  const startDate = new Date(lease.startDate);
  const now = new Date(currentDate);

  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

  // 1. Check for active pending, overdue, generated, or partially_paid payment in DB
  const activeDbPayment = payments.find(p => 
    ['pending', 'overdue', 'partially_paid', 'generated'].includes(p.status)
  );

  if (activeDbPayment && activeDbPayment.dueDate) {
    const dueDate = new Date(activeDbPayment.dueDate);
    const dueStart = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate(), 0, 0, 0, 0));
    const baseRent = Number(activeDbPayment.rentAmount || activeDbPayment.amount || rentAmount);

    let status = 'upcoming';
    let daysLate = 0;
    let daysLeft = 0;
    let lateFee = 0;

    if (todayStart.getTime() > dueStart.getTime()) {
      status = 'overdue';
      daysLate = Math.floor((todayStart.getTime() - dueStart.getTime()) / (1000 * 60 * 60 * 24));
      lateFee = daysLate * lateFeePerDay;
    } else if (todayStart.getTime() === dueStart.getTime()) {
      status = 'due';
      daysLate = 0;
      lateFee = 0;
    } else {
      status = 'upcoming';
      daysLeft = Math.ceil((dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
    }

    const totalDue = baseRent + lateFee;

    return {
      nextPaymentDueAt: dueDate.toISOString(),
      amount: totalDue,
      rentAmount: baseRent,
      lateFeePerDay,
      daysLate,
      daysLeft,
      lateFee,
      totalDue,
      status,
      isOverdue: status === 'overdue',
      isDueToday: status === 'due',
      isUpcoming: status === 'upcoming',
      isEstimate: false,
      isConfirmed: true,
      paymentId: activeDbPayment._id || activeDbPayment.id || null,
      billingPeriodStart: activeDbPayment.billingPeriodStart ? new Date(activeDbPayment.billingPeriodStart).toISOString() : null,
      billingPeriodEnd: activeDbPayment.billingPeriodEnd ? new Date(activeDbPayment.billingPeriodEnd).toISOString() : null,
    };
  }

  // 2. Determine active cycle from paid rent records
  const paidRentPayments = payments.filter(p => 
    p.status === 'paid' && (!p.type || p.type === 'rent')
  );

  const activeCycleIndex = paidRentPayments.length;
  const dueDate = getLeaseCycleDate(startDate, activeCycleIndex);
  if (!dueDate) return null;

  const dueStart = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate(), 0, 0, 0, 0));
  const periodStart = dueDate;
  const periodEnd = getLeaseCycleDate(startDate, activeCycleIndex + 1);

  // If lease is completed (all cycles within duration are paid AND current date past end date)
  if (lease.endDate) {
    const endDate = new Date(lease.endDate);
    if (dueDate.getTime() >= endDate.getTime() && now.getTime() >= endDate.getTime() && paidRentPayments.length > 0) {
      return null; // Completed lease
    }
  }

  let status = 'upcoming';
  let daysLate = 0;
  let daysLeft = 0;
  let lateFee = 0;

  if (todayStart.getTime() > dueStart.getTime()) {
    status = 'overdue';
    daysLate = Math.floor((todayStart.getTime() - dueStart.getTime()) / (1000 * 60 * 60 * 24));
    lateFee = daysLate * lateFeePerDay;
  } else if (todayStart.getTime() === dueStart.getTime()) {
    status = 'due';
    daysLate = 0;
    lateFee = 0;
  } else {
    status = 'upcoming';
    daysLeft = Math.ceil((dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  }

  const totalDue = rentAmount + lateFee;

  return {
    nextPaymentDueAt: dueDate.toISOString(),
    amount: totalDue,
    rentAmount,
    lateFeePerDay,
    daysLate,
    daysLeft,
    lateFee,
    totalDue,
    status,
    isOverdue: status === 'overdue',
    isDueToday: status === 'due',
    isUpcoming: status === 'upcoming',
    isEstimate: true,
    isConfirmed: false,
    paymentId: null,
    billingPeriodStart: periodStart.toISOString(),
    billingPeriodEnd: periodEnd ? periodEnd.toISOString() : null,
    cycleIndex: activeCycleIndex
  };
}
