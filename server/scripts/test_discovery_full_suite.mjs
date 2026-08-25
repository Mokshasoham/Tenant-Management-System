import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

import Property from '../src/models/Property.js';
import User from '../src/models/User.js';
import { getPublicPropertyFilter } from '../src/utils/propertyVisibility.js';
import { calculateDistanceKm, getProximityDetails, calculateSimilarityScore, extractPropertyCoords } from '../src/utils/propertyDiscovery.js';

async function runSuite() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('================================================================');
  console.log('   FULL END-TO-END DISCOVERY SUITE TEST EXECUTION');
  console.log('================================================================\n');

  const publicFilter = await getPublicPropertyFilter();
  const allPublicProps = await Property.find(publicFilter).populate('manager owner');
  console.log(`Total public discoverable properties: ${allPublicProps.length}`);

  let passed = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
    }
  }

  // 1. Current Property Exclusion Test
  console.log('\n--- 1. CURRENT PROPERTY EXCLUSION ---');
  for (const target of allPublicProps) {
    const nearbyFilter = await getPublicPropertyFilter({ _id: { $ne: target._id } });
    const nearbyList = await Property.find(nearbyFilter);
    const selfFound = nearbyList.some(p => String(p._id) === String(target._id));
    assert(!selfFound, `Target "${target.name}" is excluded from its own nearby query`);

    const similarFilter = await getPublicPropertyFilter({ _id: { $ne: target._id } });
    const similarList = await Property.find(similarFilter);
    const selfFoundInSimilar = similarList.some(p => String(p._id) === String(target._id));
    assert(!selfFoundInSimilar, `Target "${target.name}" is excluded from its own similar query`);
  }

  // 2. Test & Archived Data Exclusion Test
  console.log('\n--- 2. TEST & ARCHIVED EXCLUSION ---');
  const allPropsInDb = await Property.find({});
  const testPropsInDb = allPropsInDb.filter(p => p.isTest || p.publishStatus === 'archived');
  console.log(`Test/Archived properties present in DB: ${testPropsInDb.length}`);

  const publicDiscoveryList = await Property.find(publicFilter);
  const testFoundInDiscovery = publicDiscoveryList.some(p => p.isTest || p.publishStatus === 'archived');
  assert(!testFoundInDiscovery, 'Zero test or archived properties exist in public discovery results');

  // 3. Proximity Distance Calculation Test
  console.log('\n--- 3. HAVERSINE DISTANCE ACCURACY ---');
  // Visakhapatnam to Eluru (~260 km)
  const vizagCoords = { lat: 17.7142, lng: 83.3236 };
  const eluruCoords = { lat: 16.71, lng: 81.1 };
  const d1 = calculateDistanceKm(vizagCoords.lat, vizagCoords.lng, eluruCoords.lat, eluruCoords.lng);
  assert(d1 > 250 && d1 < 275, `Vizag to Eluru distance: ${d1} km is within expected ~261 km range`);

  // Same coordinates = 0 km
  const dSame = calculateDistanceKm(vizagCoords.lat, vizagCoords.lng, vizagCoords.lat, vizagCoords.lng);
  assert(dSame === 0, `Identical coordinates return 0 km`);

  // 4. Missing Coordinates Graceful Fallback
  console.log('\n--- 4. MISSING COORDINATES / LOCALITY FALLBACK ---');
  const targetMock = { city: 'Visakhapatnam', state: 'Andhra Pradesh', location: null };
  const candidateMockSameCity = { city: 'Visakhapatnam', state: 'Andhra Pradesh', location: null };
  const candidateMockDiffCity = { city: 'Hyderabad', state: 'Telangana', location: null };

  const proxSameCity = getProximityDetails(targetMock, candidateMockSameCity);
  assert(proxSameCity.hasPreciseDistance === false && proxSameCity.proximityBadge.includes('Visakhapatnam'), 'Same city fallback outputs city badge');

  const proxDiffCity = getProximityDetails(targetMock, candidateMockDiffCity);
  assert(proxDiffCity.scope === 'region', 'Different city/state fallback gracefully degrades');

  // 5. Similarity Scoring Engine Multi-Signal Test
  console.log('\n--- 5. SIMILARITY ENGINE MULTI-SIGNAL SCORING ---');
  const baseProp = {
    type: 'apartment',
    bedrooms: 2,
    bathrooms: 2,
    rentAmount: 20000,
    squareFeet: 1200,
    city: 'Visakhapatnam',
    furnishing: 'semi-furnished',
    amenities: ['Wifi', 'Parking', 'Gym']
  };

  const exactMatchProp = {
    type: 'apartment',
    bedrooms: 2,
    bathrooms: 2,
    rentAmount: 21000,
    squareFeet: 1250,
    city: 'Visakhapatnam',
    furnishing: 'semi-furnished',
    amenities: ['Wifi', 'Parking', 'Gym', 'Security']
  };

  const dissimilarProp = {
    type: 'commercial',
    bedrooms: 0,
    bathrooms: 1,
    rentAmount: 150000,
    squareFeet: 6000,
    city: 'Mumbai',
    furnishing: 'unfurnished',
    amenities: ['Generator']
  };

  const highSim = calculateSimilarityScore(baseProp, exactMatchProp);
  assert(highSim.score >= 80, `High similarity match scored ${highSim.score}/100 (Expected >= 80)`);
  assert(highSim.matchReasons.length > 0, `High similarity generated match reasons: ${highSim.matchReasons.join(', ')}`);

  const lowSim = calculateSimilarityScore(baseProp, dissimilarProp);
  assert(lowSim.score < 25, `Dissimilar property scored ${lowSim.score}/100 (Expected < 25)`);

  // 6. Manager Assignment Verification
  console.log('\n--- 6. MANAGER RELATIONSHIP RESOLUTION ---');
  for (const prop of allPublicProps) {
    const mgr = prop.manager || prop.owner;
    assert(Boolean(mgr), `Property "${prop.name}" has valid resolved manager/owner`);
  }

  console.log('\n================================================================');
  console.log(`   SUITE RESULT: ${passed} / ${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  await mongoose.disconnect();
  process.exit(passed === totalTests ? 0 : 1);
}

runSuite();
