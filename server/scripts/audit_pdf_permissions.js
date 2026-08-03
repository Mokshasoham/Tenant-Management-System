import mongoose from 'mongoose';
import config from '../src/config/config.js';
import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import Tenant from '../src/models/Tenant.js';
import Lease from '../src/models/Lease.js';
import FileMetadata from '../src/models/FileMetadata.js';
import FileStorage from '../src/models/FileStorage.js';
import { generateToken } from '../src/utils/jwt.js';
import { leaseLifecycleService } from '../src/modules/lease-engine/leaseLifecycleService.js';
import { verifyFileAccessPermission } from '../src/services/fileService.js';

async function auditPdfPermissions() {
  console.log('\n================================================================');
  console.log('=== AUDIT 3: LEASE PDF AUTHENTICATION & ACCESS CONTROL AUDIT ===');
  console.log('================================================================\n');

  let passed = true;

  try {
    await mongoose.connect(config.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');

    // 1. Create Test Manager & Two Different Tenants
    const managerUser = await User.create({
      firstName: 'Auth',
      lastName: 'Manager',
      email: `auth.mgr.${Date.now()}@tms.com`,
      password: 'Password123!',
      role: 'manager',
      phone: '+1 555-7700',
    });

    const tenantA = await User.create({
      firstName: 'Tenant',
      lastName: 'Alpha',
      email: `tenant.alpha.${Date.now()}@tms.com`,
      password: 'Password123!',
      role: 'tenant',
      phone: '+1 555-7701',
    });

    const tenantBDocUser = await User.create({
      firstName: 'Tenant',
      lastName: 'Beta',
      email: `tenant.beta.${Date.now()}@tms.com`,
      password: 'Password123!',
      role: 'tenant',
      phone: '+1 555-7702',
    });

    const tenantADoc = await Tenant.create({
      firstName: 'Tenant',
      lastName: 'Alpha',
      email: tenantA.email,
      phone: '+1 555-7701',
      managedBy: managerUser._id,
      address: '101 Alpha St',
    });

    const tenantBDoc = await Tenant.create({
      firstName: 'Tenant',
      lastName: 'Beta',
      email: tenantBDocUser.email,
      phone: '+1 555-7702',
      managedBy: managerUser._id,
      address: '102 Beta St',
    });

    const property = await Property.create({
      name: 'Security Test Residence 101',
      address: '101 Security St',
      city: 'Metropolis',
      zipCode: '90210',
      type: 'apartment',
      rentAmount: 3000,
      owner: managerUser._id,
      manager: managerUser._id,
    });

    const leaseA = await Lease.create({
      property: property._id,
      tenant: tenantADoc._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      rentAmount: 3000,
      depositAmount: 6000,
      status: 'active',
      createdBy: managerUser._id,
    });

    // 2. Generate PDF for Lease A
    const pdfResult = await leaseLifecycleService.dispatch('LEASE_ACTIVATED', { leaseId: leaseA._id, user: tenantA });
    const fileRecord = await FileMetadata.findById(pdfResult.fileId);

    console.log(`[Audit] Created Lease A (FileId: ${fileRecord._id}) for Tenant Alpha (${tenantA.email})\n`);

    // 3. Test 1: Tenant Alpha accesses Tenant Alpha's Lease PDF -> Allowed
    const tenantAPerm = await verifyFileAccessPermission({ userId: tenantA._id, role: 'tenant' }, fileRecord);
    if (tenantAPerm) {
      console.log('  ✓ Test 1 Passed: Tenant Alpha authorized for their own lease PDF.');
    } else {
      console.error('  ❌ Test 1 Failed: Tenant Alpha denied access to their own lease PDF.');
      passed = false;
    }

    // 4. Test 2: Tenant Beta accesses Tenant Alpha's Lease PDF -> Denied
    const tenantBPerm = await verifyFileAccessPermission({ userId: tenantBDocUser._id, role: 'tenant' }, fileRecord);
    if (!tenantBPerm) {
      console.log('  ✓ Test 2 Passed: Tenant Beta correctly DENIED access to Tenant Alpha\'s lease PDF (403 Forbidden).');
    } else {
      console.error('  ❌ Test 2 Failed: Tenant Beta improperly granted access to Tenant Alpha\'s lease PDF.');
      passed = false;
    }

    // 5. Test 3: Property Manager accesses Lease PDF -> Allowed
    const managerPerm = await verifyFileAccessPermission({ userId: managerUser._id, role: 'manager' }, fileRecord);
    if (managerPerm) {
      console.log('  ✓ Test 3 Passed: Property Manager authorized for managed lease PDF.');
    } else {
      console.error('  ❌ Test 3 Failed: Property Manager denied access to managed lease PDF.');
      passed = false;
    }

    // 6. Test 4: System Admin accesses Lease PDF -> Allowed
    const adminPerm = await verifyFileAccessPermission({ userId: new mongoose.Types.ObjectId(), role: 'admin' }, fileRecord);
    if (adminPerm) {
      console.log('  ✓ Test 4 Passed: Admin authorized for all lease PDFs.');
    } else {
      console.error('  ❌ Test 4 Failed: Admin denied access to lease PDF.');
      passed = false;
    }

    // 7. Cleanup Test Entities
    await User.findByIdAndDelete(managerUser._id);
    await User.findByIdAndDelete(tenantA._id);
    await User.findByIdAndDelete(tenantBDocUser._id);
    await Tenant.findByIdAndDelete(tenantADoc._id);
    await Tenant.findByIdAndDelete(tenantBDoc._id);
    await Property.findByIdAndDelete(property._id);
    await Lease.findByIdAndDelete(leaseA._id);
    await FileMetadata.findByIdAndDelete(fileRecord._id);
    await FileStorage.deleteOne({ filename: fileRecord.key.split('/').pop() });

    console.log('\n================================================================');
    if (passed) console.log('=== AUDIT 3 PASSED: AUTHENTICATION & ACCESS CONTROL 100% VALIDATED ===');
    else console.error('=== AUDIT 3 FAILED: PERMISSION ERRORS DETECTED ===');
    console.log('================================================================\n');

    await mongoose.disconnect();
    process.exit(passed ? 0 : 1);
  } catch (err) {
    console.error('❌ Audit 3 failed:', err);
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    process.exit(1);
  }
}

auditPdfPermissions();
