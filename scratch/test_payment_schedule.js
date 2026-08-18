import { getLeaseCycleDate, calculateNextPaymentDue } from '../server/src/utils/paymentSchedule.js';

function runTests() {
  console.log('====================================================');
  console.log('RUNNING COMPREHENSIVE PAYMENT SCHEDULE UNIT TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Month-End Clamping Test (July 31 -> Aug 31 -> Sep 30 -> Oct 31 -> Nov 30 -> Dec 31 -> Jan 31 -> Feb 28)
  const startJul31 = '2026-07-31T00:00:00.000Z';
  const c0 = getLeaseCycleDate(startJul31, 0).toISOString().slice(0, 10);
  const c1 = getLeaseCycleDate(startJul31, 1).toISOString().slice(0, 10);
  const c2 = getLeaseCycleDate(startJul31, 2).toISOString().slice(0, 10);
  const c3 = getLeaseCycleDate(startJul31, 3).toISOString().slice(0, 10);
  const c4 = getLeaseCycleDate(startJul31, 4).toISOString().slice(0, 10);
  const c5 = getLeaseCycleDate(startJul31, 5).toISOString().slice(0, 10);
  const c6 = getLeaseCycleDate(startJul31, 6).toISOString().slice(0, 10);
  const c7 = getLeaseCycleDate(startJul31, 7).toISOString().slice(0, 10);

  assert(c0 === '2026-07-31', 'Cycle 0 for Jul 31 is 2026-07-31');
  assert(c1 === '2026-08-31', 'Cycle 1 for Jul 31 is 2026-08-31');
  assert(c2 === '2026-09-30', 'Cycle 2 for Jul 31 clamps to 2026-09-30 (Sep has 30 days)');
  assert(c3 === '2026-10-31', 'Cycle 3 for Jul 31 is 2026-10-31');
  assert(c4 === '2026-11-30', 'Cycle 4 for Jul 31 clamps to 2026-11-30 (Nov has 30 days)');
  assert(c5 === '2026-12-31', 'Cycle 5 for Jul 31 is 2026-12-31');
  assert(c6 === '2027-01-31', 'Cycle 6 for Jul 31 is 2027-01-31');
  assert(c7 === '2027-02-28', 'Cycle 7 for Jul 31 clamps to 2027-02-28 (Feb has 28 days)');

  // 2. Standard 13th of Month Cycle Test
  const startAug13 = '2026-08-13T00:00:00.000Z';
  const a0 = getLeaseCycleDate(startAug13, 0).toISOString().slice(0, 10);
  const a1 = getLeaseCycleDate(startAug13, 1).toISOString().slice(0, 10);
  const a2 = getLeaseCycleDate(startAug13, 2).toISOString().slice(0, 10);
  assert(a0 === '2026-08-13', 'Cycle 0 for Aug 13 is 2026-08-13');
  assert(a1 === '2026-09-13', 'Cycle 1 for Aug 13 is 2026-09-13');
  assert(a2 === '2026-10-13', 'Cycle 2 for Aug 13 is 2026-10-13');

  // 3. User Lease in Screenshot: Lease Start Jul 31, 2026, rent ₹10,000, today in Aug
  const userLease = {
    _id: 'lease-1785222102277-5043',
    startDate: '2026-07-31T00:00:00.000Z',
    endDate: '2026-09-30T00:00:00.000Z',
    rentAmount: 10000,
    status: 'active'
  };

  const schedule1 = calculateNextPaymentDue(userLease, []);
  assert(schedule1.nextPaymentDueAt === '2026-08-31T00:00:00.000Z', 'User active lease next payment due is 2026-08-31T00:00:00.000Z (NOT today + 30 days)');
  assert(schedule1.amount === 10000, 'Rent amount is ₹10,000');
  assert(schedule1.isEstimate === true, 'No explicit DB bill -> isEstimate is true');

  // 4. Test after 1 paid payment:
  const paidPayments = [
    {
      _id: 'pay-1',
      lease: 'lease-1785222102277-5043',
      type: 'rent',
      status: 'paid',
      amount: 10000,
      paymentDate: '2026-07-31T00:00:00.000Z'
    }
  ];

  const scheduleAfterPaid = calculateNextPaymentDue(userLease, paidPayments);
  assert(scheduleAfterPaid.nextPaymentDueAt === '2026-08-31T00:00:00.000Z', 'After move-in rent paid, next due date is 2026-08-31T00:00:00.000Z');

  // 5. Test after 2 paid payments:
  const twoPaidPayments = [
    ...paidPayments,
    {
      _id: 'pay-2',
      lease: 'lease-1785222102277-5043',
      type: 'rent',
      status: 'paid',
      amount: 10000,
      paymentDate: '2026-08-31T00:00:00.000Z'
    }
  ];

  const scheduleAfterTwoPaid = calculateNextPaymentDue(userLease, twoPaidPayments);
  assert(scheduleAfterTwoPaid.nextPaymentDueAt === '2026-09-30T00:00:00.000Z', 'After 2nd month paid, next due date is 2026-09-30T00:00:00.000Z');

  // 6. Test with explicit Pending / Generated Bill in DB (CONFIRMED state)
  const pendingBillPayments = [
    {
      _id: 'pay-db-pending',
      lease: 'lease-1785222102277-5043',
      type: 'rent',
      status: 'pending',
      amount: 10000,
      amountDue: 10000,
      amountPaid: 0,
      dueDate: '2026-08-31T00:00:00.000Z'
    }
  ];

  const scheduleConfirmed = calculateNextPaymentDue(userLease, pendingBillPayments);
  assert(scheduleConfirmed.nextPaymentDueAt === '2026-08-31T00:00:00.000Z', 'Pending bill dueDate is respected');
  assert(scheduleConfirmed.isEstimate === false, 'Pending bill makes schedule CONFIRMED');
  assert(scheduleConfirmed.isConfirmed === true, 'isConfirmed is true');

  // 7. Missing lease / null safety test
  const nullSchedule = calculateNextPaymentDue(null, []);
  assert(nullSchedule === null, 'calculateNextPaymentDue(null) returns null safely');

  console.log(`\n====================================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================`);

  if (failed > 0) process.exit(1);
}

runTests();
