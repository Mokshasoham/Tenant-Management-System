import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

import Property from '../src/models/Property.js';
import User from '../src/models/User.js';

async function runSaveLifecycleTest() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('================================================================');
  console.log('   SAVE / UNSAVE (FAVORITE) BACKEND LIFECYCLE VERIFICATION');
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

  // Find a tenant
  const tenant = await User.findOne({ role: 'tenant' });
  assert(Boolean(tenant), 'Found active tenant for test');
  const tenantId = tenant._id;

  // Find 2 distinct public properties
  const props = await Property.find({ isTest: { $ne: true }, isInternal: { $ne: true } }).limit(2);
  assert(props.length >= 2, 'Found at least 2 public properties');
  const propA = props[0];
  const propB = props[1];

  console.log(`Testing with Tenant: ${tenant.email}`);
  console.log(`Property A: ${propA.name} (${propA._id})`);
  console.log(`Property B: ${propB.name} (${propB._id})`);

  // Clean initial state for these 2 properties
  await Property.updateOne({ _id: propA._id }, { $pull: { savedBy: tenantId } });
  await Property.updateOne({ _id: propB._id }, { $pull: { savedBy: tenantId } });

  // 1. Save Property A
  await Property.updateOne({ _id: propA._id }, { $addToSet: { savedBy: tenantId } });
  const checkA1 = await Property.findById(propA._id);
  const checkB1 = await Property.findById(propB._id);
  assert(checkA1.savedBy.some(id => String(id) === String(tenantId)), 'Property A is saved');
  assert(!checkB1.savedBy.some(id => String(id) === String(tenantId)), 'Property B is NOT saved (independent state)');

  // 2. Save Property B
  await Property.updateOne({ _id: propB._id }, { $addToSet: { savedBy: tenantId } });
  const checkA2 = await Property.findById(propA._id);
  const checkB2 = await Property.findById(propB._id);
  assert(checkA2.savedBy.some(id => String(id) === String(tenantId)), 'Property A remains saved');
  assert(checkB2.savedBy.some(id => String(id) === String(tenantId)), 'Property B is now saved');

  // 3. Unsave Property A
  await Property.updateOne({ _id: propA._id }, { $pull: { savedBy: tenantId } });
  const checkA3 = await Property.findById(propA._id);
  const checkB3 = await Property.findById(propB._id);
  assert(!checkA3.savedBy.some(id => String(id) === String(tenantId)), 'Property A is unsaved');
  assert(checkB3.savedBy.some(id => String(id) === String(tenantId)), 'Property B remains saved independently');

  // 4. Saved-only query
  const savedProps = await Property.find({ savedBy: tenantId });
  assert(savedProps.some(p => String(p._id) === String(propB._id)), 'Saved query includes Property B');
  assert(!savedProps.some(p => String(p._id) === String(propA._id)), 'Saved query excludes unsaved Property A');

  console.log('\n================================================================');
  console.log(`   SAVE TEST RESULT: ${passed} / ${total} TESTS PASSED`);
  console.log('================================================================\n');

  await mongoose.disconnect();
  process.exit(passed === total ? 0 : 1);
}

runSaveLifecycleTest();
