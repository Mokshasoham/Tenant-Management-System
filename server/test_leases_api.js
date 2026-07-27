import mongoose from 'mongoose';
import Property from './src/models/Property.js';
import Tenant from './src/models/Tenant.js';
import Lease from './src/models/Lease.js';
import 'dotenv/config';

async function testLeasesApi() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const leases = await Lease.find()
            .populate('property', 'name address rentAmount')
            .populate('tenant', 'firstName lastName email');
        
        console.log("Total leases from query:", leases.length);
        const latest = leases.find(l => l.leaseNumber === 'LEASE-MOCK-1784789190227');
        if (latest) {
            console.log("Latest lease details from find query:");
            console.log("ID:", latest._id);
            console.log("Lease Number:", latest.leaseNumber);
            console.log("Status:", latest.status);
            console.log("Signature present in query:", !!latest.signature);
            console.log("Signature type:", latest.signatureType);
        } else {
            console.log("Latest lease not found in query.");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

testLeasesApi();
