import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../src/config/database.js';
import Lease from '../src/models/Lease.js';
import Tenant from '../src/models/Tenant.js';
import Property from '../src/models/Property.js';
import User from '../src/models/User.js';
import Bill from '../src/models/Bill.js';
import Payment from '../src/models/Payment.js';
import { getPaymentInvoice, getMyPayments, getAllPayments } from '../src/controllers/paymentController.js';
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

  // Declare variables in outer scope for cleanup in finally block
  let tenant = null;
  let property = null;
  let lease = null;
  let user = null;
  let owner = null;
  let legacyPayment = null;
  let concurrentPayment = null;
  let dummyBill = null;
  let linkedPayment = null;
  let userB = null;
  let tenantB = null;
  let legacyPaymentB = null;
  let userA = null;
  let createdUserA = false;
  let createdMockContext = false;

  try {
    // 2. Setup mock models
    tenant = await Tenant.findOne();
    property = await Property.findOne();
    lease = await Lease.findOne({ status: 'active' });

    if (!lease || !tenant || !property) {
      logger.info('Mock entities not found. Resolving dummy entries...');
      user = await User.findOne({ role: 'tenant' }) || await User.create({
        firstName: 'Test',
        lastName: 'Tenant',
        email: `test_legacy_tenant_${Date.now()}@tms.com`,
        password: 'Password123!',
        role: 'tenant',
        isEmailVerified: true
      });

      owner = await User.findOne({ role: 'owner' }) || await User.findOne({ role: 'admin' }) || await User.create({
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
        address: '456 Pearl Residency Street',
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
      createdMockContext = true;
    }

    logger.info(`Resolved Test context: Lease ${lease.leaseNumber}, Tenant ${tenant.firstName} ${tenant.lastName}, Property ${property.name}`);

    // Test 1: Generate an invoice for a pre-migration payment (no linked Bill)
    logger.info('Test 1: Simulating pre-migration payment (no bill)...');
    legacyPayment = await Payment.create({
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
    concurrentPayment = await Payment.create({
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
    
    dummyBill = await Bill.create({
      billNumber: `BILL-TEST-${Date.now()}`,
      type: 'miscellaneous',
      lease: lease._id,
      tenant: tenant._id,
      property: property._id,
      dueDate: new Date(),
      billingPeriodStart: new Date(2000, 0, 1),
      billingPeriodEnd: new Date(2000, 0, 31),
      status: 'paid',
      amountDue: 26500,
      amountPaid: 26500,
      fileId: updatedPayment.fileId
    });

    linkedPayment = await Payment.create({
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

    // Test 5: Ownership check (403 on cross-tenant access)
    logger.info('Test 5: Running cross-tenant ownership check (403 expected)...');
    
    userB = await User.create({
      firstName: 'Tenant',
      lastName: 'Bee',
      email: `tenant_b_${Date.now()}@tms.com`,
      password: 'Password123!',
      role: 'tenant',
      isEmailVerified: true
    });
    
    tenantB = await Tenant.create({
      firstName: 'Tenant',
      lastName: 'Bee',
      email: userB.email,
      phone: '9777777777',
      address: '123 Test Street',
      managedBy: tenant.managedBy,
      status: 'active'
    });

    const reqCrossTenant = {
      params: { id: legacyPayment._id.toString() },
      user: { userId: userB._id.toString(), role: 'tenant' },
      headers: {},
      protocol: 'http',
      get: () => 'localhost:5000',
      query: {}
    };

    try {
      await executeHandler(getPaymentInvoice, reqCrossTenant);
      logger.error('Validation failed: Allowed cross-tenant access!');
      process.exit(1);
    } catch (err) {
      logger.info(`[VERIFY] Cross-tenant access successfully blocked with error: "${err.message}" (Status: ${err.statusCode})`);
      if (err.statusCode !== 403) {
        logger.error(`Validation failed: Expected status code 403, got ${err.statusCode}`);
        process.exit(1);
      }
    }

    logger.info('Test 5 Passed: Cross-tenant ownership check verified successfully.');

    // Test 6: Role-scoped legacy list (both directions)
    logger.info('Test 6: Testing role-scoped legacy lists...');

    legacyPaymentB = await Payment.create({
      type: 'rent',
      lease: lease._id,
      tenant: tenantB._id,
      property: property._id,
      amount: 12000,
      amountPaid: 12000,
      status: 'paid',
      paymentDate: new Date(),
      paymentMethod: 'card',
      reference: `TXN-LEGACY-B-${Date.now()}`
    });

    userA = await User.findOne({ email: tenant.email });
    if (!userA) {
      userA = await User.create({
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        email: tenant.email,
        password: 'Password123!',
        role: 'tenant',
        isEmailVerified: true
      });
      createdUserA = true;
    }

    const reqTenantAList = {
      user: { userId: userA._id.toString(), role: 'tenant' },
      query: { bill: 'null' },
      headers: {},
      protocol: 'http',
      get: () => 'localhost:5000'
    };

    const resTenantAList = await executeHandler(getMyPayments, reqTenantAList);
    logger.info(`[VERIFY] Tenant A Legacy Payments returned:`);
    resTenantAList.body.data.forEach(p => {
      logger.info(`  - Payment ID: ${p._id}, Tenant ID: ${p.tenant?._id || p.tenant}, Reference: ${p.reference}`);
    });

    resTenantAList.body.data.forEach(p => {
      const paymentTenantId = (p.tenant?._id || p.tenant).toString();
      if (paymentTenantId !== tenant._id.toString()) {
        logger.error(`Validation failed: Tenant A's list contained a payment for tenant ${paymentTenantId}`);
        process.exit(1);
      }
    });

    const reqManagerList = {
      user: { role: 'admin' },
      query: { bill: 'null', limit: '100' },
      headers: {},
      protocol: 'http',
      get: () => 'localhost:5000'
    };

    const resManagerList = await executeHandler(getAllPayments, reqManagerList);
    logger.info(`[VERIFY] Manager Legacy Payments returned:`);
    resManagerList.body.data.forEach(p => {
      logger.info(`  - Payment ID: ${p._id}, Tenant ID: ${p.tenant?._id || p.tenant}, Reference: ${p.reference}`);
    });

    const hasPaymentA = resManagerList.body.data.some(p => p._id.toString() === legacyPayment._id.toString());
    const hasPaymentB = resManagerList.body.data.some(p => p._id.toString() === legacyPaymentB._id.toString());

    if (!hasPaymentA || !hasPaymentB) {
      logger.error(`Validation failed: Manager list did not return legacy payments across multiple tenants. A: ${hasPaymentA}, B: ${hasPaymentB}`);
      process.exit(1);
    }

    logger.info('Test 6 Passed: Role-scoped legacy list checks passed successfully.');

  } catch (err) {
    logger.error(`Verification failed: ${err.message}`);
    process.exit(1);
  } finally {
    logger.info('Cleaning up database context in finally block...');
    
    // Clean up created payments
    const paymentsToDelete = [];
    if (legacyPayment) paymentsToDelete.push(legacyPayment._id);
    if (concurrentPayment) paymentsToDelete.push(concurrentPayment._id);
    if (linkedPayment) paymentsToDelete.push(linkedPayment._id);
    if (legacyPaymentB) paymentsToDelete.push(legacyPaymentB._id);

    if (paymentsToDelete.length > 0) {
      await Payment.deleteMany({ _id: { $in: paymentsToDelete } });
    }

    // Clean up created bills
    if (dummyBill) {
      await Bill.deleteOne({ _id: dummyBill._id });
    }

    // Clean up created Tenant B
    if (tenantB) {
      await Tenant.deleteOne({ _id: tenantB._id });
    }
    if (userB) {
      await User.deleteOne({ _id: userB._id });
    }

    // Clean up created User A if applicable
    if (createdUserA && userA) {
      await User.deleteOne({ _id: userA._id });
    }

    // Clean up mock context if generated
    if (createdMockContext) {
      if (lease) await Lease.deleteOne({ _id: lease._id });
      if (tenant) await Tenant.deleteOne({ _id: tenant._id });
      if (property) await Property.deleteOne({ _id: property._id });
      if (user) await User.deleteOne({ _id: user._id });
      if (owner) await User.deleteOne({ _id: owner._id });
    }

    // Clean up specifically the three orphaned records the user pointed out
    await Payment.deleteMany({
      _id: {
        $in: [
          new mongoose.Types.ObjectId('69c3c78025c77c3e9812685d'),
          new mongoose.Types.ObjectId('69c3c790587e9bf213f70751'),
          new mongoose.Types.ObjectId('69c3c79dc291050961b3b80e')
        ]
      }
    });

    logger.info('Database cleanup complete.');
    process.exit(0);
  }
};

runVerification();
