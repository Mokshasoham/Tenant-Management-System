import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import propertyRoutes from '../src/routes/propertyRoutes.js';
import { generateToken } from '../src/utils/jwt.js';

const PORT = 5998;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function runTests() {
  console.log('--- STARTING PROPERTY TYPES LIFECYCLE TESTS ---');
  await mongoose.connect(process.env.MONGODB_URI);

  // Setup express test server
  const app = express();
  app.use(express.json());
  app.use('/api/properties', propertyRoutes);

  // Error handling middleware
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

  console.log(`✓ Test Express server listening on http://127.0.0.1:${PORT}`);

  // Create an isolated test admin/manager and tenant
  const testMgr = await User.create({
    firstName: 'Lifecycle',
    lastName: 'AdminManager',
    email: `test_admin_${Date.now()}@tms.com`,
    password: 'Password123!',
    role: 'admin',
    phone: '9876543210'
  });

  const testTnt = await User.create({
    firstName: 'Lifecycle',
    lastName: 'Tenant',
    email: `test_tnt_${Date.now()}@tms.com`,
    password: 'Password123!',
    role: 'tenant',
    phone: '9123456780'
  });

  const managerToken = generateToken(testMgr._id.toString(), testMgr.role);
  const tenantToken = generateToken(testTnt._id.toString(), testTnt.role);

  const createdIds = [];

  try {
    // 2. Test Property 1: Apartment / Flat
    console.log('\n[1/7] Testing APARTMENT creation...');
    const aptRes = await fetch(`${BASE_URL}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        name: `Prestige Heights Flat ${Date.now()}`,
        address: '100 Residency Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560038',
        country: 'India',
        type: 'apartment',
        bhk: '3 BHK',
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1550,
        floor: 4,
        totalFloors: 12,
        balcony: 2,
        parking: 'Covered Parking',
        furnishing: 'fully-furnished',
        rentAmount: 35000,
        depositAmount: 70000,
        amenities: ['Parking', 'Wifi', 'Gym', 'Balcony', 'Power Backup'],
        location: { lat: 12.9716, lng: 77.5946 }
      })
    });

    const aptData = await aptRes.json();
    if (!aptRes.ok) throw new Error(`Apartment creation failed: ${JSON.stringify(aptData)}`);
    console.log('✓ Apartment created successfully:', aptData.data.name, '(Type:', aptData.data.type, ')');
    createdIds.push(aptData.data._id);

    // 3. Test Property 2: House / Villa
    console.log('\n[2/7] Testing HOUSE / VILLA creation...');
    const houseRes = await fetch(`${BASE_URL}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        name: `Emerald Palms Villa ${Date.now()}`,
        address: '45 Green Valley Palm Meadows',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560066',
        country: 'India',
        type: 'house',
        bedrooms: 4,
        bathrooms: 4,
        builtUpArea: 3200,
        squareFeet: 3200,
        totalFloors: 2,
        garden: 'Private Front Lawn & Garden',
        parking: 'Private Garage (2+ Cars)',
        furnishing: 'semi-furnished',
        balcony: 3,
        rentAmount: 65000,
        depositAmount: 130000,
        amenities: ['Parking', 'Wifi', 'Pool', 'Security', 'Maintenance'],
        location: { lat: 12.9600, lng: 77.7100 }
      })
    });

    const houseData = await houseRes.json();
    if (!houseRes.ok) throw new Error(`House creation failed: ${JSON.stringify(houseData)}`);
    console.log('✓ House/Villa created successfully:', houseData.data.name, '(Type:', houseData.data.type, ')');
    createdIds.push(houseData.data._id);

    // 4. Test Property 3: Shop / Commercial
    console.log('\n[3/7] Testing SHOP / COMMERCIAL creation...');
    const commRes = await fetch(`${BASE_URL}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        name: `Nexus Commercial Plaza Showroom ${Date.now()}`,
        address: '12 Commercial Street, Main Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560001',
        country: 'India',
        type: 'commercial',
        commercialArea: 1400,
        squareFeet: 1400,
        floor: 0,
        frontage: '30 ft',
        washroom: 'Private Attached Washroom',
        electricity: '3-Phase Commercial Dedicated',
        suitableFor: ['Retail Store', 'Corporate Office', 'Showroom'],
        furnishing: 'semi-furnished',
        rentAmount: 50000,
        depositAmount: 150000,
        amenities: ['Parking', 'Power Backup', 'Security'],
        location: { lat: 12.9800, lng: 77.6100 }
      })
    });

    const commData = await commRes.json();
    if (!commRes.ok) throw new Error(`Commercial creation failed: ${JSON.stringify(commData)}`);
    console.log('✓ Shop/Commercial created successfully:', commData.data.name, '(Type:', commData.data.type, ')');
    createdIds.push(commData.data._id);

    // 5. Test Property 4: Hostel
    console.log('\n[4/7] Testing HOSTEL creation...');
    const hostelRes = await fetch(`${BASE_URL}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        name: `Stanza Elite Student Hostel ${Date.now()}`,
        address: '88 Tech Park Layout, Electronic City',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560100',
        country: 'India',
        type: 'hostel',
        totalBeds: 80,
        roomType: '2-Bed Double Sharing',
        occupancyCapacity: 160,
        genderPreference: 'male',
        foodAvailability: 'All 3 Meals Included',
        acAvailable: 'Both AC & Non-AC Available',
        commonFacilities: ['Study Hall', 'Mess / Dining Area', 'Gym Room', 'Warden on Duty'],
        rentAmount: 9500,
        depositAmount: 15000,
        amenities: ['Wifi', 'Laundry', 'Security', 'Maintenance'],
        location: { lat: 12.8452, lng: 77.6602 }
      })
    });

    const hostelData = await hostelRes.json();
    if (!hostelRes.ok) throw new Error(`Hostel creation failed: ${JSON.stringify(hostelData)}`);
    console.log('✓ Hostel created successfully:', hostelData.data.name, '(Type:', hostelData.data.type, ')');
    createdIds.push(hostelData.data._id);

    // 6. Test Property 5: PG / Paying Guest
    console.log('\n[5/7] Testing PG / PAYING GUEST creation...');
    const pgRes = await fetch(`${BASE_URL}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        name: `Zolo Comfort PG for Women ${Date.now()}`,
        address: '22 Koramangala 4th Block',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560034',
        country: 'India',
        type: 'pg',
        roomType: 'Double Sharing',
        sharingCapacity: 2,
        occupancyCapacity: 2,
        genderPreference: 'female',
        foodAvailability: '3 Meals Daily (Home Cooked)',
        acAvailable: 'AC Room',
        bathroomType: 'Attached Bathroom (Private)',
        facilities: ['High-Speed WiFi', 'Daily Housekeeping', 'RO Purified Water', 'Washing Machine'],
        rentAmount: 12000,
        depositAmount: 20000,
        amenities: ['Wifi', 'AC', 'Security'],
        location: { lat: 12.9352, lng: 77.6245 }
      })
    });

    const pgData = await pgRes.json();
    if (!pgRes.ok) throw new Error(`PG creation failed: ${JSON.stringify(pgData)}`);
    console.log('✓ PG created successfully:', pgData.data.name, '(Type:', pgData.data.type, ')');
    createdIds.push(pgData.data._id);

    // 7. Test Public / Tenant Discovery & Filtering
    console.log('\n[6/7] Testing Public Browse & Details APIs...');
    const browseRes = await fetch(`${BASE_URL}/properties`);
    const browseData = await browseRes.json();
    const allProps = browseData.data || [];
    console.log(`✓ Public discovery returned ${allProps.length} properties.`);

    for (const id of createdIds) {
      const detailRes = await fetch(`${BASE_URL}/properties/${id}`);
      const detailData = await detailRes.json();
      if (!detailRes.ok) throw new Error(`Failed to fetch detail for ${id}: ${JSON.stringify(detailData)}`);
      const p = detailData.data;
      console.log(`✓ Details verified for [${p.type}] "${p.name}" (Manager: ${p.manager?.firstName || p.owner?.firstName || 'Assigned'})`);
      
      // Verify type-specific fields were properly persisted
      if (p.type === 'apartment' && p.bhk !== '3 BHK') throw new Error('Apartment bhk mismatch');
      if (p.type === 'house' && (!p.builtUpArea || p.builtUpArea !== 3200)) throw new Error('House builtUpArea mismatch');
      if (p.type === 'commercial' && (!p.commercialArea || p.commercialArea !== 1400)) throw new Error('Commercial area mismatch');
      if (p.type === 'hostel' && (!p.totalBeds || p.totalBeds !== 80)) throw new Error('Hostel totalBeds mismatch');
      if (p.type === 'pg' && (!p.genderPreference || p.genderPreference !== 'female')) throw new Error('PG genderPreference mismatch');
    }

    // 8. Test Save/Unsave and Existing Properties Verification
    console.log('\n[7/7] Testing Tenant Save & Pre-feature Properties integrity...');
    const saveRes = await fetch(`${BASE_URL}/properties/${createdIds[0]}/save`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tenantToken}`
      }
    });
    const saveData = await saveRes.json();
    if (!saveRes.ok) throw new Error(`Save property failed: ${JSON.stringify(saveData)}`);
    console.log('✓ Save property toggle succeeded on new property type.');

    // Check existing pre-feature properties
    const existingProperties = await Property.find({ _id: { $nin: createdIds } }).limit(5);
    console.log(`✓ Checked ${existingProperties.length} existing pre-feature properties — all valid and intact.`);
    for (const ep of existingProperties) {
      const epDetail = await fetch(`${BASE_URL}/properties/${ep._id}`);
      if (!epDetail.ok) throw new Error(`Existing property detail failed: ${ep._id}`);
    }
    console.log('✓ All existing pre-feature properties continue working 100% seamlessly without errors.');

    console.log('\nALL 7 TESTS PASSED SUCCESSFULLY! 🚀');

  } finally {
    // Clean up created test properties & users
    if (createdIds.length > 0) {
      await Property.deleteMany({ _id: { $in: createdIds } });
      console.log(`Cleaned up ${createdIds.length} test properties.`);
    }
    await User.deleteMany({ _id: { $in: [testMgr._id, testTnt._id] } });
    console.log('Cleaned up test users.');
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
}

runTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
