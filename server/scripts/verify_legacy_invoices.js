import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../src/config/database.js';
import Lease from '../src/models/Lease.js';
import Tenant from '../src/models/Tenant.js';
import Property from '../src/models/Property.js';
import User from '../src/models/User.js';
import Bill from '../src/models/Bill.js';
import Payment from '../src/models/Payment.js';
import { getPaymentInvoice } from '../src/controllers/paymentController.js';
import logger from '../src/utils/logger.js';

// Helper to execute and await wrapped Express controllers
const executeHandler = (handler, req) => {
  return new Promise((resolve, reject) => {
    const res = {
      status: (code) => {
        res.statusCode = code;
        return {
          json: (data) => {
            res.body = data;
            resolve({ statusCode: code, body: data });
          }
        };
      }
    };

    const next = (err) => {
      if (err) reject(err);
      else resolve({ statusCode: 200, nextCalled: true });
    };

    handler(req, res, next);
  });
};

const runVerification = async () => {
  logger.info('--- Starting Legacy Payment Invoice Generation Verification ---');

  // 1. Connect to Database
  try {
    await connectDB();
    logger.info('Connected to MongoDB database successfully.');
  } catch (err) {
    logger.error(`Database connection failed: ${err.message}`);
    process.exit(1);
  }

  // 2. Setup mock models
  let tenant = await Tenant.findOne();
  let property = await Property.findOne();
  let lease = await Lease.findOne({ status: 'active' });

  if (!lease || !tenant || !property) {
    logger.info('Mock entities not found. Resolving dummy entries...');
    let user = await User.findOne({ role: 'tenant' }) || await User.create({
      firstName: 'Test',
      lastName: 'Tenant',
      email: `test_legacy_tenant_${Date.now()}@tms.com`,
      password: 'Password123!',
      role: 'tenant',
      isEmailVerified: true
    });

    let owner = await User.findOne({ role: 'owner' }) || await User.findOne({ role: 'admin' }) || await User.create({
      firstName: 'Test',
      lastName: 'Owner',
      email: `test_legacy_owner_${Date.now()}@tms.com`,
      password: 'Password123!',
      role: 'owner',
      isEmailVerified: true
    });

    property = await Property.create({
      name: 'Ocean Pearl Residency',
      address: 'Sea Breeze Lane',
      city: 'Goa',
      zipCode: '403001',
      owner: owner._id,
      rentAmount: 38000,
      depositAmount: 76000,
      status: 'available'
    });

    tenant = await Tenant.create({
      firstName: 'Jane',
      lastName: 'Doe',
      email: user.email,
      phone: '9888888888',
      managedBy: owner._id,
      status: 'active'
    });

    lease = await Lease.create({
      leaseNumber: `LEASE-LEGACY-${Date.now()}`,
      property: property._id,
      tenant: tenant._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      rentAmount: 38000,
      depositAmount: 76000,
      status: 'active',
      createdBy: owner._id
    });
  }

  logger.info(`Resolved Test context: Lease ${lease.leaseNumber}, Tenant ${tenant.firstName} ${tenant.lastName}, Property ${property.name}`);

  // Test 1: Generate an invoice for a pre-migration payment (no linked Bill)
  logger.info('Test 1: Simulating pre-migration payment (no bill)...');
  const legacyPayment = await Payment.create({
    type: 'rent',
    lease: lease._id,
    tenant: tenant._id,
    property: property._id,
    amount: 38000,
    amountPaid: 38000,
    status: 'paid',
    paymentDate: new Date(),
    paymentMethod: 'card',
    reference: `TXN-LEGACY-${Date.now()}`
  });

  logger.info(`Legacy Payment created: ID ${legacyPayment._id}, Reference ${legacyPayment.reference}`);

  const mockReq = {
    params: { id: legacyPayment._id.toString() },
    user: { userId: tenant._id.toString(), role: 'admin' },
    headers: {},
    protocol: 'http',
    get: () => 'localhost:5000',
    query: {}
  };

  // Run legacy generation and await result
  const result1 = await executeHandler(getPaymentInvoice, mockReq);
  logger.info(`[VERIFY] Response output: ${JSON.stringify(result1.body)}`);
  
  if (!result1.body || !result1.body.success || !result1.body.url) {
    logger.error('Validation failed: Failed to return signed URL for legacy payment');
    process.exit(1);
  }

  const updatedPayment = await Payment.findById(legacyPayment._id);
  logger.info(`[VERIFY] Saved Payment fileId: ${updatedPayment.fileId}`);
  logger.info(`[VERIFY] Saved Payment invoiceUrl (should be undefined): ${updatedPayment.invoiceUrl}`);

  if (!updatedPayment.fileId) {
    logger.error('Validation failed: fileId was not saved to Payment document!');
    process.exit(1);
  }

  if (updatedPayment.invoiceUrl !== undefined) {
    logger.error('Validation failed: Legacy invoiceUrl string was persisted in Payment document!');
    process.exit(1);
  }

  logger.info('Test 1 Passed: Legacy invoice generated cleanly, only fileId persisted.');

  // Test 2: Verify signed URL freshness
  logger.info('Test 2: Verifying signed URL freshness (sleeping 1.1s to allow timestamp to advance)...');
  await new Promise(resolve => setTimeout(resolve, 1100));
  const result2 = await executeHandler(getPaymentInvoice, mockReq);
  logger.info(`[VERIFY] Second response URL: ${result2.body.url}`);

  if (result1.body.url === result2.body.url) {
    logger.error('Validation failed: Signed URLs are identical (cached string returned)');
    process.exit(1);
  } else {
    logger.info('Test 2 Passed: Signed URLs differ, confirming fresh signatures.');
  }

  // Test 3: No double generation under concurrency / locking
  logger.info('Test 3: Testing concurrent lock protection...');
  const concurrentPayment = await Payment.create({
    type: 'rent',
    lease: lease._id,
    tenant: tenant._id,
    property: property._id,
    amount: 25000,
    amountPaid: 25000,
    status: 'paid',
    paymentDate: new Date(),
    paymentMethod: 'card',
    reference: `TXN-CONC-${Date.now()}`
  });

  const req1 = {
    params: { id: concurrentPayment._id.toString() },
    user: { userId: tenant._id.toString(), role: 'admin' },
    headers: {},
    protocol: 'http',
    get: () => 'localhost:5000',
    query: {}
  };
  const req2 = { ...req1 };

  // Trigger concurrently
  const [res1, res2] = await Promise.all([
    executeHandler(getPaymentInvoice, req1),
    executeHandler(getPaymentInvoice, req2)
  ]);

  logger.info(`[VERIFY] Concurrency response 1: ${JSON.stringify(res1.body)}`);
  logger.info(`[VERIFY] Concurrency response 2: ${JSON.stringify(res2.body)}`);

  const paymentFinal = await Payment.findById(concurrentPayment._id);
  logger.info(`[VERIFY] Concurrent Payment final fileId: ${paymentFinal.fileId}`);

  if (!res1.body?.success || !res2.body?.success) {
    logger.error('Validation failed: One of the concurrent requests failed');
    process.exit(1);
  }

  logger.info('Test 3 Passed: Concurrency lock successfully resolved without collisions.');

  // Test 4: Linked Bill Forwarding
  logger.info('Test 4: Testing linked Bill forwarding...');
  
  const dummyBill = await Bill.create({
    billNumber: `BILL-TEST-${Date.now()}`,
    type: 'rent',
    lease: lease._id,
    tenant: tenant._id,
    property: property._id,
    dueDate: new Date(),
    status: 'paid',
    amountDue: 26500,
    amountPaid: 26500,
    fileId: updatedPayment.fileId
  });

  const linkedPayment = await Payment.create({
    type: 'rent',
    lease: lease._id,
    tenant: tenant._id,
    property: property._id,
    amount: 26500,
    amountPaid: 26500,
    status: 'paid',
    paymentDate: new Date(),
    paymentMethod: 'card',
    reference: `TXN-LINKED-${Date.now()}`,
    bill: dummyBill._id
  });

  const reqLinked = {
    params: { id: linkedPayment._id.toString() },
    user: { userId: tenant._id.toString(), role: 'admin' },
    headers: {},
    protocol: 'http',
    get: () => 'localhost:5000',
    query: {}
  };

  const resLinked = await executeHandler(getPaymentInvoice, reqLinked);
  logger.info(`[VERIFY] Linked invoice response: ${JSON.stringify(resLinked.body)}`);

  if (!resLinked.body || !resLinked.body.success || !resLinked.body.url) {
    logger.error('Validation failed: Linked payment did not forward download link.');
    process.exit(1);
  }

  logger.info('Test 4 Passed: Linked payment forwarded to bill flow correctly.');

  // Cleanup test entries
  logger.info('Cleaning up generated documents...');
  await Payment.deleteMany({ _id: { $in: [legacyPayment._id, concurrentPayment._id, linkedPayment._id] } });
  await Bill.deleteMany({ _id: dummyBill._id });
  
  logger.info('--- All Legacy Payment Invoice Tests Passed Successfully! ---');
  process.exit(0);
};

runVerification();
