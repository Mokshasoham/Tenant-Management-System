import mongoose from 'mongoose';
import config from '../src/config/config.js';
import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import Tenant from '../src/models/Tenant.js';
import Lease from '../src/models/Lease.js';
import FileMetadata from '../src/models/FileMetadata.js';
import FileStorage from '../src/models/FileStorage.js';
import { generateAndStoreLeasePDF } from '../src/modules/lease-engine/leaseDocumentService.js';

async function auditPdfPerformance() {
  console.log('\n================================================================');
  console.log('=== AUDIT 10: 100 SEQUENTIAL PDF GENERATION PERFORMANCE BENCHMARK ===');
  console.log('================================================================\n');

  try {
    await mongoose.connect(config.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');

    const managerUser = await User.create({
      firstName: 'Perf',
      lastName: 'Manager',
      email: `perf.mgr.${Date.now()}@tms.com`,
      password: 'Password123!',
      role: 'manager',
      phone: '+1 555-9911',
    });

    const tenantUser = await User.create({
      firstName: 'Perf',
      lastName: 'Tenant',
      email: `perf.tenant.${Date.now()}@tms.com`,
      password: 'Password123!',
      role: 'tenant',
      phone: '+1 555-9912',
    });

    const tenantDoc = await Tenant.create({
      firstName: 'Perf',
      lastName: 'Tenant',
      email: tenantUser.email,
      phone: '+1 555-9912',
      managedBy: managerUser._id,
      address: '999 Benchmark Way',
    });

    const property = await Property.create({
      name: 'Perf Tower Suite 100',
      address: '999 Benchmark Way',
      city: 'Metropolis',
      zipCode: '90210',
      type: 'apartment',
      rentAmount: 5000,
      owner: managerUser._id,
      manager: managerUser._id,
    });

    const lease = await Lease.create({
      property: property._id,
      tenant: tenantDoc._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      rentAmount: 5000,
      depositAmount: 10000,
      status: 'active',
      createdBy: managerUser._id,
    });

    console.log(`[Perf Benchmark] Target Lease ID: ${lease._id} (${lease.leaseNumber})\n`);

    const initialHeap = process.memoryUsage().heapUsed / 1024 / 1024;
    const startTime = Date.now();
    const count = 100;
    const generatedIds = [];

    console.log(`Executing ${count} sequential PDF generations...`);

    for (let i = 1; i <= count; i++) {
      const res = await generateAndStoreLeasePDF({
        leaseId: lease._id,
        user: managerUser,
        forceRegenerate: true,
      });
      generatedIds.push(res.fileId);
      if (i % 25 === 0) {
        const currHeap = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(`  Progress: ${i}/${count} PDFs generated. Current Heap: ${currHeap.toFixed(2)} MB`);
      }
    }

    const endTime = Date.now();
    const finalHeap = process.memoryUsage().heapUsed / 1024 / 1024;
    const totalDurationMs = endTime - startTime;
    const avgDurationMs = (totalDurationMs / count).toFixed(2);
    const heapDiffMB = (finalHeap - initialHeap).toFixed(2);

    console.log('\n[Benchmark Summary]');
    console.log(`  ✓ Total Generation Time: ${totalDurationMs} ms (${(totalDurationMs / 1000).toFixed(2)} s)`);
    console.log(`  ✓ Average Time Per PDF: ${avgDurationMs} ms`);
    console.log(`  ✓ Initial Heap: ${initialHeap.toFixed(2)} MB`);
    console.log(`  ✓ Final Heap: ${finalHeap.toFixed(2)} MB`);
    console.log(`  ✓ Heap Growth: ${heapDiffMB} MB`);

    // Cleanup Benchmark Items
    console.log('\nCleaning up benchmark database records...');
    await User.findByIdAndDelete(managerUser._id);
    await User.findByIdAndDelete(tenantUser._id);
    await Tenant.findByIdAndDelete(tenantDoc._id);
    await Property.findByIdAndDelete(property._id);
    await Lease.findByIdAndDelete(lease._id);
    await FileMetadata.deleteMany({ relatedEntity: lease._id });
    for (const fId of generatedIds) {
      const meta = await FileMetadata.findById(fId);
      if (meta) {
        await FileStorage.deleteOne({ filename: meta.key.split('/').pop() });
      }
    }
    await FileStorage.deleteMany({ filename: { $regex: lease.leaseNumber } });

    console.log('\n================================================================');
    console.log('=== AUDIT 10 PASSED: 100 PDF PERFORMANCE BENCHMARK SUCCESSFUL ===');
    console.log('================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Audit 10 failed:', err);
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    process.exit(1);
  }
}

auditPdfPerformance();
