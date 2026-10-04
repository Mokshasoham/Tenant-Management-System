import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import Tenant from '../src/models/Tenant.js';
import Lease from '../src/models/Lease.js';
import Payment from '../src/models/Payment.js';
import LeaseRenewal from '../src/modules/lease-renewal/model.js';
import { getManagerPropertyIds } from '../src/utils/managerHelper.js';

async function runAudit() {
  console.log('--- CONNECTING TO MONGODB ---');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB successfully.');

  // 1. Users
  const managers = await User.find({ role: 'manager' }).select('_id firstName lastName email role').lean();
  console.log(`\n=== MANAGERS (${managers.length}) ===`);
  console.log(JSON.stringify(managers, null, 2));

  const admins = await User.find({ role: 'admin' }).select('_id firstName lastName email role').lean();
  console.log(`\n=== ADMINS (${admins.length}) ===`);
  console.log(JSON.stringify(admins, null, 2));

  // 2. Properties
  const properties = await Property.find({}).select('_id name address owner manager createdBy status units rentAmount').lean();
  console.log(`\n=== PROPERTIES (${properties.length}) ===`);
  console.log(JSON.stringify(properties, null, 2));

  // 3. Leases
  const leases = await Lease.find({}).select('_id property tenant status leaseDecision moveOutStatus startDate endDate rentAmount paymentFrequency').lean();
  console.log(`\n=== LEASES (${leases.length}) ===`);
  console.log(JSON.stringify(leases, null, 2));

  // 4. Lease renewals (both LeaseRenewal model and checking collection directly)
  const renewals = await LeaseRenewal.find({}).lean();
  console.log(`\n=== LEASE RENEWALS in LeaseRenewal collection (${renewals.length}) ===`);
  console.log(JSON.stringify(renewals, null, 2));

  // Check any other collection name like 'renewals' or 'leaserenewals'
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('\n=== MONGO COLLECTIONS ===');
  console.log(collections.map(c => c.name));

  // 5. Payments
  const payments = await Payment.find({}).select('_id lease tenant property amount amountPaid status dueDate type').lean();
  console.log(`\n=== PAYMENTS (${payments.length}) ===`);
  console.log(JSON.stringify(payments, null, 2));

  // 6. Test manager property scoping and calculations for each manager
  for (const m of managers) {
    console.log(`\n========================================`);
    console.log(`AUDIT FOR MANAGER: ${m.firstName} ${m.lastName} (${m.email}, ID: ${m._id})`);
    const propIds = await getManagerPropertyIds(m._id);
    console.log(`Owned/Managed Property IDs (${propIds.length}):`, propIds.map(p => p.toString()));

    const leasesOnProps = await Lease.find({ property: { $in: propIds } }).lean();
    console.log(`Leases on Manager Properties (${leasesOnProps.length}):`);
    leasesOnProps.forEach(l => {
      console.log(` - Lease ${l._id}: status=${l.status}, leaseDecision=${l.leaseDecision}, moveOutStatus=${l.moveOutStatus}, start=${l.startDate?.toISOString()?.slice(0,10)}, end=${l.endDate?.toISOString()?.slice(0,10)}`);
    });

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const renewalCount = await LeaseRenewal.countDocuments({
      property: { $in: propIds },
      status: { $in: ['requested', 'under_review', 'pending', 'counter_offer'] },
      isDeleted: false
    });

    const moveOutCount = await Lease.countDocuments({
      property: { $in: propIds },
      moveOutStatus: { $in: ['requested', 'inspection_scheduled', 'inspection_completed', 'refund_processing'] }
    });

    const expiring7DaysCount = await Lease.countDocuments({
      property: { $in: propIds },
      status: 'active',
      endDate: { $gte: now, $lte: sevenDaysFromNow }
    });

    const expiredDocs = await Lease.find({
      property: { $in: propIds },
      $or: [
        { status: 'expired' },
        { status: 'active', endDate: { $lt: now } }
      ]
    }).select('_id status endDate').lean();

    const expiredLeaseIds = expiredDocs.map(l => l._id);
    const unpaidPaymentsOnExpired = await Payment.find({
      lease: { $in: expiredLeaseIds },
      status: { $in: ['pending', 'partially_paid', 'overdue'] }
    }).select('amount amountPaid lease status').lean();

    const distinctLeaseSet = new Set();
    let totalUnpaid = 0;
    unpaidPaymentsOnExpired.forEach(p => {
      if (p.lease) distinctLeaseSet.add(p.lease.toString());
      const due = (Number(p.amount) || 0) - (Number(p.amountPaid) || 0);
      if (due > 0) totalUnpaid += due;
    });

    console.log(`Current Action Center Metrics for Manager:`);
    console.log(` - pendingRenewalRequests: ${renewalCount}`);
    console.log(` - pendingMoveOutRequests: ${moveOutCount}`);
    console.log(` - leasesExpiringWithin7Days: ${expiring7DaysCount}`);
    console.log(` - expiredLeases: ${expiredDocs.length}`);
    console.log(` - outstandingPaymentsOnExpiredLeasesCount: ${distinctLeaseSet.size}`);
    console.log(` - outstandingPaymentsOnExpiredLeasesAmount: ₹${totalUnpaid}`);
  }

  await mongoose.disconnect();
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
