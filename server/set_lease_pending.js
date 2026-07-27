import mongoose from 'mongoose';
import Lease from './src/models/Lease.js';
import User from './src/models/User.js';
import Tenant from './src/models/Tenant.js';
import 'dotenv/config';

async function setLeasePending() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB.');
        
        const tenant = await Tenant.findOne({ email: 'sankabaktulamoksha3soham12@gmail.com' });
        if (!tenant) {
            console.log("Tenant not found.");
            return;
        }

        // Find the absolute latest lease associated with this tenant
        const latestLease = await Lease.findOne({ tenant: tenant._id }).sort({ createdAt: -1 });
        if (!latestLease) {
            console.log("No lease found for this tenant.");
            return;
        }

        console.log(`Current latest lease: ${latestLease.leaseNumber}, Status: ${latestLease.status}`);
        
        // Reset it to pending and clear signature info
        latestLease.status = 'pending';
        latestLease.signature = undefined;
        latestLease.signatureType = undefined;
        latestLease.signedBy = undefined;
        latestLease.signedAt = undefined;
        latestLease.tenantSignatureIp = undefined;
        
        await latestLease.save();
        console.log(`Lease ${latestLease.leaseNumber} updated to PENDING with signature cleared.`);
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

setLeasePending();
