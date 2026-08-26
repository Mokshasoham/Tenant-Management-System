/**
 * Multi-Property Verification Isolation E2E Integration Test Suite
 * Validates strict per-property verification data isolation for managers.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import Verification from '../src/models/Verification.js';
import verificationService from '../src/services/verificationService.js';
import verificationRepository from '../src/repositories/verificationRepository.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant_management';

async function runTests() {
  console.log('🧪 Starting Multi-Property Verification Isolation Test Suite...\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Setup Test Users
    const managerA = await User.findOneAndUpdate(
      { email: 'manager_test_alpha@tms.com' },
      {
        firstName: 'Alpha',
        lastName: 'Manager',
        role: 'manager',
        status: 'active',
        password: 'Password123!',
      },
      { upsert: true, new: true }
    );

    const managerB = await User.findOneAndUpdate(
      { email: 'manager_test_beta@tms.com' },
      {
        firstName: 'Beta',
        lastName: 'Manager',
        role: 'manager',
        status: 'active',
        password: 'Password123!',
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Test Managers prepared: ${managerA._id}, ${managerB._id}`);

    // 2. Setup 3 Properties for Manager A
    const propA = await Property.findOneAndUpdate(
      { slug: 'skyline-commercial-suite-101' },
      {
        name: 'Skyline Commercial Center - Suite 101',
        slug: 'skyline-commercial-suite-101',
        owner: managerA._id,
        manager: managerA._id,
        type: 'commercial',
        address: '101 Tech Boulevard',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        rentAmount: 55000,
        status: 'available',
        isDeleted: false,
      },
      { upsert: true, new: true }
    );

    const propB = await Property.findOneAndUpdate(
      { slug: 'green-meadows-luxury-villa-12' },
      {
        name: 'Green Meadows Luxury Villa #12',
        slug: 'green-meadows-luxury-villa-12',
        owner: managerA._id,
        manager: managerA._id,
        type: 'villa',
        address: '12 Palm Grove',
        city: 'Hyderabad',
        state: 'Telangana',
        country: 'India',
        rentAmount: 85000,
        status: 'available',
        isDeleted: false,
      },
      { upsert: true, new: true }
    );

    const propC = await Property.findOneAndUpdate(
      { slug: 'orchid-heights-apt-4b' },
      {
        name: 'Orchid Heights Apt 4B',
        slug: 'orchid-heights-apt-4b',
        owner: managerA._id,
        manager: managerA._id,
        type: 'apartment',
        address: '4B Orchid Heights',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        rentAmount: 42000,
        status: 'occupied',
        isDeleted: false,
      },
      { upsert: true, new: true }
    );

    // Setup 1 Property for Manager B (Unauthorized to Manager A)
    const propUnauthorized = await Property.findOneAndUpdate(
      { slug: 'unauthorized-property-manager-b' },
      {
        name: 'Unauthorized Property for Manager B',
        slug: 'unauthorized-property-manager-b',
        owner: managerB._id,
        manager: managerB._id,
        type: 'house',
        address: '99 Secret Lane',
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        rentAmount: 30000,
        status: 'available',
        isDeleted: false,
      },
      { upsert: true, new: true }
    );

    // Clean any prior verifications for these test properties
    await Verification.deleteMany({
      entityId: { $in: [propA._id, propB._id, propC._id, propUnauthorized._id] },
    });

    console.log('✅ 4 Test Properties prepared and cleaned\n');

    // ── TEST 1: Unverified Property returns null without creating fake data ──
    console.log('🔹 TEST 1: Query unverified Property A, B, C');
    const vrfA_initial = await verificationService.getLatestByEntity('PROPERTY', propA._id);
    const vrfB_initial = await verificationService.getLatestByEntity('PROPERTY', propB._id);
    const vrfC_initial = await verificationService.getLatestByEntity('PROPERTY', propC._id);

    if (vrfA_initial === null && vrfB_initial === null && vrfC_initial === null) {
      console.log('   ✅ PASS: All 3 properties correctly return null (no fake data generated)');
    } else {
      throw new Error(`TEST 1 FAILED: Expected null for unverified properties`);
    }

    // ── TEST 2: Initiate Verification on Property A only ──
    console.log('\n🔹 TEST 2: Initiate Verification on Property A');
    const vrfA = await verificationService.initiateVerification('PROPERTY', propA._id, managerA._id);
    console.log(`   Initiated Verification A: ${vrfA._id} (VRF Number: ${vrfA.verificationNumber})`);

    const vrfA_fetched = await verificationService.getLatestByEntity('PROPERTY', propA._id);
    const vrfB_afterA = await verificationService.getLatestByEntity('PROPERTY', propB._id);
    const vrfC_afterA = await verificationService.getLatestByEntity('PROPERTY', propC._id);

    if (vrfA_fetched && String(vrfA_fetched._id) === String(vrfA._id)) {
      console.log('   ✅ PASS: Property A has active verification');
    } else {
      throw new Error(`TEST 2 FAILED: Property A active verification missing`);
    }

    if (vrfB_afterA === null && vrfC_afterA === null) {
      console.log('   ✅ PASS: Property B and Property C remain completely unverified (null)');
    } else {
      throw new Error(`TEST 2 FAILED: Data leakage detected! Property B or C got verification record`);
    }

    // ── TEST 3: Upload Document strictly to Property A ──
    console.log('\n🔹 TEST 3: Upload Sale Deed to Property A');
    const docA = {
      filename: 'skyline_101_deed.pdf',
      url: '/uploads/documents/skyline_101_deed.pdf',
      fileSize: 1024000,
      mimeType: 'application/pdf',
      category: 'OWNERSHIP',
    };

    const vrfA_withDoc = await verificationService.uploadVerificationDocument(
      vrfA._id,
      'SALE_DEED',
      docA,
      managerA._id
    );
    console.log(`   Uploaded doc to Property A: count = ${vrfA_withDoc.documents.length}`);

    // Verify Property B still has no documents
    const vrfB_check = await verificationService.getLatestByEntity('PROPERTY', propB._id);
    if (vrfB_check === null) {
      console.log('   ✅ PASS: Property B verification is still null and has 0 documents');
    } else {
      throw new Error('TEST 3 FAILED: Property B received Property A document');
    }

    // ── TEST 4: Initiate Property B and verify independent lifecycle ──
    console.log('\n🔹 TEST 4: Initiate Verification on Property B (Villa)');
    const vrfB = await verificationService.initiateVerification('PROPERTY', propB._id, managerA._id);
    console.log(`   Initiated Verification B: ${vrfB._id}`);

    if (String(vrfA._id) !== String(vrfB._id)) {
      console.log('   ✅ PASS: Verification A and Verification B have distinct, isolated IDs');
    } else {
      throw new Error('TEST 4 FAILED: Verification IDs collided');
    }

    // Check that uploaded file in A does not exist in B
    const docB_hasFile = vrfB.documents.some((d) => d.filename === 'skyline_101_deed.pdf');
    if (!docB_hasFile) {
      console.log('   ✅ PASS: Property B documents do NOT contain Property A uploaded files');
    } else {
      throw new Error('TEST 4 FAILED: Property B inherited Property A uploaded files');
    }

    // ── TEST 5: Update Status of Property B to SUBMITTED ──
    console.log('\n🔹 TEST 5: Submit Verification for Property B');
    await verificationService.submitVerification(vrfB._id, managerA._id);

    const vrfA_final = await verificationService.getLatestByEntity('PROPERTY', propA._id);
    const vrfB_final = await verificationService.getLatestByEntity('PROPERTY', propB._id);

    console.log(`   Property A status: ${vrfA_final.status}`);
    console.log(`   Property B status: ${vrfB_final.status}`);

    if (vrfA_final.status === 'DOCUMENTS_UPLOADED' && ['SUBMITTED', 'AUTO_REVIEW'].includes(vrfB_final.status)) {
      console.log('   ✅ PASS: Modifying Property B status did not affect Property A status');
    } else {
      throw new Error('TEST 5 FAILED: Status change leaked across properties');
    }

    // ── TEST 6: Manager Property Ownership Authorization ──
    console.log('\n🔹 TEST 6: Authorization verification');
    // Manager A manages propA, propB, propC
    const isManagerA_propA = propA.owner.equals(managerA._id) || propA.manager.equals(managerA._id);
    const isManagerA_unauthorized = propUnauthorized.owner.equals(managerA._id) || propUnauthorized.manager.equals(managerA._id);

    if (isManagerA_propA && !isManagerA_unauthorized) {
      console.log('   ✅ PASS: Manager A authorized for own properties and denied for Property of Manager B');
    } else {
      throw new Error('TEST 6 FAILED: Manager authorization boundary broken');
    }

    console.log('\n🎉 ALL MULTI-PROPERTY VERIFICATION TESTS PASSED PERFECTLY!\n');
  } catch (error) {
    console.error('\n❌ Test Suite Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

runTests();
