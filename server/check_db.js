import mongoose from 'mongoose';
import User from './src/models/User.js';
import Payment from './src/models/Payment.js';
import 'dotenv/config';

async function checkAdminPayments() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const admin = await User.findOne({ email: 'admin@gmail.com' });
        if (!admin) {
            console.log("Admin user not found.");
            return;
        }

        const payments = await Payment.countDocuments({ status: 'paid' });
        console.log(`Total PAID payments in DB: ${payments}`);
        
        // Find a tenant user to test with in the UI
        const tenantUser = await User.findOne({ role: 'tenant' });
        if (tenantUser) {
            console.log(`Sample Tenant: ${tenantUser.email} / password123 (if seeded)`);
        }

    } catch (err) {
        console.error("Check failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

checkAdminPayments();
