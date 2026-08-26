import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import propertyRoutes from '../src/routes/propertyRoutes.js';

const PORT = 5996;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function runTests() {
  console.log('--- STARTING MAP BROWSE PROPERTY FILTERS E2E TESTS ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');

  // Setup express test server
  const app = express();
  app.use(express.json());
  app.use('/api/properties', propertyRoutes);

  app.use((err, req, res, next) => {
    console.error('Express test server error:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Internal Server Error'
    });
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, '127.0.0.1', () => resolve(s));
  });

  console.log(`✓ Test Express server listening on http://127.0.0.1:${PORT}\n`);

  const createdProps = [];
  const testUsers = [];

  try {
    // 1. Create a test owner/manager
    const testOwner = await User.create({
      firstName: 'MapTest',
      lastName: 'Manager',
      email: `maptest_${Date.now()}@tms.local`,
      password: 'Password123!',
      role: 'manager',
      isEmailVerified: true
    });
    testUsers.push(testOwner);

    // 2. Create test properties across different states, cities, types, and coordinates
    const testData = [
      {
        name: 'Prestige Lakeside Flat ' + Date.now(),
        type: 'apartment',
        rentAmount: 35000,
        depositAmount: 70000,
        address: 'Whitefield',
        city: 'Bengaluru',
        state: 'Karnataka',
        location: { lat: 12.9716, lng: 77.5946 },
        status: 'available',
        owner: testOwner._id,
        manager: testOwner._id,
      },
      {
        name: 'Palm Meadows Villa ' + Date.now(),
        type: 'villa',
        rentAmount: 65000,
        depositAmount: 130000,
        address: 'R.R. Peta',
        city: 'Eluru',
        state: 'Andhra Pradesh',
        location: { lat: 16.7107, lng: 81.0952 },
        status: 'available',
        owner: testOwner._id,
        manager: testOwner._id,
      },
      {
        name: 'Swaraj Independent House ' + Date.now(),
        type: 'house',
        rentAmount: 25000,
        depositAmount: 50000,
        address: 'GT Road',
        city: 'Phagwara',
        state: 'Punjab',
        location: { lat: 31.2240, lng: 75.7708 },
        status: 'available',
        owner: testOwner._id,
        manager: testOwner._id,
      },
      {
        name: 'Ocean Pearl Commercial Complex ' + Date.now(),
        type: 'shop',
        rentAmount: 85000,
        depositAmount: 170000,
        address: 'Beach Road',
        city: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        location: { lat: 17.6868, lng: 83.2185 },
        status: 'available',
        owner: testOwner._id,
        manager: testOwner._id,
      },
      {
        name: 'Greenfield Agricultural Plot ' + Date.now(),
        type: 'land',
        rentAmount: 15000,
        depositAmount: 30000,
        address: 'Kalyan Highway',
        city: 'Pune',
        state: 'Maharashtra',
        location: { lat: 18.5204, lng: 73.8567 },
        status: 'available',
        owner: testOwner._id,
        manager: testOwner._id,
      },
      {
        name: 'Property Without Map Coordinates ' + Date.now(),
        type: 'apartment',
        rentAmount: 20000,
        depositAmount: 40000,
        address: 'No GPS Lane',
        city: 'Bengaluru',
        state: 'Karnataka',
        location: { lat: 0, lng: 0 },
        geo: { type: 'Point', coordinates: [0, 0] },
        status: 'available',
        owner: testOwner._id,
        manager: testOwner._id,
      }
    ];

    for (const d of testData) {
      const prop = await Property.create(d);
      createdProps.push(prop);
    }
    console.log(`✓ Seeded ${createdProps.length} test properties across Karnataka, Andhra Pradesh, Punjab, Maharashtra\n`);

    // Helper request function
    async function apiGet(path) {
      const res = await fetch(`${BASE_URL}${path}`);
      const json = await res.json();
      return { status: res.status, data: json.data || json };
    }

    // ── Test 1: Fetch All (Unfiltered) ──
    console.log('[Test 1] Testing ALL / Unfiltered query...');
    const allRes = await apiGet('/properties?limit=50');
    if (!Array.isArray(allRes.data) || allRes.data.length < 6) {
      throw new Error(`Expected at least 6 properties, got ${allRes.data?.length}`);
    }
    console.log(`✓ ALL returned ${allRes.data.length} properties.`);

    // ── Test 2: Type Filter - Apartment / Flat ──
    console.log('\n[Test 2] Testing APARTMENT type query (normalized apartment/flat/studio)...');
    const aptRes = await apiGet('/properties?type=apartment&limit=50');
    const aptList = aptRes.data;
    const allApt = aptList.every(p => ['apartment', 'flat', 'studio'].includes(p.type));
    if (!allApt) {
      throw new Error(`Expected all results to be apartment/flat/studio, but found non-matching types`);
    }
    console.log(`✓ Apartment query returned ${aptList.length} properties, all valid apartment types.`);

    // ── Test 3: Type Filter - House / Villa ──
    console.log('\n[Test 3] Testing HOUSE / VILLA type query...');
    const houseRes = await apiGet('/properties?type=house&limit=50');
    const houseList = houseRes.data;
    const allHouse = houseList.every(p => ['house', 'villa'].includes(p.type));
    if (!allHouse) {
      throw new Error(`Expected all results to be house or villa`);
    }
    console.log(`✓ House query returned ${houseList.length} properties, including villa.`);

    // ── Test 4: Type Filter - Commercial / Shop ──
    console.log('\n[Test 4] Testing COMMERCIAL / SHOP type query...');
    const commRes = await apiGet('/properties?type=commercial&limit=50');
    const commList = commRes.data;
    const allComm = commList.every(p => ['commercial', 'shop'].includes(p.type));
    if (!allComm) {
      throw new Error(`Expected all results to be commercial or shop`);
    }
    console.log(`✓ Commercial query returned ${commList.length} properties, including shop.`);

    // ── Test 5: State & City Location Query ──
    console.log('\n[Test 5] Testing State & City query...');
    const kaRes = await apiGet('/properties?state=Karnataka&limit=50');
    const allKa = kaRes.data.every(p => p.state?.toLowerCase() === 'karnataka');
    if (!allKa) throw new Error('Expected all properties to be in Karnataka');
    console.log(`✓ State Karnataka returned ${kaRes.data.length} properties.`);

    const eluruRes = await apiGet('/properties?city=Eluru&limit=50');
    const allEluru = eluruRes.data.every(p => p.city?.toLowerCase() === 'eluru');
    if (!allEluru) throw new Error('Expected all properties to be in Eluru');
    console.log(`✓ City Eluru returned ${eluruRes.data.length} properties.`);

    // ── Test 6: Combined Type + Location Filter (AND logic) ──
    console.log('\n[Test 6] Testing Combined Type + Location (AND logic)...');
    const combinedRes = await apiGet('/properties?type=house&state=Andhra%20Pradesh&city=Eluru&limit=50');
    if (combinedRes.data.length === 0) {
      throw new Error('Expected at least 1 property for House in Eluru, Andhra Pradesh');
    }
    const match = combinedRes.data[0];
    if (match.city !== 'Eluru' || match.state !== 'Andhra Pradesh' || !['house', 'villa'].includes(match.type)) {
      throw new Error('Property does not match combined type and location filter');
    }
    console.log(`✓ Combined filter returned: "${match.name}" in ${match.city}, ${match.state} (Type: ${match.type})`);

    // ── Test 7: Search Query Filter ──
    console.log('\n[Test 7] Testing Free-text Search...');
    const searchRes = await apiGet('/properties?search=Swaraj&limit=50');
    if (searchRes.data.length === 0 || !searchRes.data[0].name.includes('Swaraj')) {
      throw new Error('Expected to find Swaraj property via search');
    }
    console.log(`✓ Search "Swaraj" found "${searchRes.data[0].name}" in ${searchRes.data[0].city}`);

    console.log('\n🎉 ALL 7 E2E INTEGRATION & FILTER TESTS PASSED SUCCESSFULLY! 🚀');

  } finally {
    // Clean up test data
    console.log('\nCleaning up test properties and users...');
    for (const p of createdProps) {
      await Property.findByIdAndDelete(p._id);
    }
    for (const u of testUsers) {
      await User.findByIdAndDelete(u._id);
    }
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.close();
    console.log('✓ Cleanup complete.');
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
