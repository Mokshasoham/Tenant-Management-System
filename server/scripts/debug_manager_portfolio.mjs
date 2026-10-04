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
import Tenant from '../src/models/Tenant.js';
import Payment from '../src/models/Payment.js';
import Maintenance from '../src/models/Maintenance.js';
import Bill from '../src/models/Bill.js';
import { getPropertyStats } from '../src/controllers/propertyController.js';
import { getTenantStats } from '../src/controllers/tenantController.js';
import { getLeaseStats } from '../src/controllers/leaseController.js';
import { getPaymentStats } from '../src/controllers/paymentController.js';
import { getBillAnalytics } from '../src/controllers/billController.js';
import { getSummaryStats } from '../src/controllers/analyticsController.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  const managers = await User.find({ role: 'manager' }).select('email firstName lastName');
  console.log('All Managers:');
  for (const m of managers) {
    const managerId = m._id.toString();
    const isValidOid = mongoose.Types.ObjectId.isValid(managerId);
    const mIds = [managerId, isValidOid ? new mongoose.Types.ObjectId(managerId) : null].filter(Boolean);

    const props = await Property.find({
      $or: [{ owner: { $in: mIds } }, { manager: { $in: mIds } }, { createdBy: { $in: mIds } }]
    }).select('name title status owner manager');

    console.log(`\nManager: ${m.firstName} ${m.lastName} (${m.email}) [${managerId}]`);
    console.log(`- Properties Count: ${props.length}`);
    props.forEach(p => console.log(`   * ${p.name || p.title} (Status: ${p.status}, Owner: ${p.owner}, Manager: ${p.manager})`));

    // Test getPropertyStats endpoint for this manager
    let propStatsResult = null;
    const mockReq = { user: { role: 'manager', userId: managerId } };
    const mockRes = {
      status: () => mockRes,
      json: (d) => { propStatsResult = d; return mockRes; }
    };

    await getPropertyStats(mockReq, mockRes, () => {});
    console.log(`- getPropertyStats result:`, propStatsResult?.data);

    // Test getTenantStats endpoint for this manager
    let tenantStatsResult = null;
    const mockResTenant = {
      status: () => mockResTenant,
      json: (d) => { tenantStatsResult = d; return mockResTenant; }
    };
    await getTenantStats(mockReq, mockResTenant, () => {});
    console.log(`- getTenantStats result:`, tenantStatsResult?.data);

    // Test getLeaseStats endpoint for this manager
    let leaseStatsResult = null;
    const mockResLease = {
      status: () => mockResLease,
      json: (d) => { leaseStatsResult = d; return mockResLease; }
    };
    await getLeaseStats(mockReq, mockResLease, () => {});
    console.log(`- getLeaseStats result:`, leaseStatsResult?.data);

    // Test getPaymentStats endpoint for this manager
    let paymentStatsResult = null;
    const mockResPayment = {
      status: () => mockResPayment,
      json: (d) => { paymentStatsResult = d; return mockResPayment; }
    };
    await getPaymentStats(mockReq, mockResPayment, () => {});
    console.log(`- getPaymentStats result:`, paymentStatsResult?.data);

    // Test getBillAnalytics endpoint for this manager
    let billAnalyticsResult = null;
    const mockResBill = {
      status: () => mockResBill,
      json: (d) => { billAnalyticsResult = d; return mockResBill; }
    };
    await getBillAnalytics(mockReq, mockResBill, () => {});
    console.log(`- getBillAnalytics result:`, billAnalyticsResult?.data);

    // Test getSummaryStats endpoint for this manager
    let summaryResult = null;
    const mockResSummary = {
      status: () => mockResSummary,
      json: (d) => { summaryResult = d; return mockResSummary; }
    };
    await getSummaryStats(mockReq, mockResSummary, () => {});
    console.log(`- getSummaryStats result:`, summaryResult?.data);
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
