import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import Tenant from '../src/models/Tenant.js';
import Property from '../src/models/Property.js';
import Lease from '../src/models/Lease.js';
import Booking from '../src/models/Booking.js';
import Subscription from '../src/models/Subscription.js';
import {
  getTenantCommittedCapacity,
  getTenantActiveLeaseCount,
  getUserSubscription,
  assertAndReserveCapacity,
  withTenantCapacityLock,
  assertLockOwnership,
} from '../src/services/subscriptionService.js';
import { createLease } from '../src/controllers/leaseController.js';
import {
  approveBooking,
  createRazorpayOrder,
  verifyAndProcessPaymentInternal,
  processMockPayment,
} from '../src/controllers/bookingController.js';
import { isLeaseAuthoritativelyActive } from '../src/utils/leaseLifecycle.js';

async function runSubscriptionCapacitySuite() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas for 16-Point Subscription Lease-Capacity Suite\n');

  const results = [];
  function record(id, title, passed, detail) {
    const status = passed ? 'PASS' : 'FAIL';
    results.push({ id, title, status, detail });
    console.log(`[${status}] Test ${id}: ${title} - ${detail}`);
  }

  const createdCleanupIds = {
    users: [],
    tenants: [],
    properties: [],
    leases: [],
    bookings: [],
    subscriptions: [],
  };

  try {
    const timestamp = Date.now();

    // Manager and Property for lease creation tests
    const manager = await User.create({
      firstName: 'TestManager',
      lastName: `M_${timestamp}`,
      email: `test_mgr_${timestamp}@testdomain.com`,
      password: 'Password123!',
      role: 'manager',
    });
    createdCleanupIds.users.push(manager._id);

    // Setup helper to create test users
    async function createTestTenant(tag, planId = 'free') {
      const user = await User.create({
        firstName: `TestTenant`,
        lastName: tag,
        email: `test_tenant_${tag}_${timestamp}@testdomain.com`,
        password: 'Password123!',
        role: 'tenant',
      });
      createdCleanupIds.users.push(user._id);

      const sub = await Subscription.create({
        user: user._id,
        role: 'tenant',
        planId,
        planName: planId === 'plus' ? 'Resident Plus' : 'Resident Free',
        status: 'active',
        maxLeases: planId === 'plus' ? 4 : 2,
        price: planId === 'plus' ? 499 : 0,
      });
      createdCleanupIds.subscriptions.push(sub._id);

      const tenant = await Tenant.create({
        user: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: '9999999999',
        address: '123 Test Street',
        managedBy: manager._id,
        status: 'active',
      });
      createdCleanupIds.tenants.push(tenant._id);

      return { user, sub, tenant };
    }

    const property = await Property.create({
      name: `Test Property ${timestamp}`,
      address: '100 Test St',
      city: 'Testville',
      state: 'TS',
      zipCode: '12345',
      type: 'apartment',
      rentAmount: 15000,
      depositAmount: 30000,
      manager: manager._id,
      owner: manager._id,
      status: 'available',
      publishStatus: 'published',
    });
    createdCleanupIds.properties.push(property._id);

    const property2 = await Property.create({
      name: `Test Property 2 ${timestamp}`,
      address: '102 Test St',
      city: 'Testville',
      state: 'TS',
      zipCode: '12345',
      type: 'apartment',
      rentAmount: 18000,
      depositAmount: 36000,
      manager: manager._id,
      owner: manager._id,
      status: 'available',
      publishStatus: 'published',
    });
    createdCleanupIds.properties.push(property2._id);

    const property3 = await Property.create({
      name: `Test Property 3 ${timestamp}`,
      address: '103 Test St',
      city: 'Testville',
      state: 'TS',
      zipCode: '12345',
      type: 'apartment',
      rentAmount: 20000,
      depositAmount: 40000,
      manager: manager._id,
      owner: manager._id,
      status: 'available',
      publishStatus: 'published',
    });
    createdCleanupIds.properties.push(property3._id);

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Expired lease release without waiting for cron
    // ─────────────────────────────────────────────────────────────
    const t1 = await createTestTenant('t1', 'free');
    const pastLease1 = await Lease.create({
      property: property._id,
      tenant: t1.tenant._id,
      tenantEmail: t1.user.email,
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Expired 30 days ago
      rentAmount: 15000,
      status: 'active', // Status string is still 'active' because cron hasn't run!
      createdBy: manager._id,
    });
    createdCleanupIds.leases.push(pastLease1._id);

    const capT1 = await getTenantCommittedCapacity(t1.user._id);
    const passed1 = capT1.totalCommitted === 0 && capT1.activeLeaseCount === 0;
    record(1, 'Expired lease immediate capacity release', passed1, `Committed count: ${capT1.totalCommitted} (Expected 0)`);

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Finalized move-out release
    // ─────────────────────────────────────────────────────────────
    const t2 = await createTestTenant('t2', 'free');
    const moveOutLease = await Lease.create({
      property: property._id,
      tenant: t2.tenant._id,
      tenantEmail: t2.user.email,
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      rentAmount: 15000,
      status: 'active',
      moveOutStatus: 'completed', // Tenant vacated and finalized
      createdBy: manager._id,
    });
    createdCleanupIds.leases.push(moveOutLease._id);

    const capT2 = await getTenantCommittedCapacity(t2.user._id);
    const passed2 = capT2.totalCommitted === 0 && capT2.activeLeaseCount === 0;
    record(2, 'Finalized move-out immediate capacity release', passed2, `Committed count: ${capT2.totalCommitted} (Expected 0)`);

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Manager direct createLease at capacity blocked with 403
    // ─────────────────────────────────────────────────────────────
    const t3 = await createTestTenant('t3', 'free'); // Max limit = 2
    // Give t3 2 currently active leases
    const activeLeaseA = await Lease.create({
      property: property._id,
      tenant: t3.tenant._id,
      tenantEmail: t3.user.email,
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
      rentAmount: 15000,
      status: 'active',
      createdBy: manager._id,
    });
    createdCleanupIds.leases.push(activeLeaseA._id);

    const activeLeaseB = await Lease.create({
      property: property2._id,
      tenant: t3.tenant._id,
      tenantEmail: t3.user.email,
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      rentAmount: 18000,
      status: 'active',
      createdBy: manager._id,
    });
    createdCleanupIds.leases.push(activeLeaseB._id);

    // Try manager createLease for 3rd property
    let managerCreateError = null;
    const mockRes3 = {
      status: (code) => mockRes3,
      json: (data) => data,
    };
    try {
      await createLease(
        {
          user: { userId: manager._id.toString(), role: 'manager' },
          body: {
            propertyId: property3._id.toString(),
            tenantId: t3.tenant._id.toString(),
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            rentAmount: 20000,
            depositAmount: 40000,
          },
        },
        mockRes3
      );
    } catch (err) {
      managerCreateError = err;
    }

    const passed3 =
      managerCreateError &&
      managerCreateError.statusCode === 403 &&
      managerCreateError.message.includes('SUBSCRIPTION_LIMIT_REACHED');
    record(3, 'Manager direct createLease at capacity blocked with 403', passed3, `Caught: ${managerCreateError?.message}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Direct mock payment at capacity blocked with 403
    // ─────────────────────────────────────────────────────────────
    let mockPayError = null;
    try {
      await processMockPayment(
        {
          user: { userId: t3.user._id.toString(), role: 'tenant' },
          body: {
            propertyId: property3._id.toString(),
            amount: 20000,
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
        mockRes3,
        (err) => {
          if (err) throw err;
        }
      );
    } catch (err) {
      mockPayError = err;
    }

    const passed4 =
      mockPayError &&
      mockPayError.statusCode === 403 &&
      mockPayError.message.includes('SUBSCRIPTION_LIMIT_REACHED');
    record(4, 'Direct mock payment at capacity blocked with 403', passed4, `Caught: ${mockPayError?.message}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Razorpay checkout order respects booking reservation & blocks if capacity exceeded
    // ─────────────────────────────────────────────────────────────
    const t5 = await createTestTenant('t5', 'free'); // 2 slots
    // 1 active lease (1 slot used)
    const activeLeaseT5 = await Lease.create({
      property: property._id,
      tenant: t5.tenant._id,
      tenantEmail: t5.user.email,
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
      rentAmount: 15000,
      status: 'active',
      createdBy: manager._id,
    });
    createdCleanupIds.leases.push(activeLeaseT5._id);

    // 1 approved booking (occupying 2nd slot)
    const bookingT5 = await Booking.create({
      user: t5.user._id,
      property: property2._id,
      manager: manager._id,
      startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: 'approved',
      paymentStatus: 'pending',
      approvalDate: new Date(),
      totalAmount: 18000,
    });
    createdCleanupIds.bookings.push(bookingT5._id);

    // Call createRazorpayOrder for this booking — should SUCCEED because booking is excluded from its own check!
    let rzpOrderRes = null;
    let rzpOrderErr = null;
    try {
      await createRazorpayOrder(
        {
          user: { userId: t5.user._id.toString(), role: 'tenant' },
          body: { bookingId: bookingT5._id.toString() },
        },
        {
          status: (code) => ({
            json: (data) => {
              rzpOrderRes = data;
            },
          }),
        }
      );
    } catch (err) {
      rzpOrderErr = err;
    }

    const updatedBookingT5 = await Booking.findById(bookingT5._id);
    const passed5 =
      !rzpOrderErr &&
      rzpOrderRes?.success === true &&
      updatedBookingT5.checkoutExpiresAt &&
      new Date(updatedBookingT5.checkoutExpiresAt) > new Date();
    record(5, 'Razorpay checkout respects reservation and sets checkoutExpiresAt', passed5, `Success: ${rzpOrderRes?.success}, checkoutExpiresAt: ${updatedBookingT5?.checkoutExpiresAt}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Payment callback idempotency
    // ─────────────────────────────────────────────────────────────
    const t6 = await createTestTenant('t6', 'free');
    const bookingT6 = await Booking.create({
      user: t6.user._id,
      property: property._id,
      manager: manager._id,
      startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: 'approved',
      paymentStatus: 'pending',
      approvalDate: new Date(),
      totalAmount: 15000,
    });
    createdCleanupIds.bookings.push(bookingT6._id);

    const paidResult1 = await verifyAndProcessPaymentInternal({
      bookingId: bookingT6._id,
      razorpayPaymentId: `mock_t6_pay_${timestamp}`,
      razorpayOrderId: `order_test_${timestamp}`,
      razorpaySignature: 'mock_signature_data',
    });
    if (paidResult1?.lease) createdCleanupIds.leases.push(paidResult1.lease);

    // Call second time with duplicate payload
    const paidResult2 = await verifyAndProcessPaymentInternal({
      bookingId: bookingT6._id,
      razorpayPaymentId: `mock_t6_pay_${timestamp}`,
      razorpayOrderId: `order_test_${timestamp}`,
      razorpaySignature: 'mock_signature_data',
    });

    const capT6 = await getTenantCommittedCapacity(t6.user._id);
    const passed6 =
      paidResult1.lease?.toString() === paidResult2.lease?.toString() &&
      capT6.totalCommitted === 1;
    record(6, 'Payment callback idempotency preserves single lease and capacity = 1', passed6, `LeaseId: ${paidResult1?.lease}, Cap: ${capT6.totalCommitted}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Concurrent approval mutual exclusion
    // ─────────────────────────────────────────────────────────────
    const t7 = await createTestTenant('t7', 'free'); // 2 slots
    // Fill 1 slot with active lease
    const lT7 = await Lease.create({
      property: property._id,
      tenant: t7.tenant._id,
      tenantEmail: t7.user.email,
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      rentAmount: 15000,
      status: 'active',
      createdBy: manager._id,
    });
    createdCleanupIds.leases.push(lT7._id);

    // Two bookings competing for 1 remaining slot
    const b7A = await Booking.create({
      user: t7.user._id,
      property: property2._id,
      manager: manager._id,
      startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
      status: 'pending',
      paymentStatus: 'pending',
      totalAmount: 18000,
    });
    createdCleanupIds.bookings.push(b7A._id);

    const b7B = await Booking.create({
      user: t7.user._id,
      property: property3._id,
      manager: manager._id,
      startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
      status: 'pending',
      paymentStatus: 'pending',
      totalAmount: 20000,
    });
    createdCleanupIds.bookings.push(b7B._id);

    const approveResults = await Promise.allSettled([
      approveBooking(
        { user: { userId: manager._id.toString(), role: 'manager' }, params: { id: b7A._id.toString() } },
        { status: () => ({ json: (d) => d }) }
      ),
      approveBooking(
        { user: { userId: manager._id.toString(), role: 'manager' }, params: { id: b7B._id.toString() } },
        { status: () => ({ json: (d) => d }) }
      ),
    ]);

    const fulfilledCount = approveResults.filter((r) => r.status === 'fulfilled').length;
    const rejectedCount = approveResults.filter((r) => r.status === 'rejected').length;
    const capT7 = await getTenantCommittedCapacity(t7.user._id);

    const passed7 = fulfilledCount === 1 && rejectedCount === 1 && capT7.totalCommitted === 2;
    record(7, 'Concurrent approvals allow exactly 1 and reject the other', passed7, `Fulfilled: ${fulfilledCount}, Rejected: ${rejectedCount}, Committed: ${capT7.totalCommitted}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 8: 48-Hour immutable approvalDate expiry
    // ─────────────────────────────────────────────────────────────
    const t8 = await createTestTenant('t8', 'free');
    const b8 = await Booking.create({
      user: t8.user._id,
      property: property._id,
      manager: manager._id,
      startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
      status: 'approved',
      paymentStatus: 'pending',
      approvalDate: new Date(Date.now() - 50 * 60 * 60 * 1000), // Approved 50h ago (> 48h)
      updatedAt: new Date(), // Recently updated by unrelated action
      totalAmount: 15000,
    });
    createdCleanupIds.bookings.push(b8._id);

    const capT8 = await getTenantCommittedCapacity(t8.user._id);
    const passed8 = capT8.totalCommitted === 0 && capT8.reservedCommitmentCount === 0;
    record(8, 'Booking past 48h from immutable approvalDate releases slot', passed8, `Committed: ${capT8.totalCommitted} (Expected 0)`);

    // ─────────────────────────────────────────────────────────────
    // TEST 9: In-flight checkout grace period
    // ─────────────────────────────────────────────────────────────
    const t9 = await createTestTenant('t9', 'free');
    const b9 = await Booking.create({
      user: t9.user._id,
      property: property._id,
      manager: manager._id,
      startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
      status: 'approved',
      paymentStatus: 'pending',
      approvalDate: new Date(Date.now() - 50 * 60 * 60 * 1000), // Past 48h
      checkoutExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // Active checkout grace!
      totalAmount: 15000,
    });
    createdCleanupIds.bookings.push(b9._id);

    const capT9 = await getTenantCommittedCapacity(t9.user._id);
    const passed9 = capT9.totalCommitted === 1 && capT9.reservedCommitmentCount === 1;
    record(9, 'Active checkoutExpiresAt preserves reservation past 48h', passed9, `Committed: ${capT9.totalCommitted} (Expected 1)`);

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Cron hourly cleanup query specification
    // ─────────────────────────────────────────────────────────────
    const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const now = new Date();
    const query = {
      _id: { $in: [b8._id, b9._id] },
      status: 'approved',
      paymentStatus: 'pending',
      $or: [
        { approvalDate: { $lt: threshold } },
        { approvalDate: { $exists: false }, updatedAt: { $lt: threshold } },
      ],
      $and: [
        {
          $or: [
            { checkoutExpiresAt: null },
            { checkoutExpiresAt: { $exists: false } },
            { checkoutExpiresAt: { $lt: now } },
          ],
        },
      ],
    };
    const targetedBookings = await Booking.find(query);
    const targetedIds = targetedBookings.map((b) => b._id.toString());
    const passed10 = targetedIds.includes(b8._id.toString()) && !targetedIds.includes(b9._id.toString());
    record(10, 'Cron hourly scrubber targets expired b8 and spares active b9', passed10, `Targeted: ${targetedIds.length} (Expected b8 only)`);

    // ─────────────────────────────────────────────────────────────
    // TEST 11: Booking cancellation immediate release
    // ─────────────────────────────────────────────────────────────
    const t11 = await createTestTenant('t11', 'free');
    const b11 = await Booking.create({
      user: t11.user._id,
      property: property._id,
      manager: manager._id,
      startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
      status: 'approved',
      paymentStatus: 'pending',
      approvalDate: new Date(),
      totalAmount: 15000,
    });
    createdCleanupIds.bookings.push(b11._id);

    const capBefore = await getTenantCommittedCapacity(t11.user._id);
    b11.status = 'cancelled';
    await b11.save();
    const capAfter = await getTenantCommittedCapacity(t11.user._id);

    const passed11 = capBefore.totalCommitted === 1 && capAfter.totalCommitted === 0;
    record(11, 'Booking cancellation immediately releases capacity', passed11, `Before: ${capBefore.totalCommitted}, After: ${capAfter.totalCommitted}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 12: Transition from approved reservation to active lease
    // ─────────────────────────────────────────────────────────────
    const t12 = await createTestTenant('t12', 'free');
    const b12 = await Booking.create({
      user: t12.user._id,
      property: property._id,
      manager: manager._id,
      startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: 'approved',
      paymentStatus: 'pending',
      approvalDate: new Date(),
      totalAmount: 15000,
    });
    createdCleanupIds.bookings.push(b12._id);

    const cap12Approved = await getTenantCommittedCapacity(t12.user._id);
    const convertedLease = await verifyAndProcessPaymentInternal({
      bookingId: b12._id,
      razorpayPaymentId: `mock_t12_pay_${timestamp}`,
      razorpayOrderId: `order_test_${timestamp}`,
      razorpaySignature: 'mock_signature_data',
    });
    if (convertedLease?.lease) createdCleanupIds.leases.push(convertedLease.lease);
    const cap12Paid = await getTenantCommittedCapacity(t12.user._id);

    // Simulate signing / activation of the lease document
    await Lease.updateOne({ _id: convertedLease.lease }, { $set: { status: 'active' } });
    const cap12Active = await getTenantCommittedCapacity(t12.user._id);

    const passed12 =
      cap12Approved.totalCommitted === 1 &&
      cap12Paid.totalCommitted === 1 &&
      cap12Active.totalCommitted === 1 &&
      cap12Active.activeLeaseCount === 1 &&
      cap12Active.reservedCommitmentCount === 0;
    record(12, 'Approved to active lease transition preserves total capacity = 1', passed12, `Approved: ${cap12Approved.totalCommitted}, Paid: ${cap12Paid.totalCommitted}, Active: ${cap12Active.totalCommitted}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 13: Mutex lock self-healing from stale state
    // ─────────────────────────────────────────────────────────────
    const t13 = await createTestTenant('t13', 'free');
    // Artificially plant a stale lock from 20 seconds ago
    await Subscription.updateOne(
      { user: t13.user._id, role: 'tenant' },
      { $set: { lockId: new mongoose.Types.ObjectId(), lockedAt: new Date(Date.now() - 20000) } }
    );

    let lockExecuted = false;
    await withTenantCapacityLock(t13.user._id, async () => {
      lockExecuted = true;
    });

    const subAfter = await Subscription.findOne({ user: t13.user._id, role: 'tenant' });
    const passed13 = lockExecuted && subAfter.lockId === null;
    record(13, 'Mutex lock automatically self-heals stale locks', passed13, `Executed: ${lockExecuted}, Lock cleared: ${subAfter.lockId === null}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 14: Capacity derived dynamically without counter drift
    // ─────────────────────────────────────────────────────────────
    const t14 = await createTestTenant('t14', 'free');
    const capDerived1 = await getTenantCommittedCapacity(t14.user._id);
    const userSub14 = await getUserSubscription(t14.user._id, 'tenant');
    const passed14 =
      capDerived1.totalCommitted === 0 &&
      userSub14.usage.currentCount === 0 &&
      userSub14.usage.remainingSlots === 2 &&
      userSub14.usage.isAtLimit === false;
    record(14, 'Authoritative capacity derived without counter drift', passed14, `Count: ${userSub14.usage.currentCount}, Remaining: ${userSub14.usage.remainingSlots}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 15: Multi-tenant capacity isolation
    // ─────────────────────────────────────────────────────────────
    const t15A = await createTestTenant('t15A', 'free');
    const t15B = await createTestTenant('t15B', 'free');

    // Fill Tenant A's capacity to 2/2
    const l15A1 = await Lease.create({
      property: property._id,
      tenant: t15A.tenant._id,
      tenantEmail: t15A.user.email,
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      rentAmount: 15000,
      status: 'active',
      createdBy: manager._id,
    });
    createdCleanupIds.leases.push(l15A1._id);

    const l15A2 = await Lease.create({
      property: property2._id,
      tenant: t15A.tenant._id,
      tenantEmail: t15A.user.email,
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      rentAmount: 18000,
      status: 'active',
      createdBy: manager._id,
    });
    createdCleanupIds.leases.push(l15A2._id);

    const cap15A = await getTenantCommittedCapacity(t15A.user._id);
    const cap15B = await getTenantCommittedCapacity(t15B.user._id);

    let t15AOverError = null;
    try {
      await assertAndReserveCapacity(t15A.user._id, 'tenant', 'test_new_lease');
    } catch (err) {
      t15AOverError = err;
    }

    let t15BAllowed = false;
    try {
      const bRes = await assertAndReserveCapacity(t15B.user._id, 'tenant', 'test_new_lease');
      t15BAllowed = bRes.allowed;
    } catch (err) {
      t15BAllowed = false;
    }

    const passed15 =
      cap15A.totalCommitted === 2 &&
      cap15B.totalCommitted === 0 &&
      t15AOverError?.statusCode === 403 &&
      t15BAllowed === true;
    record(15, 'Tenant A at capacity does not affect Tenant B', passed15, `Tenant A: ${cap15A.totalCommitted}/2 (Blocked), Tenant B: ${cap15B.totalCommitted}/2 (Allowed)`);

    // ─────────────────────────────────────────────────────────────
    // TEST 16: Rental Journey historical integrity
    // ─────────────────────────────────────────────────────────────
    const t16 = await createTestTenant('t16', 'free');
    // Add 3 historical expired leases + 1 terminated lease
    for (let i = 1; i <= 3; i++) {
      const histLease = await Lease.create({
        property: property._id,
        tenant: t16.tenant._id,
        tenantEmail: t16.user.email,
        startDate: new Date(Date.now() - (365 + i * 30) * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - (30 + i * 30) * 24 * 60 * 60 * 1000),
        rentAmount: 12000,
        status: 'expired',
        createdBy: manager._id,
      });
      createdCleanupIds.leases.push(histLease._id);
    }
    const termLease = await Lease.create({
      property: property2._id,
      tenant: t16.tenant._id,
      tenantEmail: t16.user.email,
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      rentAmount: 14000,
      status: 'terminated',
      createdBy: manager._id,
    });
    createdCleanupIds.leases.push(termLease._id);

    const totalHistoricalDocs = await Lease.countDocuments({ tenant: t16.tenant._id });
    const cap16 = await getTenantCommittedCapacity(t16.user._id);

    const passed16 = totalHistoricalDocs === 4 && cap16.totalCommitted === 0;
    record(16, 'Rental Journey retains 4 historical leases with 0 capacity penalty', passed16, `Total historical: ${totalHistoricalDocs}, Capacity consumed: ${cap16.totalCommitted}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 17: Concurrent Manager Direct Lease Creation (competing for last slot)
    // ─────────────────────────────────────────────────────────────
    const t17 = await createTestTenant('t17', 'free'); // limit 2
    // Occupy 1 slot with active lease
    const l17 = await Lease.create({
      property: property._id,
      tenant: t17.tenant._id,
      tenantEmail: t17.user.email,
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      rentAmount: 15000,
      status: 'active',
      createdBy: manager._id,
    });
    createdCleanupIds.leases.push(l17._id);

    // Two competing manager direct lease creations for 1 remaining slot
    const mockRes17A = { status: () => mockRes17A, json: (d) => d };
    const mockRes17B = { status: () => mockRes17B, json: (d) => d };

    const concurrentDirectCreations = await Promise.allSettled([
      createLease(
        {
          user: { userId: manager._id.toString(), role: 'manager' },
          headers: {},
          get: () => 'localhost:5000',
          body: {
            propertyId: property2._id.toString(),
            tenantId: t17.tenant._id.toString(),
            startDate: new Date(),
            endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            rentAmount: 18000,
            depositAmount: 36000,
          },
        },
        mockRes17A,
        (err) => {
          if (err) throw err;
        }
      ),
      createLease(
        {
          user: { userId: manager._id.toString(), role: 'manager' },
          headers: {},
          get: () => 'localhost:5000',
          body: {
            propertyId: property3._id.toString(),
            tenantId: t17.tenant._id.toString(),
            startDate: new Date(),
            endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            rentAmount: 20000,
            depositAmount: 40000,
          },
        },
        mockRes17B,
        (err) => {
          if (err) throw err;
        }
      ),
    ]);

    const directFulfilled = concurrentDirectCreations.filter((r) => r.status === 'fulfilled').length;
    const directRejected = concurrentDirectCreations.filter((r) => r.status === 'rejected').length;
    const cap17 = await getTenantCommittedCapacity(t17.user._id);

    const passed17 = directFulfilled === 1 && directRejected === 1 && cap17.totalCommitted === 2;
    record(17, 'Concurrent manager direct lease creations allow exactly 1 and block 1', passed17, `Fulfilled: ${directFulfilled}, Rejected: ${directRejected}, Total Committed: ${cap17.totalCommitted}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 18: Fail-closed unlinked/unresolvable tenant lease creation
    // ─────────────────────────────────────────────────────────────
    // Create an unlinked Tenant record (no User attached, non-existent email)
    const unlinkedTenant = await Tenant.create({
      firstName: 'Unlinked',
      lastName: 'Ghost',
      email: `unlinked_ghost_${timestamp}@testdomain.com`,
      phone: '8888888888',
      address: 'Ghost Street',
      managedBy: manager._id,
      status: 'active',
    });
    createdCleanupIds.tenants.push(unlinkedTenant._id);

    let unlinkedError = null;
    try {
      await createLease(
        {
          user: { userId: manager._id.toString(), role: 'manager' },
          body: {
            propertyId: property._id.toString(),
            tenantId: unlinkedTenant._id.toString(),
            startDate: new Date(),
            endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            rentAmount: 15000,
            depositAmount: 30000,
          },
        },
        mockRes17A
      );
    } catch (err) {
      unlinkedError = err;
    }

    const passed18 =
      unlinkedError &&
      unlinkedError.statusCode === 400 &&
      unlinkedError.message.includes('TENANT_ACCOUNT_REQUIRED');
    record(18, 'Fail-closed lease creation on unresolvable tenant user', passed18, `Status: ${unlinkedError?.statusCode}, Caught: ${unlinkedError?.message?.slice(0, 50)}...`);

    // ─────────────────────────────────────────────────────────────
    // TEST 19: Fencing token rejection on preempted lock
    // ─────────────────────────────────────────────────────────────
    const t19 = await createTestTenant('t19', 'free');
    const staleLockId = new mongoose.Types.ObjectId();
    const activeLockId = new mongoose.Types.ObjectId();

    // Assign activeLockId to subscription
    await Subscription.updateOne(
      { user: t19.user._id, role: 'tenant' },
      { $set: { lockId: activeLockId, lockedAt: new Date() } }
    );

    let fencingPreemptedError = null;
    try {
      // Stale worker tries to validate ownership with staleLockId
      await assertLockOwnership(t19.user._id, staleLockId);
    } catch (err) {
      fencingPreemptedError = err;
    }

    const passed19 =
      fencingPreemptedError &&
      fencingPreemptedError.statusCode === 409 &&
      fencingPreemptedError.message.includes('FENCING_TOKEN_INVALID');
    record(19, 'Fencing token rejection prevents split-brain writes on stale lock', passed19, `Status: ${fencingPreemptedError?.statusCode}, Message: ${fencingPreemptedError?.message}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 20: Concurrent payment callbacks idempotency & zero duplicates
    // ─────────────────────────────────────────────────────────────
    const t20 = await createTestTenant('t20', 'free');
    const b20 = await Booking.create({
      user: t20.user._id,
      property: property._id,
      manager: manager._id,
      startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: 'approved',
      paymentStatus: 'pending',
      approvalDate: new Date(),
      totalAmount: 15000,
    });
    createdCleanupIds.bookings.push(b20._id);

    // 2 simultaneous payment callback triggers (e.g. gateway webhook + frontend redirect)
    const callbackResults = await Promise.allSettled([
      verifyAndProcessPaymentInternal({
        bookingId: b20._id,
        razorpayPaymentId: `mock_t20_pay_${timestamp}`,
        razorpayOrderId: `order_test_${timestamp}`,
        razorpaySignature: 'mock_signature_data',
      }),
      verifyAndProcessPaymentInternal({
        bookingId: b20._id,
        razorpayPaymentId: `mock_t20_pay_${timestamp}`,
        razorpayOrderId: `order_test_${timestamp}`,
        razorpaySignature: 'mock_signature_data',
      }),
    ]);

    const fulfilledCallbacks = callbackResults.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    const primaryBooking = fulfilledCallbacks[0];
    if (primaryBooking?.lease) createdCleanupIds.leases.push(primaryBooking.lease);

    // If one call succeeded and the other waited/errored due to lock contention, verify idempotent retry
    let secondLeaseId = null;
    if (fulfilledCallbacks.length > 1) {
      secondLeaseId = fulfilledCallbacks[1]?.lease?.toString();
    } else {
      const retryResult = await verifyAndProcessPaymentInternal({
        bookingId: b20._id,
        razorpayPaymentId: `mock_t20_pay_${timestamp}`,
        razorpayOrderId: `order_test_${timestamp}`,
        razorpaySignature: 'mock_signature_data',
      });
      secondLeaseId = retryResult?.lease?.toString();
    }

    // Verify exactly ONE lease was created in database for this booking
    const leasesCountForB20 = await Lease.countDocuments({ booking: b20._id });
    const cap20 = await getTenantCommittedCapacity(t20.user._id);

    const passed20 =
      primaryBooking?.lease &&
      primaryBooking.lease.toString() === secondLeaseId &&
      leasesCountForB20 === 1 &&
      cap20.totalCommitted === 1;
    record(20, 'Concurrent payment callbacks guarantee exactly 1 lease and 1 capacity', passed20, `Created leases: ${leasesCountForB20}, Same lease ID: ${String(primaryBooking?.lease) === String(secondLeaseId)}, Cap: ${cap20.totalCommitted}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 21: Deterministic worker pause & preemption rollback
    // ─────────────────────────────────────────────────────────────
    const t21 = await createTestTenant('t21', 'free');
    // Tenant starts with 1 existing active lease (1/2 slots used)
    const initialLease21 = await Lease.create({
      property: property._id,
      tenant: t21.tenant._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      rentAmount: 18000,
      depositAmount: 36000,
      status: 'active',
      createdBy: manager._id,
    });
    createdCleanupIds.leases.push(initialLease21._id);

    let worker1Paused = false;
    let resumeWorker1 = null;
    const worker1ResumePromise = new Promise((resolve) => {
      resumeWorker1 = resolve;
    });

    let worker1Error = null;
    let worker1CreatedLeaseId = null;

    // Launch Worker 1 (exercising standalone non-transactional fallback path)
    const worker1Promise = withTenantCapacityLock(
      t21.user._id,
      async ({ lockId, session, assertOwnership, registerCompensation }) => {
        // 1. Worker 1 asserts capacity is available (1 < 2, allowed)
        await assertAndReserveCapacity(t21.user._id, 'tenant', 'create', { session });

        // Signal Worker 1 has passed capacity check and is pausing
        worker1Paused = true;

        // DELIBERATE PAUSE: Worker 1 pauses execution
        await worker1ResumePromise;

        // Worker 1 resumes after being preempted: attempts to create lease
        const created = await Lease.create([
          {
            property: property._id,
            tenant: t21.tenant._id,
            startDate: new Date(),
            endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            rentAmount: 22000,
            depositAmount: 44000,
            status: 'active',
            createdBy: manager._id,
          }
        ], { session: session || undefined });
        worker1CreatedLeaseId = created[0]._id;

        registerCompensation?.(async () => {
          await Lease.deleteOne({ _id: worker1CreatedLeaseId });
        });

        // Must assert ownership before completing write
        await assertOwnership();
        return created[0];
      },
      { forceNonTransactional: true }
    ).catch((err) => {
      worker1Error = err;
    });

    // Wait until Worker 1 enters lock and pauses
    while (!worker1Paused) {
      await new Promise((r) => setTimeout(r, 20));
    }

    // Now Worker 2 steals the lock (simulating lock preemption after stale interval)
    const worker2LockId = new mongoose.Types.ObjectId();
    await Subscription.updateOne(
      { user: t21.user._id, role: 'tenant' },
      { $set: { lockId: worker2LockId, lockedAt: new Date() } }
    );

    // Worker 2 creates Lease #2, filling tenant capacity to 2/2
    const lease2ByWorker2 = await Lease.create({
      property: property._id,
      tenant: t21.tenant._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      rentAmount: 20000,
      depositAmount: 40000,
      status: 'active',
      createdBy: manager._id,
    });
    createdCleanupIds.leases.push(lease2ByWorker2._id);

    // Worker 2 releases lock
    await Subscription.updateOne(
      { user: t21.user._id, role: 'tenant', lockId: worker2LockId },
      { $set: { lockId: null, lockedAt: null } }
    );

    // Now resume Worker 1 to attempt its write after preemption
    resumeWorker1();
    await worker1Promise;

    // Verify Worker 1 was rejected with 409 FENCING_TOKEN_INVALID
    const isWorker1Rejected =
      worker1Error &&
      worker1Error.statusCode === 409 &&
      worker1Error.message.includes('FENCING_TOKEN_INVALID');

    // Verify Worker 1's created lease was rolled back and does not exist in DB
    const leaseCheck = worker1CreatedLeaseId ? await Lease.findById(worker1CreatedLeaseId) : null;
    const isLeaseRolledBack = leaseCheck === null;

    // Verify tenant total committed capacity is strictly 2/2, never 3
    const cap21 = await getTenantCommittedCapacity(t21.user._id);
    const activeLeasesInDB = await Lease.countDocuments({
      tenant: t21.tenant._id,
      status: 'active',
    });

    const passed21 =
      isWorker1Rejected &&
      isLeaseRolledBack &&
      cap21.totalCommitted === 2 &&
      activeLeasesInDB === 2;

    record(
      21,
      'Preempted worker write rejected with 409 & rolled back (no over-capacity write)',
      passed21,
      `Rejected: ${isWorker1Rejected}, Rolled back: ${isLeaseRolledBack}, Total committed: ${cap21.totalCommitted}/2, DB count: ${activeLeasesInDB}`
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 22: Partial write crash recovery during payment verification
    // ─────────────────────────────────────────────────────────────
    const t22 = await createTestTenant('t22', 'free');
    const b22 = await Booking.create({
      user: t22.user._id,
      property: property._id,
      manager: manager._id,
      startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: 'approved',
      paymentStatus: 'paid', // Simulated crash: payment marked paid before lease creation/link
      lease: null,
      approvalDate: new Date(),
      totalAmount: 16000,
    });
    createdCleanupIds.bookings.push(b22._id);

    // Trigger reconciliation call
    const recoveredBooking = await verifyAndProcessPaymentInternal({
      bookingId: b22._id,
      razorpayPaymentId: `crash_recover_pay_${timestamp}`,
      razorpayOrderId: `order_crash_${timestamp}`,
      razorpaySignature: 'mock_signature_data',
    });

    if (recoveredBooking?.lease) createdCleanupIds.leases.push(recoveredBooking.lease);

    // Subsequent idempotent retry after crash recovery
    const retryAfterRecovery = await verifyAndProcessPaymentInternal({
      bookingId: b22._id,
      razorpayPaymentId: `crash_recover_pay_${timestamp}`,
      razorpayOrderId: `order_crash_${timestamp}`,
      razorpaySignature: 'mock_signature_data',
    });

    const leasesForB22 = await Lease.countDocuments({ booking: b22._id });
    const cap22 = await getTenantCommittedCapacity(t22.user._id);

    const passed22 =
      recoveredBooking?.lease !== null &&
      String(recoveredBooking?.lease) === String(retryAfterRecovery?.lease) &&
      leasesForB22 === 1 &&
      cap22.totalCommitted === 1;

    record(
      22,
      'Partial write crash recovery reconciles lease and guarantees capacity = 1',
      passed22,
      `Recovered lease: ${recoveredBooking?.lease}, Same lease on retry: ${String(recoveredBooking?.lease) === String(retryAfterRecovery?.lease)}, Cap: ${cap22.totalCommitted}`
    );

  } catch (globalErr) {
    console.error('GLOBAL TEST SUITE ERROR:', globalErr);
  } finally {
    console.log('\nCleaning up ephemeral test artifacts...');
    await Promise.all([
      User.deleteMany({ _id: { $in: createdCleanupIds.users } }),
      Tenant.deleteMany({ _id: { $in: createdCleanupIds.tenants } }),
      Property.deleteMany({ _id: { $in: createdCleanupIds.properties } }),
      Lease.deleteMany({ _id: { $in: createdCleanupIds.leases } }),
      Booking.deleteMany({ _id: { $in: createdCleanupIds.bookings } }),
      Subscription.deleteMany({ _id: { $in: createdCleanupIds.subscriptions } }),
    ]);
    console.log('Cleanup complete.\n');
  }

  // Summary Table
  console.log('========================================================================');
  console.log('       22-POINT SUBSCRIPTION LEASE-CAPACITY REGRESSION TEST RESULTS      ');
  console.log('========================================================================');
  let passCount = 0;
  for (const r of results) {
    if (r.status === 'PASS') passCount++;
    console.log(`[${r.status}] #${r.id} ${r.title.padEnd(55)} | ${r.detail}`);
  }
  console.log('========================================================================');
  console.log(`TOTAL: ${passCount} / ${results.length} PASSED`);
  console.log('========================================================================\n');

  await mongoose.disconnect();
  process.exit(passCount === results.length ? 0 : 1);
}

runSubscriptionCapacitySuite();
