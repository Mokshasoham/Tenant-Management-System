import mongoose from 'mongoose';
import connectDB from '../server/src/config/database.js';
import Lease from '../server/src/models/Lease.js';
import Payment from '../server/src/models/Payment.js';
import Tenant from '../server/src/models/Tenant.js';
import User from '../server/src/models/User.js';

async function run() {
  await connectDB();
  
  const leases = await Lease.find({}).populate('tenant property');
  console.log('--- ALL LEASES ---');
  for (const l of leases) {
    console.log({
      id: l._id,
      leaseNumber: l.leaseNumber,
      status: l.status,
      startDate: l.startDate,
      endDate: l.endDate,
      rentAmount: l.rentAmount,
      tenant: l.tenant ? `${l.tenant.firstName} ${l.tenant.lastName} (${l.tenant.email})` : 'none',
      property: l.property?.name
    });
  }

  const payments = await Payment.find({}).populate('lease');
  console.log('--- ALL PAYMENTS ---');
  for (const p of payments) {
    console.log({
      id: p._id,
      type: p.type,
      status: p.status,
      amount: p.amount,
      dueDate: p.dueDate,
      paymentDate: p.paymentDate,
      lease: p.lease?._id,
      leaseNumber: p.lease?.leaseNumber
    });
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
