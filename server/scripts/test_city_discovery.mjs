import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

import Property from '../src/models/Property.js';
import { getPublicPropertyFilter } from '../src/utils/propertyVisibility.js';

async function runCityTests() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('================================================================');
  console.log('   CITY DISCOVERY BACKEND FILTER VERIFICATION');
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

  // 1. Phagwara City Query
  const phagwaraFilter = await getPublicPropertyFilter({ city: { $regex: 'phagwara', $options: 'i' } });
  const phagwaraProps = await Property.find(phagwaraFilter);
  console.log(`Phagwara query returned: ${phagwaraProps.length} properties`);
  assert(phagwaraProps.length === 1 && phagwaraProps[0].name === 'Swaraj Villa', 'Phagwara query returns exactly Swaraj Villa');
  assert(phagwaraProps.every(p => p.city.toLowerCase() === 'phagwara'), 'All returned properties have city="phagwara"');

  // 2. Visakhapatnam City Query
  const vizagFilter = await getPublicPropertyFilter({ city: { $regex: 'visakhapatnam', $options: 'i' } });
  const vizagProps = await Property.find(vizagFilter);
  console.log(`Visakhapatnam query returned: ${vizagProps.length} properties`);
  assert(vizagProps.length === 1 && vizagProps[0].name === 'Ocean Pearl Residency', 'Vizag query returns exactly Ocean Pearl Residency');

  // 3. Eluru City Query
  const eluruFilter = await getPublicPropertyFilter({ city: { $regex: 'eluru', $options: 'i' } });
  const eluruProps = await Property.find(eluruFilter);
  console.log(`Eluru query returned: ${eluruProps.length} properties`);
  assert(eluruProps.length === 3, 'Eluru query returns 3 real properties');

  // 4. Non-existent City Query
  const tokyoFilter = await getPublicPropertyFilter({ city: { $regex: 'tokyo', $options: 'i' } });
  const tokyoProps = await Property.find(tokyoFilter);
  console.log(`Tokyo query returned: ${tokyoProps.length} properties`);
  assert(tokyoProps.length === 0, 'Non-existent city returns 0 properties without crashing');

  // 5. Public visibility enforcement
  const allCityProps = [...phagwaraProps, ...vizagProps, ...eluruProps];
  assert(allCityProps.every(p => !p.isTest && !p.isInternal && p.publishStatus === 'published'), 'Zero test/internal properties leaked in city queries');

  console.log('\n================================================================');
  console.log(`   CITY TEST RESULT: ${passed} / ${total} TESTS PASSED`);
  console.log('================================================================\n');

  await mongoose.disconnect();
  process.exit(passed === total ? 0 : 1);
}

runCityTests();
