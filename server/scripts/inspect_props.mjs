import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Property from '../src/models/Property.js';
import Lease from '../src/models/Lease.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const properties = await Property.find({ isDeleted: { $ne: true } })
    .populate('leases')
    .populate('activeLease');
  
  console.log(`Found ${properties.length} active properties:`);
  for (const p of properties) {
    const obj = p.toObject({ virtuals: true });
    console.log(JSON.stringify({
      id: p._id,
      name: p.name,
      status: p.status,
      displayStatus: obj.displayStatus,
      leasesCount: p.leases?.length,
      leases: p.leases?.map(l => ({ id: l._id, status: l.status, endDate: l.endDate })),
      activeLease: p.activeLease ? { id: p.activeLease._id, status: p.activeLease.status, endDate: p.activeLease.endDate } : null,
      bookedDates: p.bookedDates,
    }, null, 2));
  }
  await mongoose.disconnect();
}
run().catch(console.error);
