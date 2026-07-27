import mongoose from 'mongoose';
import Lease from './src/models/Lease.js';
import Property from './src/models/Property.js';
import Tenant from './src/models/Tenant.js';
import Payment from './src/models/Payment.js';
import 'dotenv/config';

async function removeMockLeases() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB.');
        
        // Find all mock leases
        const mockLeases = await Lease.find({ leaseNumber: /^LEASE-MOCK/i });
        const mockIds = mockLeases.map(l => l._id);
        console.log(`Found ${mockLeases.length} mock leases to remove.`);

        if (mockIds.length === 0) {
            console.log("No mock leases found.");
            return;
        }

        // 1. Remove leases from Lease collection
        const leaseDeleteRes = await Lease.deleteMany({ _id: { $in: mockIds } });
        console.log(`Deleted ${leaseDeleteRes.deletedCount} leases from database.`);

        // 2. Remove references from Tenant.leases
        const tenantUpdateRes = await Tenant.updateMany(
            { leases: { $in: mockIds } },
            { $pull: { leases: { $in: mockIds } } }
        );
        console.log(`Updated ${tenantUpdateRes.modifiedCount} tenants to pull deleted lease references.`);

        // 3. Remove references from Property.leases
        const propertyUpdateRes = await Property.updateMany(
            { leases: { $in: mockIds } },
            { $pull: { leases: { $in: mockIds } } }
        );
        console.log(`Updated ${propertyUpdateRes.modifiedCount} properties to pull deleted lease references.`);

        // 4. Delete payments associated with these mock leases
        const paymentDeleteRes = await Payment.deleteMany({ lease: { $in: mockIds } });
        console.log(`Deleted ${paymentDeleteRes.deletedCount} payments associated with mock leases.`);

        console.log("Database cleanup completed successfully.");
    } catch (err) {
        console.error("Cleanup failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

removeMockLeases();
