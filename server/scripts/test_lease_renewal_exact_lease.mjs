import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import Tenant from '../src/models/Tenant.js';
import Property from '../src/models/Property.js';
import Lease from '../src/models/Lease.js';
import { getTenantDashboardData } from '../src/modules/lease-renewal/dashboardService.js';
import { getDashboard } from '../src/modules/lease-renewal/controller.js';

function mockReqRes(user, query = {}) {
  const req = {
    user: {
      userId: user._id.toString(),
      _id: user._id,
      id: user._id.toString(),
      role: user.role || 'tenant',
      email: user.email,
    },
    query,
    headers: {},
    protocol: 'http',
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    socket: { remoteAddress: '127.0.0.1' },
    get: () => 'localhost:5000',
  };
  let resStatus = 200;
  let resJson = null;

  const res = {
    status(s) {
      resStatus = s;
      return this;
    },
    json(j) {
      resJson = j;
      return this;
    },
    getStatus: () => resStatus,
    getJson: () => resJson,
  };

  return { req, res };
}

async function runTests() {
  console.log('=== TEST SUITE: Lease Renewal Exact Lease Selection & Authorization ===\n');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');

  // Find a tenant with active leases or setup test data
  const users = await User.find({ role: { $in: ['tenant', 'user'] } }).lean();
  let targetTenantUser = null;
  let targetTenantLeases = [];

  for (const u of users) {
    const tenants = await Tenant.find({ $or: [{ email: u.email }, { user: u._id }, { userId: u._id }] });
    const tIds = [u._id, ...tenants.map(t => t._id)];
    const leases = await Lease.find({ tenant: { $in: tIds }, status: 'active' }).populate('property');
    if (leases.length >= 2) {
      targetTenantUser = u;
      targetTenantLeases = leases;
      break;
    }
  }

  if (!targetTenantUser || targetTenantLeases.length < 2) {
    console.log('Searching for any user or creating two test leases for a tenant...');
    targetTenantUser = users[0];
    const tenantRecord = await Tenant.findOne({ $or: [{ email: targetTenantUser.email }, { user: targetTenantUser._id }] }) 
      || await Tenant.create({ name: `${targetTenantUser.firstName} ${targetTenantUser.lastName}`, email: targetTenantUser.email, phone: '9999999999', user: targetTenantUser._id });

    const propA = await Property.findOne({ name: /moksha/i }) || await Property.create({ name: "moksha's apartment", address: "R.R. Peta, Eluru", rent: 15000, status: 'active' });
    const propB = await Property.findOne({ name: /house/i }) || await Property.create({ name: "house", address: "Main Street, Eluru", rent: 10000, status: 'active' });

    const leaseA = await Lease.create({
      leaseNumber: `LEASE-TEST-A-${Date.now()}`,
      property: propA._id,
      tenant: tenantRecord._id,
      startDate: new Date('2026-08-22'),
      endDate: new Date('2026-09-22'),
      rentAmount: 15000,
      status: 'active'
    });

    const leaseB = await Lease.create({
      leaseNumber: `LEASE-TEST-B-${Date.now()}`,
      property: propB._id,
      tenant: tenantRecord._id,
      startDate: new Date('2026-07-31'),
      endDate: new Date('2026-09-30'),
      rentAmount: 10000,
      status: 'active'
    });

    targetTenantLeases = [await Lease.findById(leaseA._id).populate('property'), await Lease.findById(leaseB._id).populate('property')];
  }

  const leaseA = targetTenantLeases[0];
  const leaseB = targetTenantLeases[1];

  console.log(`Tenant: ${targetTenantUser.email} (ID: ${targetTenantUser._id})`);
  console.log(`Lease A: Property "${leaseA.property?.name}", Rent ₹${leaseA.rentAmount}, ID: ${leaseA._id}, Number: ${leaseA.leaseNumber}`);
  console.log(`Lease B: Property "${leaseB.property?.name}", Rent ₹${leaseB.rentAmount}, ID: ${leaseB._id}, Number: ${leaseB.leaseNumber}\n`);

  // TEST 1: Request renewal for Lease A explicitly
  console.log('TEST 1: Request renewal with leaseId = Lease A');
  {
    const { req, res } = mockReqRes(targetTenantUser, { leaseId: leaseA._id.toString() });
    await getDashboard(req, res);
    const data = res.getJson()?.data;

    console.log('  Returned Property:', data?.property?.name);
    console.log('  Returned Rent Amount:', data?.lease?.rentAmount);
    console.log('  Returned Lease ID:', data?.lease?.id);

    if (data?.lease?.id.toString() !== leaseA._id.toString()) {
      throw new Error(`Test 1 Failed: Expected lease ID ${leaseA._id}, got ${data?.lease?.id}`);
    }
    if (data?.lease?.rentAmount !== leaseA.rentAmount) {
      throw new Error(`Test 1 Failed: Expected rent ${leaseA.rentAmount}, got ${data?.lease?.rentAmount}`);
    }
    if (data?.property?.name !== leaseA.property?.name) {
      throw new Error(`Test 1 Failed: Expected property "${leaseA.property?.name}", got "${data?.property?.name}"`);
    }
    console.log('  ✓ Verified: Exact Lease A loaded with correct property and rent amount.');
  }

  // TEST 2: Request renewal for Lease B explicitly
  console.log('\nTEST 2: Request renewal with leaseId = Lease B');
  {
    const { req, res } = mockReqRes(targetTenantUser, { leaseId: leaseB._id.toString() });
    await getDashboard(req, res);
    const data = res.getJson()?.data;

    console.log('  Returned Property:', data?.property?.name);
    console.log('  Returned Rent Amount:', data?.lease?.rentAmount);
    console.log('  Returned Lease ID:', data?.lease?.id);

    if (data?.lease?.id.toString() !== leaseB._id.toString()) {
      throw new Error(`Test 2 Failed: Expected lease ID ${leaseB._id}, got ${data?.lease?.id}`);
    }
    if (data?.lease?.rentAmount !== leaseB.rentAmount) {
      throw new Error(`Test 2 Failed: Expected rent ${leaseB.rentAmount}, got ${data?.lease?.rentAmount}`);
    }
    if (data?.property?.name !== leaseB.property?.name) {
      throw new Error(`Test 2 Failed: Expected property "${leaseB.property?.name}", got "${data?.property?.name}"`);
    }
    console.log('  ✓ Verified: Exact Lease B loaded with correct property and rent amount.');
  }

  // TEST 3: Direct URL access with Lease A ID
  console.log('\nTEST 3: Direct URL query param access (/lease-renewal?leaseId=A)');
  {
    const dataA = await getTenantDashboardData(targetTenantUser._id.toString(), leaseA._id.toString());
    if (dataA.lease.id.toString() !== leaseA._id.toString()) {
      throw new Error('Test 3 Failed: Direct leaseId lookup mismatch');
    }
    console.log(`  ✓ Verified: Direct lookup for Lease A returned property "${dataA.property.name}" and rent ₹${dataA.lease.rentAmount}`);
  }

  // TEST 4: Direct URL access with Lease B ID
  console.log('\nTEST 4: Direct URL query param access (/lease-renewal?leaseId=B)');
  {
    const dataB = await getTenantDashboardData(targetTenantUser._id.toString(), leaseB._id.toString());
    if (dataB.lease.id.toString() !== leaseB._id.toString()) {
      throw new Error('Test 4 Failed: Direct leaseId lookup mismatch');
    }
    console.log(`  ✓ Verified: Direct lookup for Lease B returned property "${dataB.property.name}" and rent ₹${dataB.lease.rentAmount}`);
  }

  // TEST 5: Another tenant tries to access Tenant A's lease (Cross-Tenant Security Check)
  console.log("\nTEST 5: Tenant B attempts to load Tenant A's lease (Cross-tenant Authorization)");
  {
    const otherUser = users.find(u => u._id.toString() !== targetTenantUser._id.toString());
    if (otherUser) {
      let forbiddenCaught = false;
      try {
        await getTenantDashboardData(otherUser._id.toString(), leaseA._id.toString());
      } catch (err) {
        forbiddenCaught = true;
        console.log(`  ✓ Correctly rejected unauthorized lease access: ${err.message} (HTTP ${err.statusCode || 403})`);
      }

      if (!forbiddenCaught) {
        throw new Error("Test 5 Failed: Tenant B was allowed to load Tenant A's lease!");
      }
    }
  }

  // TEST 6: Request without leaseId when multiple leases exist (No silent random picking)
  console.log('\nTEST 6: Request without leaseId when tenant has multiple active leases');
  {
    const { req, res } = mockReqRes(targetTenantUser, {});
    await getDashboard(req, res);
    const data = res.getJson()?.data;

    console.log('  Returned data hasActiveLease:', data?.hasActiveLease);
    console.log('  Returned data multipleLeases:', data?.multipleLeases);
    console.log('  Returned message:', data?.message);

    if (data?.multipleLeases !== true) {
      throw new Error('Test 6 Failed: Expected multipleLeases: true when no leaseId was specified');
    }
    console.log('  ✓ Verified: Backend does NOT silently pick a random lease when multiple active leases exist.');
  }

  console.log('\n✅ ALL LEASE RENEWAL SELECTION & ISOLATION TESTS PASSED!\n');
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
