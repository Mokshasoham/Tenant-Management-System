import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

import Property from '../src/models/Property.js';
import User from '../src/models/User.js';
import { getPublicPropertyFilter } from '../src/utils/propertyVisibility.js';
import { calculateDistanceKm, getProximityDetails, calculateSimilarityScore } from '../src/utils/propertyDiscovery.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('--- TESTING PROPERTY DISCOVERY & SIMILARITY ENGINES ---\n');

  const publicFilter = await getPublicPropertyFilter();
  const properties = await Property.find(publicFilter).populate('owner manager');
  console.log(`Found ${properties.length} public properties in database.`);

  const oceanPearl = properties.find(p => p.name === 'Ocean Pearl Residency');
  const mokshaApt = properties.find(p => p.name === "moksha's apartment");
  const swarajVilla = properties.find(p => p.name === 'Swaraj Villa');

  if (oceanPearl && mokshaApt) {
    const dist = calculateDistanceKm(
      oceanPearl.location?.lat,
      oceanPearl.location?.lng,
      mokshaApt.location?.lat,
      mokshaApt.location?.lng
    );
    console.log(`\n[DISTANCE TEST] Ocean Pearl (Vizag) -> Moksha Apt (Eluru): ${dist} km`);

    const prox = getProximityDetails(oceanPearl, mokshaApt);
    console.log('[PROXIMITY TEST] Proximity Details:', prox);

    const sim = calculateSimilarityScore(oceanPearl, mokshaApt);
    console.log('[SIMILARITY TEST] Ocean Pearl vs Moksha Apt Similarity:', sim);
  }

  if (mokshaApt) {
    console.log(`\n--- ALL CANDIDATES SIMILARITY TO "${mokshaApt.name}" (${mokshaApt.bedrooms} BHK, ₹${mokshaApt.rentAmount}, ${mokshaApt.city}) ---`);
    for (const cand of properties) {
      if (String(cand._id) === String(mokshaApt._id)) continue;
      const sim = calculateSimilarityScore(mokshaApt, cand);
      const prox = getProximityDetails(mokshaApt, cand);
      console.log(`  - [${cand.name}] (${cand.bedrooms} BHK, ₹${cand.rentAmount}, ${cand.city}): Score: ${sim.score}/100 | Reasons: ${sim.matchReasons.join(' • ')} | Distance: ${prox.distanceText}`);
    }
  }

  await mongoose.disconnect();
  console.log('\n--- TESTS COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

run();
