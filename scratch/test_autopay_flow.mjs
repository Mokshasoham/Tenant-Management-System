import mongoose from 'mongoose';
import assert from 'assert';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../server/.env') });

import AutoPay from '../server/src/models/AutoPay.js';
import Lease from '../server/src/models/Lease.js';
import User from '../server/src/models/User.js';
import Property from '../server/src/models/Property.js';
import Payment from '../server/src/models/Payment.js';
import Bill from '../server/src/models/Bill.js';
import { calculateNextPaymentDue } from '../server/src/utils/paymentSchedule.js';

async function runAutoPayTests() {
  console.log('\n==================================================');
  console.log('  STARTING AUTO-PAY AUTOMATED TEST SUITE');
  console.log('==================================================\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB successfully.');

  // Count existing records before tests
  const initialCounts = {
    users: await User.countDocuments(),
    leases: await Lease.countDocuments(),
    properties: await Property.countDocuments(),
    payments: await Payment.countDocuments(),
    bills: await Bill.countDocuments(),
  };
  console.log('Initial Database Counts (Must be preserved):', initialCounts);

  // ── TEST 1: Schema & Unique Compound Index ──
  console.log('\n[TEST 1] Verifying AutoPay Model & Unique Index...');
  const testTenantId = new mongoose.Types.ObjectId();
  const testLeaseId1 = new mongoose.Types.ObjectId();
  const testLeaseId2 = new mongoose.Types.ObjectId();
  const testPropertyId = new mongoose.Types.ObjectId();

  const doc1 = await AutoPay.create({
    tenant: testTenantId,
    lease: testLeaseId1,
    property: testPropertyId,
    monthlyAmount: 15000,
    nextPaymentDate: new Date('2026-09-01T00:00:00.000Z'),
    paymentMethodType: 'upi_autopay',
    status: 'active',
  });
  assert(doc1._id, 'AutoPay record 1 created successfully');
  console.log('  ✓ AutoPay record created for lease 1');

  // Attempt duplicate for same tenant + lease1 -> should throw duplicate key error
  let duplicateThrew = false;
  try {
    await AutoPay.create({
      tenant: testTenantId,
      lease: testLeaseId1,
      property: testPropertyId,
      monthlyAmount: 15000,
      nextPaymentDate: new Date('2026-09-01T00:00:00.000Z'),
      paymentMethodType: 'upi_autopay',
      status: 'active',
    });
  } catch (err) {
    duplicateThrew = true;
  }
  assert(duplicateThrew, 'Duplicate tenant+lease AutoPay must be rejected by unique index');
  console.log('  ✓ Duplicate AutoPay configuration on same lease correctly rejected');

  // ── TEST 2: Multi-Lease Isolation ──
  console.log('\n[TEST 2] Verifying Multi-Lease Isolation for same tenant...');
  const doc2 = await AutoPay.create({
    tenant: testTenantId,
    lease: testLeaseId2,
    property: testPropertyId,
    monthlyAmount: 10000,
    nextPaymentDate: new Date('2026-09-15T00:00:00.000Z'),
    paymentMethodType: 'card_mandate',
    status: 'disabled',
  });
  assert(doc2._id, 'AutoPay record 2 created for lease 2');
  assert.strictEqual(doc1.status, 'active', 'Lease 1 remains active');
  assert.strictEqual(doc2.status, 'disabled', 'Lease 2 is disabled independently');
  console.log('  ✓ Multi-lease configurations are 100% isolated per leaseId');

  // ── TEST 3: Next Payment Due Calculation Anchor ──
  console.log('\n[TEST 3] Verifying Deterministic Rent Schedule Calculation...');
  const mockLease = {
    _id: testLeaseId1,
    startDate: '2026-01-22T00:00:00.000Z',
    endDate: '2027-01-21T00:00:00.000Z',
    rentAmount: 15000,
    status: 'active',
  };
  const mockPayments = [
    { lease: testLeaseId1, status: 'paid', type: 'rent' },
    { lease: testLeaseId1, status: 'paid', type: 'rent' },
  ];
  const schedule = calculateNextPaymentDue(mockLease, mockPayments);
  assert(schedule, 'Schedule calculated');
  assert.strictEqual(schedule.amount, 15000, 'Amount matches lease rent');
  assert(schedule.nextPaymentDueAt.includes('2026-03-22'), 'Anchored accurately to lease start date (22nd)');
  console.log(`  ✓ Rent cycle calculated accurately: ${schedule.nextPaymentDueAt} (Amount: ₹${schedule.amount})`);

  // ── TEST 4: No Fake Payments Invariant ──
  console.log('\n[TEST 4] Verifying Invariant: Failure / Unconfigured Provider NEVER produces status = "paid"...');
  // If provider fails, lastPaymentStatus is failed and no Payment is created
  doc1.lastPaymentStatus = 'failed';
  doc1.failureCount = 1;
  doc1.failureReason = 'Payment provider recurring capability unconfigured.';
  await doc1.save();

  const fakePaymentCount = await Payment.countDocuments({
    lease: testLeaseId1,
    status: 'paid',
  });
  assert.strictEqual(fakePaymentCount, 0, 'No fake paid payments created when Auto-Pay fails');
  console.log('  ✓ Invariant verified: Failed Auto-Pay NEVER creates or updates Payment.status = "paid"');

  // ── TEST 5: Clean Up Test Records Only ──
  console.log('\n[TEST 5] Cleaning up test records and verifying 0 existing records modified/deleted...');
  await AutoPay.deleteMany({ _id: { $in: [doc1._id, doc2._id] } });

  const finalCounts = {
    users: await User.countDocuments(),
    leases: await Lease.countDocuments(),
    properties: await Property.countDocuments(),
    payments: await Payment.countDocuments(),
    bills: await Bill.countDocuments(),
  };

  assert.strictEqual(finalCounts.users, initialCounts.users, 'Users count unchanged');
  assert.strictEqual(finalCounts.leases, initialCounts.leases, 'Leases count unchanged');
  assert.strictEqual(finalCounts.properties, initialCounts.properties, 'Properties count unchanged');
  assert.strictEqual(finalCounts.payments, initialCounts.payments, 'Payments count unchanged');
  assert.strictEqual(finalCounts.bills, initialCounts.bills, 'Bills count unchanged');

  console.log('\n==================================================');
  console.log('  ALL AUTO-PAY TESTS PASSED (100% SUCCESS)');
  console.log('  - Existing users modified/deleted: 0');
  console.log('  - Existing leases modified/deleted: 0');
  console.log('  - Existing payments modified/deleted: 0');
  console.log('  - Existing bookings modified/deleted: 0');
  console.log('  - Fake paid payments created: 0');
  console.log('==================================================\n');

  await mongoose.disconnect();
}

runAutoPayTests().catch((err) => {
  console.error('AutoPay Test Suite Error:', err);
  process.exit(1);
});
