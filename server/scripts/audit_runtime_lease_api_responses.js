import mongoose from 'mongoose';
import config from '../src/config/config.js';
import Lease from '../src/models/Lease.js';
import { resolveLeaseUrls } from '../src/controllers/leaseController.js';

async function auditRuntimeLeaseApiResponses() {
  console.log('\n================================================================');
  console.log('=== RUNTIME VERIFICATION: LEASE API RESPONSE AUDIT ===');
  console.log('================================================================\n');

  try {
    await mongoose.connect(config.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');
    const leases = await Lease.find({});
    console.log(`Inspecting API serializer output for ${leases.length} leases...\n`);

    let legacyCount = 0;
    const mockReq = {
      protocol: 'http',
      headers: {},
      get: () => 'localhost:5000'
    };

    for (const lease of leases) {
      const resolved = resolveLeaseUrls(lease, mockReq);
      const jsonStr = JSON.stringify(resolved);

      if (jsonStr.includes('/uploads/')) {
        console.error(`  ❌ Legacy /uploads/ found in resolved API response for lease ${lease._id}:`);
        console.error(`     ${jsonStr}`);
        legacyCount++;
      } else {
        if (resolved.documents && resolved.documents.length > 0) {
          console.log(`  ✓ Lease ${resolved.leaseNumber || resolved._id} documents output:`);
          resolved.documents.forEach((d, i) => {
            console.log(`    [Doc ${i + 1}] fileId: ${d.fileId} | url: ${d.url}`);
          });
        }
      }
    }

    console.log(`\n================================================================`);
    if (legacyCount === 0) {
      console.log('=== RUNTIME AUDIT 100% PASSED: ZERO /uploads/ PATHS RETURNED BY LEASE API ===');
    } else {
      console.error(`=== RUNTIME AUDIT FAILED: ${legacyCount} LEASES CONTAIN /uploads/ PATHS ===`);
    }
    console.log('================================================================\n');

    await mongoose.disconnect();
    process.exit(legacyCount === 0 ? 0 : 1);
  } catch (err) {
    console.error('Runtime audit error:', err);
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    process.exit(1);
  }
}

auditRuntimeLeaseApiResponses();
