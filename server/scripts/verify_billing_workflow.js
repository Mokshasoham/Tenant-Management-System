import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../src/config/database.js';
import Lease from '../src/models/Lease.js';
import Tenant from '../src/models/Tenant.js';
import Property from '../src/models/Property.js';
import User from '../src/models/User.js';
import Bill from '../src/models/Bill.js';
import Payment from '../src/models/Payment.js';
import { syncPaymentToBill } from '../src/services/billSyncService.js';
import logger from '../src/utils/logger.js';

const runVerification = async () => {
  logger.info('--- Starting Extended Billing & Invoice Workflow Verification ---');
  
  // 1. Connect to Database
  try {
    await connectDB();
    logger.info('Connected to MongoDB database successfully.');
  } catch (err) {
    logger.error(`Database connection failed: ${err.message}`);
    process.exit(1);
  }

  // 2. Setup/Find Mock Entities
  logger.info('Locating mock entities for transaction testing...');
  let tenant = await Tenant.findOne();
  let property = await Property.findOne();
  let lease = await Lease.findOne({ status: 'active' });

  if (!lease || !tenant || !property) {
    logger.info('Mock active lease or entities not found. Bootstrapping dummy entities for test execution...');
    
    let user = await User.findOne({ role: 'tenant' });
    if (!user) {
      user = await User.create({
        firstName: 'Test',
        lastName: 'Tenant',
        email: `test_tenant_${Date.now()}@tms.com`,
        password: 'Password123!',
        role: 'tenant',
        isEmailVerified: true
      });
    }

    let owner = await User.findOne({ role: 'owner' }) || await User.findOne({ role: 'admin' });
    if (!owner) {
      owner = await User.create({
        firstName: 'Test',
        lastName: 'Owner',
        email: `test_owner_${Date.now()}@tms.com`,
        password: 'Password123!',
        role: 'owner',
        isEmailVerified: true
      });
    }

    if (!property) {
      property = await Property.create({
        name: 'Hillview Apartment 404',
        address: '123 Vista Drive',
        city: 'Mumbai',
        zipCode: '400001',
        owner: owner._id,
        rentAmount: 25000,
        depositAmount: 50000,
        status: 'available'
      });
    }

    if (!tenant) {
      tenant = await Tenant.create({
        firstName: 'Test',
        lastName: 'Tenant',
        email: user.email,
        phone: '9999999999',
        managedBy: owner._id,
        status: 'active'
      });
    }

    if (!lease) {
      lease = await Lease.create({
        leaseNumber: `LEASE-TEST-${Date.now()}`,
        property: property._id,
        tenant: tenant._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        rentAmount: 25000,
        depositAmount: 50000,
        status: 'active',
        createdBy: owner._id
      });
    }
  }

  logger.info(`Context resolved successfully: Lease ${lease.leaseNumber}, Tenant ${tenant.firstName}, Property ${property.name}`);

  // 3. Test Manual Rent Bill Creation
  logger.info('Step 3: Simulating manual Rent Bill generation...');
  const rentBillNum = `BILL-RENT-MOCK-${Date.now()}`;
  
  const rentBill = await Bill.create({
    billNumber: rentBillNum,
    type: 'rent',
    lease: lease._id,
    tenant: tenant._id,
    property: property._id,
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Due in 5 days
    status: 'generated',
    breakdown: [
      { label: 'Base Rent', amount: 25000 },
      { label: 'Security Parking', amount: 1500 }
    ],
    timeline: [{ status: 'generated', note: 'Manual rent invoice draft finalized.' }]
  });

  logger.info(`Rent Bill created: ${rentBill.billNumber}. Amount Due: ₹${rentBill.amountDue}`);
  if (rentBill.amountDue !== 26500) {
    logger.error(`Validation failed: amountDue recomputation hook sum expected 26500, got ${rentBill.amountDue}`);
    process.exit(1);
  }

  // 4. Test Manual Utility Bill Creation (with meter reading)
  logger.info('Step 4: Simulating manual Electricity Bill with meter reading...');
  const elecBillNum = `BILL-ELEC-MOCK-${Date.now()}`;
  
  const elecBill = await Bill.create({
    billNumber: elecBillNum,
    type: 'electricity',
    lease: lease._id,
    tenant: tenant._id,
    property: property._id,
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    status: 'generated',
    meterReading: {
      previous: 1200,
      current: 1550, // 350 units
      rate: 8 // ₹8 per unit
    },
    breakdown: [
      { label: 'Electricity Usage (350 units @ ₹8)', amount: 2800 },
      { label: 'Fixed Meter Charge', amount: 250 }
    ],
    timeline: [{ status: 'generated', note: 'Utility reading confirmed.' }]
  });

  logger.info(`Electricity Bill created: ${elecBill.billNumber}. Amount Due: ₹${elecBill.amountDue}`);
  if (elecBill.amountDue !== 3050) {
    logger.error(`Validation failed: amountDue expected 3050, got ${elecBill.amountDue}`);
    process.exit(1);
  }

  // 5. Test Payment Sync Coordinator (Partial Payment)
  logger.info('Step 5: Simulating partial payment transaction and sync...');
  
  const paymentPartial = await Payment.create({
    type: 'rent',
    lease: lease._id,
    tenant: tenant._id,
    property: property._id,
    amount: rentBill.amountDue,
    amountPaid: 15000,
    status: 'paid', // transaction itself is paid/successful
    paymentDate: new Date(),
    paymentMethod: 'card',
    reference: `TXN-PART-${Date.now()}`,
    bill: rentBill._id
  });

  logger.info(`Created partial Payment: ${paymentPartial._id} of ₹15,000.`);
  
  // Call coordinator
  await syncPaymentToBill(paymentPartial._id);

  const updatedRentBillPartial = await Bill.findById(rentBill._id);
  logger.info(`Synced Rent Bill status: ${updatedRentBillPartial.status}, Paid: ₹${updatedRentBillPartial.amountPaid}, Balance: ₹${updatedRentBillPartial.balance}`);

  if (updatedRentBillPartial.status !== 'partially_paid') {
    logger.error(`Validation failed: Expected status to be 'partially_paid', got ${updatedRentBillPartial.status}`);
    process.exit(1);
  }

  // 6. Test Payment Sync Coordinator (Full Payment Completion)
  logger.info('Step 6: Simulating second payment transaction to complete balance...');
  
  const paymentFinal = await Payment.create({
    type: 'rent',
    lease: lease._id,
    tenant: tenant._id,
    property: property._id,
    amount: rentBill.amountDue,
    amountPaid: 11500, // completes ₹26,500 total
    status: 'paid',
    paymentDate: new Date(),
    paymentMethod: 'card',
    reference: `TXN-FINAL-${Date.now()}`,
    bill: rentBill._id
  });

  logger.info(`Created final Payment: ${paymentFinal._id} of ₹11,500.`);
  
  await syncPaymentToBill(paymentFinal._id);

  const updatedRentBillFinal = await Bill.findById(rentBill._id);
  logger.info(`Synced Rent Bill final status: ${updatedRentBillFinal.status}, Paid: ₹${updatedRentBillFinal.amountPaid}, Balance: ₹${updatedRentBillFinal.balance}`);
  logger.info(`Invoice S3 URL: ${updatedRentBillFinal.invoiceUrl}`);

  if (updatedRentBillFinal.status !== 'paid') {
    logger.error(`Validation failed: Expected status to be 'paid', got ${updatedRentBillFinal.status}`);
    process.exit(1);
  }

  // --- EXTENDED CHECKS ---

  // Check 1: Timeline entry count after two partial payments
  logger.info('Running Extended Check 1: Timeline entry count verification...');
  const billAfterTwoPayments = await Bill.findById(rentBill._id);
  logger.info(`[VERIFY] Timeline entries: ${billAfterTwoPayments.timeline.length}`);
  logger.info(`[VERIFY] Timeline statuses: ${billAfterTwoPayments.timeline.map(t => t.status).join(', ')}`);

  // Check 2: syncPaymentToBill called twice with the same payment ID
  logger.info('Running Extended Check 2: Idempotent syncPaymentToBill validation...');
  const amtBefore = updatedRentBillFinal.amountPaid;
  await syncPaymentToBill(paymentFinal._id);
  const billAfterSecondSync = await Bill.findById(rentBill._id);
  const amtAfter = billAfterSecondSync.amountPaid;
  logger.info(`[VERIFY] amountPaid before second sync: ₹${amtBefore}, after: ₹${amtAfter}`);
  logger.info(`[VERIFY] Timeline entries after redundant sync: ${billAfterSecondSync.timeline.length}`);
  if (amtBefore !== amtAfter) {
    logger.error(`Validation failed: amountPaid changed from ₹${amtBefore} to ₹${amtAfter}`);
    process.exit(1);
  } else {
    logger.info('[VERIFY] Idempotent sync check passed successfully.');
  }

  // Check 3: Webhook replay idempotency
  logger.info('Running Extended Check 3: Webhook replay idempotency...');
  const WebhookEvent = (await import('../src/models/WebhookEvent.js')).default;
  const testEventId = `evt_test_${Date.now()}`;
  
  await WebhookEvent.create({ eventId: testEventId, provider: 'stripe' });
  logger.info(`[VERIFY] WebhookEvent first insert of ${testEventId} succeeded.`);

  let caughtIdempotency = false;
  try {
    await WebhookEvent.create({ eventId: testEventId, provider: 'stripe' });
  } catch (dbErr) {
    if (dbErr.code === 11000) {
      caughtIdempotency = true;
      logger.info(`[VERIFY] Successfully caught duplicate event ${testEventId} with short-circuit error code 11000.`);
    } else {
      throw dbErr;
    }
  }

  if (!caughtIdempotency) {
    logger.error('Validation failed: Replay event was not caught by the unique constraint!');
    process.exit(1);
  } else {
    logger.info('[VERIFY] Webhook replay idempotency check passed successfully.');
  }
  await WebhookEvent.deleteOne({ eventId: testEventId });

  // Check 4: Concurrent bill creation / Counter uniqueness
  logger.info('Running Extended Check 4: Concurrent counter generation...');
  const Counter = (await import('../src/models/Counter.js')).default;
  const type = 'rent';
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const counterId = `BILL-${type.toUpperCase()}-${dateStr}-${Date.now()}`;

  const generateMockBillNumber = async () => {
    const counter = await Counter.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    const seqStr = String(counter.seq).padStart(4, '0');
    return `BILL-${type.substring(0, 4).toUpperCase()}-${dateStr}-${seqStr}`;
  };

  const results = await Promise.all([
    generateMockBillNumber(),
    generateMockBillNumber(),
    generateMockBillNumber(),
    generateMockBillNumber(),
    generateMockBillNumber()
  ]);

  logger.info(`[VERIFY] Concurrent bill numbers: ${results.join(', ')}`);
  const uniqueResults = new Set(results);
  if (uniqueResults.size !== 5) {
    logger.error('Validation failed: Collisions detected in concurrent bill numbers!');
    process.exit(1);
  } else {
    logger.info('[VERIFY] Concurrency counter index checks passed successfully without race collisions.');
  }
  await Counter.deleteOne({ _id: counterId });

  // Cleanup test data
  logger.info('Cleaning up mock database entries generated in this test session...');
  await Bill.deleteMany({ _id: { $in: [rentBill._id, elecBill._id] } });
  await Payment.deleteMany({ _id: { $in: [paymentPartial._id, paymentFinal._id] } });
  
  logger.info('Extended Verification successfully completed!');
  process.exit(0);
};

runVerification();
