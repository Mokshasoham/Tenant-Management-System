import mongoose from 'mongoose';
import Lease from './src/models/Lease.js';
import 'dotenv/config';

async function inspectLease() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const lease = await Lease.findOne({ leaseNumber: 'LEASE-MOCK-1784789190227' });
        if (lease) {
            console.log("Lease Number:", lease.leaseNumber);
            console.log("Status:", lease.status);
            console.log("Signature present:", !!lease.signature);
            console.log("Signature Type:", lease.signatureType);
            console.log("Signed By:", lease.signedBy);
            console.log("Signed At:", lease.signedAt);
            console.log("Signature IP:", lease.tenantSignatureIp);
            if (lease.signature) {
                console.log("Signature length:", lease.signature.length);
            }
        } else {
            console.log("Lease not found.");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

inspectLease();
