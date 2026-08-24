import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

import Property from '../src/models/Property.js';
import User from '../src/models/User.js';
import { getPublicPropertyFilter, isPropertyPubliclyVisible } from '../src/utils/propertyVisibility.js';

async function testVisibility() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('--- RUNNING PUBLIC PROPERTY VISIBILITY TESTS ---\n');

  // Test 1: Public filter returns only legitimate properties
  const publicFilter = await getPublicPropertyFilter();
  const publicProps = await Property.find(publicFilter).populate('manager owner');
  console.log(`[TEST 1] Publicly discoverable properties count: ${publicProps.length}`);
  const hasTestProp = publicProps.some(p => p.isTest || p.publishStatus !== 'published' || p.name.includes('Property A (With Maintenance)'));
  console.log(`[TEST 1 PASS] Test properties present in public query: ${hasTestProp ? 'FAIL (Found test props)' : 'PASS (0 test props found)'}`);

  // Test 2: Individual property visibility check
  const allProps = await Property.find({}).populate('manager owner');
  console.log(`\n[TEST 2] Total properties in DB: ${allProps.length}`);
  for (const p of allProps) {
    const isVisible = isPropertyPubliclyVisible(p);
    console.log(`  - [${p.name}]: isVisible = ${isVisible} (isTest: ${p.isTest}, publishStatus: ${p.publishStatus})`);
  }

  // Test 3: Search with test terms cannot return test properties
  const searchFilter = await getPublicPropertyFilter({
    $or: [
      { name: { $regex: 'Property A', $options: 'i' } },
      { address: { $regex: 'Property A', $options: 'i' } }
    ]
  });
  const searchResults = await Property.find(searchFilter);
  console.log(`\n[TEST 3] Search for 'Property A' returned: ${searchResults.length} properties (Expected: 0)`);
  console.log(`[TEST 3 PASS] ${searchResults.length === 0 ? 'PASS' : 'FAIL'}`);

  await mongoose.disconnect();
  console.log('\n--- ALL VISIBILITY TESTS COMPLETE ---');
}

testVisibility();
