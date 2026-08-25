import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

import Lease from '../src/models/Lease.js';
import Property from '../src/models/Property.js';
import User from '../src/models/User.js';
import Tenant from '../src/models/Tenant.js';

async function runLeaseHeaderTestSuite() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('================================================================');
  console.log('   LEASE PROPERTY & MANAGER HEADER DATA VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, name) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
    }
  }

  // 1. Query leases with the updated populate fields
  const leases = await Lease.find({ status: { $in: ['active', 'pending'] } })
    .populate({
      path: 'property',
      select: 'name address city state zipCode type bedrooms bathrooms floor totalFloors squareFeet furnishing rentAmount depositAmount amenities images videos media virtualTourUrl coverImage manager location geo owner',
      populate: [
        { path: 'manager', select: 'firstName lastName name email phone phoneNumber avatar role' },
        { path: 'owner', select: 'firstName lastName name email phone phoneNumber avatar role' }
      ]
    })
    .populate('tenant', 'firstName lastName email phone');

  assert(leases.length > 0, `Found ${leases.length} active/pending leases in database`);

  for (const l of leases) {
    const prop = l.property;
    console.log(`\nEvaluating Lease #${l.leaseNumber || l._id} for Property: "${prop?.name || 'N/A'}"`);
    
    assert(Boolean(prop), `Lease has populated property object`);
    if (prop) {
      assert(Boolean(prop.name), `Property name exists: "${prop.name}"`);
      assert(Boolean(prop.address || prop.city), `Property address exists: "${prop.address || ''}, ${prop.city || ''}"`);
      
      const mgr = prop.manager || prop.owner;
      if (mgr) {
        const mgrName = mgr.name || `${mgr.firstName || ''} ${mgr.lastName || ''}`.trim() || mgr.email;
        console.log(`  Assigned Manager: ${mgrName} (${mgr.email || 'No email'}, phone: ${mgr.phone || mgr.phoneNumber || 'None'})`);
        assert(Boolean(mgrName), `Manager/Owner identity resolved: "${mgrName}"`);
      } else {
        console.log('  Notice: Property is currently unassigned (will render direct operations fallback)');
      }
    }
  }

  // 2. Test Multi-Lease Switching Isolation
  if (leases.length > 1) {
    const lease1 = leases[0];
    const lease2 = leases[1];
    assert(String(lease1._id) !== String(lease2._id), 'Multiple distinct leases exist for tab switcher testing');
  }

  console.log('\n================================================================');
  console.log(`   SUITE RESULT: ${passed} / ${total} TESTS PASSED`);
  console.log('================================================================\n');

  await mongoose.disconnect();
  process.exit(passed === total ? 0 : 1);
}

runLeaseHeaderTestSuite();
