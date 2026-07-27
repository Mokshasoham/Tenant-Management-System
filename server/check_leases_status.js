import mongoose from 'mongoose';
import Lease from './src/models/Lease.js';
import User from './src/models/User.js';
import Tenant from './src/models/Tenant.js';
import 'dotenv/config';

async function checkLeases() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB.');
        const leases = await Lease.find().populate('tenant');
        console.log(`Found ${leases.length} leases:`);
        for (const l of leases) {
            console.log(`Lease #: ${l.leaseNumber}, ID: ${l._id}, Status: ${l.status}, Tenant: ${l.tenant?.firstName} ${l.tenant?.lastName} (${l.tenant?.email})`);
        }
        
        const tenants = await Tenant.find();
        console.log(`Found ${tenants.length} tenants in DB:`);
        for (const t of tenants) {
            console.log(`Tenant: ${t.firstName} ${t.lastName} (${t.email}), Leases Count: ${t.leases?.length}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkLeases();
