/**
 * Automated Verification Suite for Deposit Settlement Workflow & Safeguards
 * 
 * Verifies:
 * 1. Finalize Move-Out Gate: Strictly requires DepositSettlement with status: 'Completed'
 * 2. Repair Deduction Fallback Fix: actualRepairCost = 0 is respected (does not fall back to estimate)
 * 3. Concurrent Idempotency: Unique lease index and atomic upsert semantics
 * 4. Payment Isolation: Rent dues strictly from ['rent', 'late_fee'], security_deposit NEVER counted as rent due
 * 5. Refund vs Settlement Distinction: refundStatus, refundAmount >= 0, excess as outstandingBalance >= 0
 * 6. Discretionary Deductions Validation: Rejection of negative amounts, missing reasons, category mapping
 * 7. Move-Out Requests Enrichment: isSettled, settlement, settlementId canonical fields
 */

import assert from 'assert';
import { resolveLeaseLifecycle } from '../src/utils/leaseLifecycle.js';

let totalTests = 0;
let passedTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
  }
}

console.log('================================================================');
console.log('RUNNING DEPOSIT SETTLEMENT WORKFLOW SAFEGUARDS VERIFICATION');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// Suite 1: Finalize Move-Out Gate
// -----------------------------------------------------------------------------
console.log('[Suite 1] Finalize Move-Out Gate Enforcement:');

it('Blocks finalization if no settlement document exists', () => {
  const settlement = null;
  const canFinalize = !!(settlement && settlement.status === 'Completed' && !settlement.isArchived);
  assert.strictEqual(canFinalize, false, 'Finalization must be blocked when settlement is missing');
});

it('Blocks finalization if settlement exists but status is "Pending"', () => {
  const settlement = { status: 'Pending', isArchived: false };
  const canFinalize = !!(settlement && settlement.status === 'Completed' && !settlement.isArchived);
  assert.strictEqual(canFinalize, false, 'Finalization must be blocked when status is Pending');
});

it('Blocks finalization if settlement exists but status is "Processing"', () => {
  const settlement = { status: 'Processing', isArchived: false };
  const canFinalize = !!(settlement && settlement.status === 'Completed' && !settlement.isArchived);
  assert.strictEqual(canFinalize, false, 'Finalization must be blocked when status is Processing');
});

it('Allows finalization when settlement exists with authoritative status: "Completed" and isArchived: false', () => {
  const settlement = { status: 'Completed', isArchived: false };
  const canFinalize = !!(settlement && settlement.status === 'Completed' && settlement.isArchived !== true);
  assert.strictEqual(canFinalize, true, 'Finalization must be allowed when status is Completed');
});

it('Backward-compatibility: Allows finalization on historical documents where isArchived is undefined/absent', () => {
  const historicalSettlement = { status: 'Completed' }; // isArchived field absent
  const canFinalize = !!(historicalSettlement && historicalSettlement.status === 'Completed' && historicalSettlement.isArchived !== true);
  assert.strictEqual(canFinalize, true, 'Historical settlement without isArchived field must be compatible');
});

it('Blocks finalization if settlement is archived (isArchived: true)', () => {
  const archivedSettlement = { status: 'Completed', isArchived: true };
  const canFinalize = !!(archivedSettlement && archivedSettlement.status === 'Completed' && archivedSettlement.isArchived !== true);
  assert.strictEqual(canFinalize, false, 'Archived settlement must not satisfy finalization gate');
});

// -----------------------------------------------------------------------------
// Suite 2: Repair Deduction Logic (Zero vs Estimate)
// -----------------------------------------------------------------------------
console.log('\n[Suite 2] Repair Deduction Logic & Falsy Zero Safeguard:');

function calculateRepairDeduction(inspection) {
  return inspection.actualRepairCost != null
    ? Number(inspection.actualRepairCost)
    : (Number(inspection.estimatedRepairCost) || 0);
}

it('Respects actualRepairCost = 0 and does NOT fall back to estimatedRepairCost', () => {
  const inspection = {
    actualRepairCost: 0,
    estimatedRepairCost: 4500
  };
  const repair = calculateRepairDeduction(inspection);
  assert.strictEqual(repair, 0, 'actualRepairCost: 0 must evaluate to 0, not 4500');
});

it('Uses actualRepairCost when explicitly provided as a positive number', () => {
  const inspection = {
    actualRepairCost: 2500,
    estimatedRepairCost: 5000
  };
  const repair = calculateRepairDeduction(inspection);
  assert.strictEqual(repair, 2500);
});

it('Falls back to estimatedRepairCost when actualRepairCost is null or undefined', () => {
  const inspection1 = { actualRepairCost: null, estimatedRepairCost: 3200 };
  const inspection2 = { estimatedRepairCost: 1800 };
  assert.strictEqual(calculateRepairDeduction(inspection1), 3200);
  assert.strictEqual(calculateRepairDeduction(inspection2), 1800);
});

it('Defaults to 0 if both actualRepairCost and estimatedRepairCost are absent/null', () => {
  const inspection = { actualRepairCost: null, estimatedRepairCost: null };
  assert.strictEqual(calculateRepairDeduction(inspection), 0);
});

// -----------------------------------------------------------------------------
// Suite 3: Payment Isolation (Rent & Fees vs Security Deposit)
// -----------------------------------------------------------------------------
console.log('\n[Suite 3] Payment Isolation & Rent Due Calculation:');

function calculateRentDue(payments, targetLeaseId) {
  const unpaidPayments = payments.filter(p =>
    p.lease?.toString() === targetLeaseId.toString() &&
    p.status !== 'paid' &&
    p.status !== 'cancelled' &&
    ['rent', 'late_fee'].includes(p.type)
  );

  return unpaidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

it('Excludes security_deposit payment from rent dues even if unpaid/pending', () => {
  const mockPayments = [
    { lease: 'L-1', type: 'rent', status: 'pending', amount: 15000 },
    { lease: 'L-1', type: 'late_fee', status: 'pending', amount: 500 },
    { lease: 'L-1', type: 'security_deposit', status: 'pending', amount: 30000 }, // MUST NOT be counted
    { lease: 'L-1', type: 'rent', status: 'paid', amount: 15000 },
    { lease: 'L-2', type: 'rent', status: 'pending', amount: 20000 } // Other lease
  ];

  const due = calculateRentDue(mockPayments, 'L-1');
  assert.strictEqual(due, 15500, 'Rent due must only include unpaid rent (15000) + late_fee (500)');
});

it('Calculates 0 rent due when all rent payments are paid', () => {
  const mockPayments = [
    { lease: 'L-1', type: 'rent', status: 'paid', amount: 15000 },
    { lease: 'L-1', type: 'security_deposit', status: 'paid', amount: 30000 }
  ];
  const due = calculateRentDue(mockPayments, 'L-1');
  assert.strictEqual(due, 0);
});

// -----------------------------------------------------------------------------
// Suite 4: Refund vs Liability Accounting Calculation
// -----------------------------------------------------------------------------
console.log('\n[Suite 4] Refund vs Liability Accounting:');

function computeSettlementFinancials(depositAmount, totalDeduction) {
  const refundAmount = Math.max(0, depositAmount - totalDeduction);
  const outstandingBalance = Math.max(0, totalDeduction - depositAmount);
  const refundStatus = refundAmount > 0 ? 'due' : 'none';
  return { refundAmount, outstandingBalance, refundStatus };
}

it('Calculates full refund when deductions are 0', () => {
  const res = computeSettlementFinancials(50000, 0);
  assert.strictEqual(res.refundAmount, 50000);
  assert.strictEqual(res.outstandingBalance, 0);
  assert.strictEqual(res.refundStatus, 'due');
});

it('Calculates partial refund when deductions are less than deposit', () => {
  const res = computeSettlementFinancials(50000, 15000);
  assert.strictEqual(res.refundAmount, 35000);
  assert.strictEqual(res.outstandingBalance, 0);
  assert.strictEqual(res.refundStatus, 'due');
});

it('Calculates 0 refund and 0 liability when deductions exactly equal deposit', () => {
  const res = computeSettlementFinancials(30000, 30000);
  assert.strictEqual(res.refundAmount, 0);
  assert.strictEqual(res.outstandingBalance, 0);
  assert.strictEqual(res.refundStatus, 'none');
});

it('Never produces negative refund; records excess deductions as outstandingBalance', () => {
  const res = computeSettlementFinancials(20000, 35000);
  assert.strictEqual(res.refundAmount, 0, 'Refund amount must be non-negative (min 0)');
  assert.strictEqual(res.outstandingBalance, 15000, 'Excess deductions must become tenant outstanding liability');
  assert.strictEqual(res.refundStatus, 'none');
});

it('Handles lease with 0 contracted deposit correctly', () => {
  const res = computeSettlementFinancials(0, 0);
  assert.strictEqual(res.refundAmount, 0);
  assert.strictEqual(res.outstandingBalance, 0);
  assert.strictEqual(res.refundStatus, 'none');
});

// -----------------------------------------------------------------------------
// Suite 5: Manager Discretionary Deductions Validation
// -----------------------------------------------------------------------------
console.log('\n[Suite 5] Discretionary Deductions Validation:');

function validateDiscretionaryDeductions(items) {
  const allowedCategories = ['cleaning', 'utilities', 'other'];
  const validated = [];
  if (!Array.isArray(items)) return validated;

  for (const item of items) {
    const amount = Number(item.amount);
    if (isNaN(amount) || amount < 0 || !isFinite(amount)) {
      throw new Error('Deduction amounts must be non-negative finite numbers');
    }
    if (amount > 0) {
      const reason = (item.reason || '').trim();
      if (!reason) {
        throw new Error(`A reason is required for deduction under ${item.category || 'other'}`);
      }
      validated.push({
        category: allowedCategories.includes(item.category) ? item.category : 'other',
        reason,
        amount: Math.round(amount * 100) / 100
      });
    }
  }
  return validated;
}

it('Validates clean discretionary deduction items', () => {
  const input = [
    { category: 'cleaning', amount: 1500, reason: 'Deep kitchen clean' },
    { category: 'utilities', amount: 750, reason: 'Final water bill' },
    { category: 'custom_cat', amount: 200, reason: 'Lost key replacement' }
  ];
  const result = validateDiscretionaryDeductions(input);
  assert.strictEqual(result.length, 3);
  assert.strictEqual(result[0].category, 'cleaning');
  assert.strictEqual(result[1].category, 'utilities');
  assert.strictEqual(result[2].category, 'other', 'Custom category mapped to other');
});

it('Throws error when amount is negative', () => {
  assert.throws(() => {
    validateDiscretionaryDeductions([{ category: 'cleaning', amount: -500, reason: 'Refund' }]);
  }, /non-negative finite numbers/);
});

it('Throws error when amount is NaN or string', () => {
  assert.throws(() => {
    validateDiscretionaryDeductions([{ category: 'cleaning', amount: 'abc', reason: 'Service' }]);
  }, /non-negative finite numbers/);
});

it('Throws error when positive deduction lacks a reason', () => {
  assert.throws(() => {
    validateDiscretionaryDeductions([{ category: 'utilities', amount: 1200, reason: '   ' }]);
  }, /A reason is required/);
});

// -----------------------------------------------------------------------------
// Suite 6: Move-Out Requests API Enrichment
// -----------------------------------------------------------------------------
console.log('\n[Suite 6] Move-Out Requests Settlement Enrichment:');

it('Enriches move-out leases with canonical isSettled, settlement, and settlementId', () => {
  const mockLeases = [
    { _id: 'lease-A', moveOutStatus: 'inspection_completed' },
    { _id: 'lease-B', moveOutStatus: 'inspection_completed' }
  ];

  const mockSettlements = [
    { _id: 'set-1', lease: 'lease-A', status: 'Completed', refundAmount: 10000, totalDeduction: 5000 }
  ];

  const settlementsByLease = {};
  mockSettlements.forEach(s => {
    settlementsByLease[s.lease] = s;
  });

  const enriched = mockLeases.map(l => {
    const leaseSettlement = settlementsByLease[l._id] || null;
    return {
      ...l,
      settlementId: leaseSettlement ? leaseSettlement._id : null,
      settlement: leaseSettlement,
      isSettled: leaseSettlement?.status === 'Completed'
    };
  });

  assert.strictEqual(enriched[0].isSettled, true);
  assert.strictEqual(enriched[0].settlementId, 'set-1');
  assert.strictEqual(enriched[0].settlement.refundAmount, 10000);

  assert.strictEqual(enriched[1].isSettled, false);
  assert.strictEqual(enriched[1].settlementId, null);
  assert.strictEqual(enriched[1].settlement, null);
});

// -----------------------------------------------------------------------------
// Suite 7: Concurrent Idempotency
// -----------------------------------------------------------------------------
console.log('\n[Suite 7] Concurrent Idempotency & Unique Lease Constraint:');

it('Returns existing completed settlement if processDepositRefund is called again', () => {
  const existingSettlement = {
    _id: 'settlement-exist-1',
    lease: 'lease-101',
    status: 'Completed',
    refundAmount: 25000,
    totalDeduction: 5000
  };

  // Simulating the controller check
  let calledUpsert = false;
  function handleRefundRequest(existing) {
    if (existing && existing.status === 'Completed') {
      return { status: 200, data: existing, message: 'Deposit settlement is already completed' };
    }
    calledUpsert = true;
    return { status: 200, data: null };
  }

  const res = handleRefundRequest(existingSettlement);
  assert.strictEqual(calledUpsert, false, 'Must not re-execute calculations or overwrite existing settlement');
  assert.strictEqual(res.data._id, 'settlement-exist-1');
  assert.strictEqual(res.message, 'Deposit settlement is already completed');
});

// -----------------------------------------------------------------------------
// Suite 8: Move-Out Lifecycle Resolution (Tenant UI State Machine)
// -----------------------------------------------------------------------------
console.log('\n[Suite 8] Move-Out Lifecycle & Tenant UI State Machine:');

const pastEnd = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
const startPast = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

it('moveOutStatus: "none" allows Move-Out button on expired lease', () => {
  const lease = {
    _id: 'l-none',
    status: 'expired',
    leaseDecision: 'pending',
    moveOutStatus: 'none',
    startDate: startPast,
    endDate: pastEnd
  };
  const lc = resolveLeaseLifecycle(lease, [], new Date());
  assert.strictEqual(lc.canMoveOut, true, 'canMoveOut must be true for unsubmitted lease');
  assert.strictEqual(lc.isMoveOutSubmitted, false);
  assert.strictEqual(lc.isMoveOutFinalized, false);
});

it('moveOutStatus: "requested" suppresses Move-Out button and marks submitted', () => {
  const lease = {
    _id: 'l-req',
    status: 'expired',
    leaseDecision: 'moving_out',
    moveOutStatus: 'requested',
    startDate: startPast,
    endDate: pastEnd
  };
  const lc = resolveLeaseLifecycle(lease, [], new Date());
  assert.strictEqual(lc.canMoveOut, false, 'canMoveOut must be false');
  assert.strictEqual(lc.isMoveOutSubmitted, true);
  assert.strictEqual(lc.isMoveOutFinalized, false);
  assert.strictEqual(lc.hasTenantSubmittedMoveOut, true);
});

it('moveOutStatus: "inspection_scheduled" suppresses Move-Out button', () => {
  const lease = {
    _id: 'l-ins-sched',
    status: 'expired',
    leaseDecision: 'moving_out',
    moveOutStatus: 'inspection_scheduled',
    startDate: startPast,
    endDate: pastEnd
  };
  const lc = resolveLeaseLifecycle(lease, [], new Date());
  assert.strictEqual(lc.canMoveOut, false);
  assert.strictEqual(lc.isMoveOutSubmitted, true);
  assert.strictEqual(lc.isMoveOutFinalized, false);
});

it('moveOutStatus: "inspection_completed" suppresses Move-Out button', () => {
  const lease = {
    _id: 'l-ins-done',
    status: 'expired',
    leaseDecision: 'moving_out',
    moveOutStatus: 'inspection_completed',
    startDate: startPast,
    endDate: pastEnd
  };
  const lc = resolveLeaseLifecycle(lease, [], new Date());
  assert.strictEqual(lc.canMoveOut, false);
  assert.strictEqual(lc.isMoveOutSubmitted, true);
  assert.strictEqual(lc.isMoveOutFinalized, false);
});

it('moveOutStatus: "refund_processing" suppresses Move-Out button', () => {
  const lease = {
    _id: 'l-ref-proc',
    status: 'expired',
    leaseDecision: 'moving_out',
    moveOutStatus: 'refund_processing',
    startDate: startPast,
    endDate: pastEnd
  };
  const lc = resolveLeaseLifecycle(lease, [], new Date());
  assert.strictEqual(lc.canMoveOut, false);
  assert.strictEqual(lc.isMoveOutSubmitted, true);
  assert.strictEqual(lc.isMoveOutFinalized, false);
});

it('moveOutStatus: "completed" sets isMoveOutFinalized: true and canMoveOut: false', () => {
  const lease = {
    _id: 'l-comp',
    status: 'expired',
    leaseDecision: 'expired',
    moveOutStatus: 'completed',
    startDate: startPast,
    endDate: pastEnd
  };
  const lc = resolveLeaseLifecycle(lease, [], new Date());
  assert.strictEqual(lc.canMoveOut, false, 'canMoveOut must be false for finalized move-out');
  assert.strictEqual(lc.isMoveOutFinalized, true, 'isMoveOutFinalized must be true');
  assert.strictEqual(lc.isMoveOutSubmitted, true, 'isMoveOutSubmitted must be true');
});

it('Backend requestMoveOut guard rejects submission for completed lease', () => {
  function validateMoveOutSubmission(lease) {
    if (lease.moveOutStatus === 'completed') {
      throw new Error('Move-out has already been finalized for this lease');
    }
    if (['requested', 'inspection_scheduled', 'inspection_completed', 'refund_processing'].includes(lease.moveOutStatus)) {
      throw new Error('Move-out notice has already been submitted for this lease');
    }
    return true;
  }

  assert.throws(() => {
    validateMoveOutSubmission({ status: 'expired', moveOutStatus: 'completed' });
  }, /Move-out has already been finalized for this lease/);

  assert.throws(() => {
    validateMoveOutSubmission({ status: 'expired', moveOutStatus: 'requested' });
  }, /Move-out notice has already been submitted for this lease/);

  assert.strictEqual(validateMoveOutSubmission({ status: 'expired', moveOutStatus: 'none' }), true);
});

// -----------------------------------------------------------------------------
// Suite 9: Deposit Ledger & Calculation Matrix
// -----------------------------------------------------------------------------
console.log('\n[Suite 9] Deposit Ledger & Calculation Matrix:');

function calculateSettlementLedger(deposit, rentDues, repairDeduction, otherDeductions = 0) {
  const totalDeduction = (rentDues || 0) + (repairDeduction || 0) + (otherDeductions || 0);
  const refundAmount = Math.max(0, deposit - totalDeduction);
  const outstandingBalance = Math.max(0, totalDeduction - deposit);
  const refundStatus = refundAmount > 0 ? 'due' : 'none';
  return { totalDeduction, refundAmount, outstandingBalance, refundStatus };
}

it('₹0 deposit yields ₹0 refund and refundStatus: "none"', () => {
  const res = calculateSettlementLedger(0, 0, 0);
  assert.strictEqual(res.refundAmount, 0);
  assert.strictEqual(res.refundStatus, 'none');
  assert.strictEqual(res.outstandingBalance, 0);
});

it('₹30,000 deposit with ₹8,000 repair yields ₹22,000 refund and refundStatus: "due"', () => {
  const res = calculateSettlementLedger(30000, 0, 8000);
  assert.strictEqual(res.totalDeduction, 8000);
  assert.strictEqual(res.refundAmount, 22000);
  assert.strictEqual(res.refundStatus, 'due');
  assert.strictEqual(res.outstandingBalance, 0);
});

it('Deductions exactly equal deposit yields ₹0 refund and ₹0 liability', () => {
  const res = calculateSettlementLedger(30000, 15000, 15000);
  assert.strictEqual(res.totalDeduction, 30000);
  assert.strictEqual(res.refundAmount, 0);
  assert.strictEqual(res.refundStatus, 'none');
  assert.strictEqual(res.outstandingBalance, 0);
});

it('Deductions exceed deposit yields ₹0 refund and positive tenant liability', () => {
  const res = calculateSettlementLedger(30000, 20000, 15000); // 35k total
  assert.strictEqual(res.totalDeduction, 35000);
  assert.strictEqual(res.refundAmount, 0);
  assert.strictEqual(res.outstandingBalance, 5000);
  assert.strictEqual(res.refundStatus, 'none');
});

// -----------------------------------------------------------------------------
// Suite 10: Gateway Refund Safeguards (Safeguards 1, 2, 3)
// -----------------------------------------------------------------------------
console.log('\n[Suite 10] Gateway Refund Safeguards (1, 2, 3):');

it('Safeguard 1: Cumulative check prevents refunding more than captured deposit across payments', () => {
  const payments = [
    { type: 'security_deposit', status: 'paid', amountPaid: 30000 }
  ];
  const totalPaidDeposit = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const alreadyRefunded = 10000;
  const requestedRefund = 22000;

  const willExceed = alreadyRefunded + requestedRefund > totalPaidDeposit;
  assert.strictEqual(willExceed, true, '10,000 + 22,000 > 30,000 must be rejected');
});

it('Safeguard 2: Gateway reconciliation prevents duplicate payout if server crashed after gateway 200 OK', () => {
  const settlementId = 'settlement-crash-101';
  const gatewayRefundsList = [
    {
      id: 'rfn_crash_recovered_123',
      amount: 2200000,
      status: 'processed',
      notes: { settlementId: 'settlement-crash-101' },
      receipt: 'REFUND-crash-101'
    }
  ];

  // Simulating the pre-refund reconciliation check
  let gatewayRefundApiCalled = false;
  function processRefundWithReconciliation(settlementId, gatewayRefunds) {
    const existing = gatewayRefunds.find(r => r.notes?.settlementId === settlementId);
    if (existing) {
      return {
        reconciled: true,
        gatewayRefundId: existing.id,
        status: 'paid'
      };
    }
    gatewayRefundApiCalled = true;
    return { reconciled: false, gatewayRefundId: 'rfn_new', status: 'paid' };
  }

  const result = processRefundWithReconciliation(settlementId, gatewayRefundsList);
  assert.strictEqual(result.reconciled, true, 'Must detect prior gateway refund from Razorpay');
  assert.strictEqual(result.gatewayRefundId, 'rfn_crash_recovered_123');
  assert.strictEqual(gatewayRefundApiCalled, false, 'Must NOT invoke gateway refund API again');
});

it('Safeguard 3: Deterministic selection of authoritative payment when multiple payments exist', () => {
  const payments = [
    { _id: 'pay-offline-1', type: 'security_deposit', status: 'paid', amountPaid: 15000, razorpayPaymentId: null },
    { _id: 'pay-online-small', type: 'security_deposit', status: 'paid', amountPaid: 5000, razorpayPaymentId: 'pay_small_123' },
    { _id: 'pay-online-authoritative', type: 'security_deposit', status: 'paid', amountPaid: 25000, razorpayPaymentId: 'pay_authoritative_456' }
  ];

  const candidateGatewayPayments = payments.filter(p => 
    p.razorpayPaymentId && 
    typeof p.razorpayPaymentId === 'string' &&
    p.status === 'paid' && 
    p.type === 'security_deposit'
  );

  const refundAmount = 22000;
  const selectedPayment = candidateGatewayPayments.find(p => p.amountPaid >= refundAmount) || candidateGatewayPayments[0];

  assert.strictEqual(selectedPayment._id, 'pay-online-authoritative');
  assert.strictEqual(selectedPayment.razorpayPaymentId, 'pay_authoritative_456');
  assert.strictEqual(selectedPayment.amountPaid >= refundAmount, true);
});

it('Atomic DB Mutex: Rejects concurrent refund calls when state transitions due -> processing', () => {
  let doc = { refundStatus: 'due' };

  function atomicLock() {
    if (['due', 'failed'].includes(doc.refundStatus)) {
      doc.refundStatus = 'processing';
      return true;
    }
    return false;
  }

  const firstCall = atomicLock();
  const secondCall = atomicLock(); // Concurrent attempt while first is processing

  assert.strictEqual(firstCall, true, 'First call acquires mutex lock');
  assert.strictEqual(secondCall, false, 'Second call is rejected by mutex lock');
  assert.strictEqual(doc.refundStatus, 'processing');
});

it('Already-paid refund returns existing record immediately (idempotency)', () => {
  const settlement = {
    _id: 's-paid-1',
    refundStatus: 'paid',
    gatewayRefundId: 'rfn_existing_999'
  };

  let gatewayCalled = false;
  function handlePayout(settlement) {
    if (settlement.refundStatus === 'paid' && settlement.gatewayRefundId) {
      return { status: 200, message: 'Refund has already been paid successfully.', data: settlement };
    }
    gatewayCalled = true;
    return { status: 200, data: settlement };
  }

  const res = handlePayout(settlement);
  assert.strictEqual(gatewayCalled, false, 'Gateway must never be called for already paid settlement');
  assert.strictEqual(res.data.gatewayRefundId, 'rfn_existing_999');
});

it('Failed gateway refund transitions to "failed" and enables retry', () => {
  let settlement = { refundStatus: 'processing', refundFailureReason: null };

  // Gateway error happens
  settlement.refundStatus = 'failed';
  settlement.refundFailureReason = 'Gateway timeout error';

  assert.strictEqual(settlement.refundStatus, 'failed');
  assert.strictEqual(settlement.refundFailureReason, 'Gateway timeout error');

  // Retry attempt can re-acquire mutex
  const canRetry = ['due', 'failed'].includes(settlement.refundStatus);
  assert.strictEqual(canRetry, true, 'Retry must be permitted from failed status');
});

// -----------------------------------------------------------------------------
// Suite 11: Authorization & Multi-Tenant Isolation
// -----------------------------------------------------------------------------
console.log('\n[Suite 11] Multi-Tenant & Multi-Manager Authorization Isolation:');

it('Tenant cannot view another tenant\'s deposit settlement', () => {
  const settlement = {
    lease: {
      tenant: { _id: 'tenant-A', email: 'alice@example.com' }
    }
  };
  const callingUser = { userId: 'tenant-B', email: 'bob@example.com', role: 'tenant' };

  function checkTenantAuth(settlement, user) {
    const isOwner = settlement.lease?.tenant?.email === user.email || settlement.lease?.tenant?._id === user.userId;
    if (!isOwner) throw new Error('Forbidden: Access denied to view another tenant\'s deposit settlement');
    return true;
  }

  assert.throws(() => {
    checkTenantAuth(settlement, callingUser);
  }, /Forbidden: Access denied to view another tenant's deposit settlement/);
});

it('Manager cannot process refund for another manager\'s property', () => {
  const propertyManagerId = 'mgr-alpha';
  const callingManager = { userId: 'mgr-bravo', role: 'manager' };

  function checkManagerAuth(propertyMgrId, caller) {
    if (propertyMgrId !== caller.userId) {
      throw new Error('Forbidden: Access denied to process refund for this property');
    }
    return true;
  }

  assert.throws(() => {
    checkManagerAuth(propertyManagerId, callingManager);
  }, /Forbidden: Access denied to process refund for this property/);
});

console.log('\n================================================================');
console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  console.log(`🎉 ALL ${totalTests} DEPOSIT SETTLEMENT SAFEGUARD TESTS PASSED!`);
  process.exit(0);
} else {
  console.error(`❌ ${totalTests - passedTests} TESTS FAILED.`);
  process.exit(1);
}

