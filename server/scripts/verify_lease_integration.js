import mongoose from 'mongoose';
import config from '../src/config/config.js';
import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import Tenant from '../src/models/Tenant.js';
import Booking from '../src/models/Booking.js';
import Lease from '../src/models/Lease.js';
import FileMetadata from '../src/models/FileMetadata.js';
import FileStorage from '../src/models/FileStorage.js';
import Notification from '../src/models/Notification.js';
import { leaseLifecycleService } from '../src/modules/lease-engine/leaseLifecycleService.js';

/**
 * Enterprise End-to-End Lease Integration & Regression Verification Suite
 */
async function runEndToEndLeaseIntegrationTest() {
  console.log('\n================================================================');
  console.log('=== STARTING END-TO-END LEASE DOCUMENT ENGINE INTEGRATION TEST ===');
  console.log('================================================================\n');

  let passed = true;

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');
    }

    // 1. Seed or Find Mock Entities
    console.log('[Step 1/12] Initializing Test Entities (Tenant, Manager, Property, Booking)...');
    const testEmail = `test.tenant.${Date.now()}@example.com`;
    const managerEmail = `test.manager.${Date.now()}@example.com`;

    const managerUser = await User.create({
      firstName: 'Sarah',
      lastName: 'Connor',
      email: managerEmail,
      password: 'Password123!',
      role: 'manager',
      phone: '+1 555-0199',
    });

    const tenantUser = await User.create({
      firstName: 'Alex',
      lastName: 'Vance',
      email: testEmail,
      password: 'Password123!',
      role: 'tenant',
      phone: '+1 555-0192',
      kycDocuments: ['/uploads/kyc/sample.pdf'],
    });

    const tenantDoc = await Tenant.create({
      firstName: 'Alex',
      lastName: 'Vance',
      email: testEmail,
      phone: '+1 555-0192',
      managedBy: managerUser._id,
      address: '777 Ocean Blvd, Apt 4B',
    });

    const property = await Property.create({
      name: 'Skyline Luxury Penthouse 4B',
      address: '777 Ocean Boulevard',
      city: 'Metropolis',
      zipCode: '90210',
      type: 'apartment',
      rentAmount: 3500,
      owner: managerUser._id,
      manager: managerUser._id,
    });

    const booking = await Booking.create({
      property: property._id,
      user: tenantUser._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      rentAmount: 3500,
      depositAmount: 7000,
      totalAmount: 10500,
      manager: managerUser._id,
      status: 'approved',
      paymentStatus: 'paid',
    });

    console.log(`  ✓ Test Entities Created: Property ID ${property._id}, Lease Tenant ${tenantDoc._id}\n`);

    // 2. Create Lease Document (Status: Pending)
    console.log('[Step 2/12] Creating Lease Agreement (Status: Pending)...');
    const lease = await Lease.create({
      property: property._id,
      tenant: tenantDoc._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      rentAmount: 3500,
      depositAmount: 7000,
      status: 'pending',
      createdBy: managerUser._id,
    });
    console.log(`  ✓ Lease Created: Reference ${lease.leaseNumber}\n`);

    // 3. Simulate Digital Signature Execution
    console.log('[Step 3/12] Executing Digital E-Signature...');
    const dummySignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    lease.signature = dummySignature;
    lease.signatureType = 'draw';
    lease.signedBy = 'Alex Vance';
    lease.signedAt = new Date();
    lease.tenantSignatureIp = '192.168.1.100';
    lease.status = 'active';
    await lease.save();
    console.log('  ✓ E-Signature Attached & Lease Status marked ACTIVE.\n');

    // 4. Dispatch LEASE_ACTIVATED Event Pipeline
    console.log('[Step 4/12] Dispatching LEASE_ACTIVATED Event Pipeline...');
    const pdfResult = await leaseLifecycleService.dispatch('LEASE_ACTIVATED', {
      leaseId: lease._id,
      user: tenantUser,
    });

    if (!pdfResult || !pdfResult.fileId) {
      console.error('  ❌ PDF Generation pipeline failed to return fileId.');
      passed = false;
    } else {
      console.log(`  ✓ Pipeline Execution Result: FileId ${pdfResult.fileId}, Version ${pdfResult.version}\n`);
    }

    // 5. Verify Document Generation Status Tracking
    console.log('[Step 5/12] Verifying Lease documentGeneration Status Tracking...');
    const refreshedLease = await Lease.findById(lease._id);
    if (refreshedLease.documentGeneration?.status !== 'completed') {
      console.error(`  ❌ Expected status "completed", received "${refreshedLease.documentGeneration?.status}"`);
      passed = false;
    } else {
      console.log(`  ✓ documentGeneration.status = "completed" (Completed At: ${refreshedLease.documentGeneration.completedAt})\n`);
    }

    // 6. Verify FileMetadata & SHA256 Hash Registration
    console.log('[Step 6/12] Verifying FileMetadata & SHA256 Checksum...');
    const metaRecord = await FileMetadata.findById(pdfResult.fileId);
    if (!metaRecord || !metaRecord.sha256 || metaRecord.sha256.length !== 64) {
      console.error('  ❌ FileMetadata SHA256 checksum invalid or missing.');
      passed = false;
    } else {
      console.log(`  ✓ SHA256 Hash Verified: ${metaRecord.sha256}`);
      console.log(`  ✓ Template Version Verified: ${metaRecord.templateVersion}\n`);
    }

    // 7. Verify FileStorage Binary Content
    console.log('[Step 7/12] Verifying MongoDB FileStorage Binary Data...');
    const cleanFilename = metaRecord.key.split('/').pop();
    const storageDoc = await FileStorage.findOne({ filename: cleanFilename });
    if (!storageDoc || !storageDoc.data || storageDoc.data.length === 0) {
      console.error('  ❌ FileStorage binary document not found or empty.');
      passed = false;
    } else {
      console.log(`  ✓ FileStorage Binary Verified: ${storageDoc.data.length} bytes.\n`);
    }

    // 8. Verify In-App Notification Delivery
    console.log('[Step 8/12] Verifying In-App Notification Delivery...');
    const notif = await Notification.findOne({ recipient: tenantUser._id, type: 'success' });
    if (!notif) {
      console.error('  ❌ Lease generation notification was not delivered to tenant.');
      passed = false;
    } else {
      console.log(`  ✓ Notification Verified: "${notif.title}" -> Link: ${notif.link}\n`);
    }

    // 9. Verify Idempotency Protection
    console.log('[Step 9/12] Verifying Idempotency Protection on Duplicate Dispatch...');
    const duplicateResult = await leaseLifecycleService.dispatch('LEASE_ACTIVATED', {
      leaseId: lease._id,
      user: tenantUser,
    });
    if (!duplicateResult.isExisting) {
      console.error('  ❌ Idempotency check failed: Duplicate PDF generation was executed.');
      passed = false;
    } else {
      console.log('  ✓ Idempotency Guard Passed: Duplicate dispatch returned existing PDF without re-generation.\n');
    }

    // 10. Verify Manual PDF Regeneration & Version Incrementation
    console.log('[Step 10/12] Verifying Manual Regeneration (Version v2.0)...');
    const regenResult = await leaseLifecycleService.dispatch('LEASE_REGENERATION_REQUESTED', {
      leaseId: lease._id,
      user: managerUser,
      forceRegenerate: true,
    });

    const oldMeta = await FileMetadata.findById(pdfResult.fileId);
    const newMeta = await FileMetadata.findById(regenResult.fileId);

    if (oldMeta.status !== 'superseded' || newMeta.status !== 'active' || regenResult.version !== 'v2.0') {
      console.error(`  ❌ Version history failed: Old status "${oldMeta.status}", New status "${newMeta.status}", New version "${regenResult.version}"`);
      passed = false;
    } else {
      console.log(`  ✓ Regeneration Verified: Old file marked "superseded", New revision "${regenResult.version}" marked "active".\n`);
    }

    // 11. Verify Fault Tolerance
    console.log('[Step 11/12] Verifying Fault-Tolerant Failure Handling...');
    try {
      await leaseLifecycleService.handleLeaseActivated({ leaseId: new mongoose.Types.ObjectId() });
      console.log('  ✓ Fault Tolerance Passed: Non-existent lease ID handled gracefully without throwing crash.\n');
    } catch (e) {
      console.error('  ❌ Fault tolerance failed: Unhandled error thrown.');
      passed = false;
    }

    // 12. Cleanup Test Entities
    console.log('[Step 12/12] Cleaning up Test Entities...');
    await User.findByIdAndDelete(tenantUser._id);
    await User.findByIdAndDelete(managerUser._id);
    await Tenant.findByIdAndDelete(tenantDoc._id);
    await Property.findByIdAndDelete(property._id);
    await Booking.findByIdAndDelete(booking._id);
    await Lease.findByIdAndDelete(lease._id);
    await FileMetadata.deleteMany({ relatedEntity: lease._id });
    await FileStorage.deleteMany({ filename: { $regex: lease.leaseNumber } });
    await Notification.deleteMany({ recipient: tenantUser._id });
    console.log('  ✓ Test Entities Cleaned Up.\n');

    console.log('================================================================');
    if (passed) {
      console.log('=== END-TO-END LEASE DOCUMENT ENGINE INTEGRATION: 100% PASSED ===');
    } else {
      console.error('=== END-TO-END LEASE DOCUMENT ENGINE INTEGRATION: FAILED ===');
    }
    console.log('================================================================\n');

    await mongoose.disconnect();
    process.exit(passed ? 0 : 1);
  } catch (err) {
    console.error('\n❌ INTEGRATION TEST SCRIPT FAILED:', err);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

runEndToEndLeaseIntegrationTest();
