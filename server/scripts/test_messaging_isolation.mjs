import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import Booking from '../src/models/Booking.js';
import Lease from '../src/models/Lease.js';
import Message from '../src/models/Message.js';
import messagingAuthService from '../src/services/messagingAuthService.js';
import { sendMessage, getAvailableUsers } from '../src/controllers/messageController.js';
import { getPeople } from '../src/controllers/userController.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  const managers = await User.find({ role: 'manager' }).select('email firstName lastName');
  const madhu = managers.find(m => (m.firstName && m.firstName.toLowerCase().includes('madhu')) || m.email.includes('madhu')) || managers[1];
  const activeManager = managers.find(m => m._id.toString() !== madhu?._id?.toString());

  console.log('New Manager (Madhu):', madhu?.firstName, madhu?._id?.toString());
  console.log('Active Manager:', activeManager?.firstName, activeManager?._id?.toString());

  // -------------------------------------------------------------
  // TEST 1: New Manager (0 properties / 0 bookings)
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: New Manager Isolation ---');
  const madhuPartners = await messagingAuthService.getAuthorizedPartners(madhu._id.toString(), 'manager');
  console.log(`[TEST 1.1] Madhu's Available Chat Contacts: ${madhuPartners.length} (Expected: 0)`);
  if (madhuPartners.length !== 0) {
    console.error('FAILED TEST 1.1: Madhu should have 0 contacts!');
    process.exit(1);
  }

  // Check getPeople for Madhu
  let madhuPeopleResult = null;
  const mockReqMadhu = {
    user: { role: 'manager', userId: madhu._id.toString() },
    query: {}
  };
  const mockResMadhu = {
    status: () => mockResMadhu,
    json: (data) => { madhuPeopleResult = data; return mockResMadhu; }
  };
  await getPeople(mockReqMadhu, mockResMadhu, () => {});
  console.log(`[TEST 1.2] Madhu's People Directory Count: ${madhuPeopleResult?.data?.length} (Expected: 0)`);
  if (madhuPeopleResult?.data?.length !== 0) {
    console.error('FAILED TEST 1.2: Madhu should see 0 people in directory!');
    process.exit(1);
  }

  // -------------------------------------------------------------
  // TEST 2: Active Manager with Bookings
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Active Manager Authorized Partners ---');
  if (activeManager) {
    const activePartners = await messagingAuthService.getAuthorizedPartners(activeManager._id.toString(), 'manager');
    console.log(`[TEST 2.1] Active Manager Partners Count: ${activePartners.length}`);
    activePartners.forEach(p => {
      console.log(`  - Tenant: ${p.firstName} ${p.lastName} | Property: ${p.propertyName} | Status: ${p.bookingStatus}`);
    });
  }

  // -------------------------------------------------------------
  // TEST 3: Cross-Manager / Unauthorized Message Attempt
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Unauthorized Message 403 Rejection ---');
  const allTenants = await User.find({ role: { $in: ['tenant', 'user'] } }).select('_id firstName lastName');
  if (allTenants.length > 0) {
    const targetTenant = allTenants[0];
    const authCheck = await messagingAuthService.verifyRelationship(
      madhu._id.toString(),
      targetTenant._id.toString(),
      null,
      'manager'
    );
    console.log(`[TEST 3.1] Madhu -> Unrelated Tenant (${targetTenant.firstName}) isAuthorized: ${authCheck.isAuthorized} (Expected: false)`);
    if (authCheck.isAuthorized) {
      console.error('FAILED TEST 3.1: Madhu must NOT be authorized to message unrelated tenant!');
      process.exit(1);
    }
  }

  // -------------------------------------------------------------
  // TEST 4: Cross-Property Attack Prevention
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Cross-Property Spoof Prevention ---');
  if (activeManager) {
    const activePartners = await messagingAuthService.getAuthorizedPartners(activeManager._id.toString(), 'manager');
    if (activePartners.length > 0) {
      const legitTenant = activePartners[0];
      const fakePropertyId = new mongoose.Types.ObjectId().toString(); // Random fake property

      const crossPropCheck = await messagingAuthService.verifyRelationship(
        activeManager._id.toString(),
        legitTenant._id.toString(),
        fakePropertyId,
        'manager'
      );
      console.log(`[TEST 4.1] ActiveManager -> Tenant on Fake Property isAuthorized: ${crossPropCheck.isAuthorized} (Expected: false)`);
      if (crossPropCheck.isAuthorized) {
        console.error('FAILED TEST 4.1: Cross-property spoof should be rejected!');
        process.exit(1);
      }
    }
  }

  console.log('\n✅ ALL MESSAGING ISOLATION & AUTHORIZATION TESTS PASSED CLEANLY!');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
