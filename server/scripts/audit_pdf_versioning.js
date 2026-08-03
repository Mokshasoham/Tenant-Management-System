import mongoose from 'mongoose';
import config from '../src/config/config.js';
import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import Tenant from '../src/models/Tenant.js';
import Booking from '../src/models/Booking.js';
import Lease from '../src/models/Lease.js';
import FileMetadata from '../src/models/FileMetadata.js';
import FileStorage from '../src/models/FileStorage.js';
import { leaseLifecycleService } from '../src/modules/lease-engine/leaseLifecycleService.js';

async function auditPdfVersioning() {
  console.log('\n================================================================');
  console.log('=== AUDIT 4: LEASE PDF MULTI-REVISION VERSIONING AUDIT (v1->v4) ===');
  console.log('================================================================\n');

  let passed = true;

  try {
    await mongoose.connect(config.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');

    // 1. Seed test entities
    const managerUser = await User.create({
      firstName: 'Audit',
      lastName: 'Manager',
      email: `audit.mgr.${Date.now()}@tms.com`,
      password: 'Password123!',
      role: 'manager',
      phone: '+1 555-0011',
    });

    const tenantUser = await User.create({
      firstName: 'Audit',
      lastName: 'Tenant',
      email: `audit.tenant.${Date.now()}@tms.com`,
      password: 'Password123!',
      role: 'tenant',
      phone: '+1 555-0012',
      kycDocuments: ['/uploads/kyc/sample.pdf'],
    });

    const tenantDoc = await Tenant.create({
      firstName: 'Audit',
      lastName: 'Tenant',
      email: tenantUser.email,
      phone: '+1 555-0012',
      managedBy: managerUser._id,
      address: '100 Audit Plaza',
    });

    const property = await Property.create({
      name: 'Audit Tower Apt 9A',
      address: '100 Audit Plaza',
      city: 'Metropolis',
      zipCode: '90210',
      type: 'apartment',
      rentAmount: 4000,
      owner: managerUser._id,
      manager: managerUser._id,
    });

    const lease = await Lease.create({
      property: property._id,
      tenant: tenantDoc._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      rentAmount: 4000,
      depositAmount: 8000,
      status: 'active',
      createdBy: managerUser._id,
    });

    console.log(`[Audit] Created Lease ${lease.leaseNumber} for Multi-Version Test.\n`);

    // 2. Generate Revision v1.0
    console.log('  Generating Revision v1.0...');
    const v1 = await leaseLifecycleService.dispatch('LEASE_ACTIVATED', { leaseId: lease._id, user: tenantUser, forceRegenerate: true });

    // 3. Generate Revision v2.0
    console.log('  Generating Revision v2.0...');
    const v2 = await leaseLifecycleService.dispatch('LEASE_REGENERATION_REQUESTED', { leaseId: lease._id, user: managerUser, forceRegenerate: true });

    // 4. Generate Revision v3.0
    console.log('  Generating Revision v3.0...');
    const v3 = await leaseLifecycleService.dispatch('LEASE_REGENERATION_REQUESTED', { leaseId: lease._id, user: managerUser, forceRegenerate: true });

    // 5. Generate Revision v4.0
    console.log('  Generating Revision v4.0...');
    const v4 = await leaseLifecycleService.dispatch('LEASE_REGENERATION_REQUESTED', { leaseId: lease._id, user: managerUser, forceRegenerate: true });

    // 6. Verify Statuses & References
    console.log('\n[Audit Results]');
    const meta1 = await FileMetadata.findById(v1.fileId);
    const meta2 = await FileMetadata.findById(v2.fileId);
    const meta3 = await FileMetadata.findById(v3.fileId);
    const meta4 = await FileMetadata.findById(v4.fileId);

    console.log(`  - Revision v1.0 FileId: ${meta1._id} | Status: ${meta1.status} (Expected: superseded)`);
    console.log(`  - Revision v2.0 FileId: ${meta2._id} | Status: ${meta2.status} (Expected: superseded)`);
    console.log(`  - Revision v3.0 FileId: ${meta3._id} | Status: ${meta3.status} (Expected: superseded)`);
    console.log(`  - Revision v4.0 FileId: ${meta4._id} | Status: ${meta4.status} (Expected: active)`);

    if (meta1.status !== 'superseded' || meta2.status !== 'superseded' || meta3.status !== 'superseded' || meta4.status !== 'active') {
      console.error('  ❌ Multi-version status check failed.');
      passed = false;
    } else {
      console.log('  ✓ Version Status Tracking Passed: Only latest revision is active; older versions are superseded.');
    }

    // 7. Verify all binaries remain stored and downloadable
    const allMetas = [meta1, meta2, meta3, meta4];
    for (const m of allMetas) {
      const cleanName = m.key.split('/').pop();
      const storage = await FileStorage.findOne({ filename: cleanName });
      if (!storage || !storage.data) {
        console.error(`  ❌ Storage missing for revision ${m.documentVersion}`);
        passed = false;
      }
    }

    if (passed) {
      console.log('  ✓ Binary Integrity Passed: All 4 versions remain stored and downloadable in MongoDB FileStorage.');
    }

    // 8. Cleanup Test Entities
    await User.findByIdAndDelete(managerUser._id);
    await User.findByIdAndDelete(tenantUser._id);
    await Tenant.findByIdAndDelete(tenantDoc._id);
    await Property.findByIdAndDelete(property._id);
    await Lease.findByIdAndDelete(lease._id);
    await FileMetadata.deleteMany({ relatedEntity: lease._id });
    for (const m of allMetas) {
      await FileStorage.deleteOne({ filename: m.key.split('/').pop() });
    }

    console.log('\n================================================================');
    if (passed) console.log('=== AUDIT 4 PASSED: MULTI-REVISION VERSIONING 100% VALIDATED ===');
    else console.error('=== AUDIT 4 FAILED: VERSIONING ERRORS FOUND ===');
    console.log('================================================================\n');

    await mongoose.disconnect();
    process.exit(passed ? 0 : 1);
  } catch (err) {
    console.error('❌ Audit 4 failed:', err);
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    process.exit(1);
  }
}

auditPdfVersioning();
