import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Property from './src/models/Property.js';
import Lease from './src/models/Lease.js';
import Tenant from './src/models/Tenant.js';

dotenv.config();

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // 1. List ALL users to debug
        const users = await User.find({});
        console.log(`Total Users in DB: ${users.length}`);

        users.forEach(u => {
            console.log(`- [${u.role}] ${u.firstName} ${u.lastName} (${u.email}) ID: ${u._id}`);
        });

        // 2. Find target user
        const target = users.find(u =>
            (u.firstName && u.firstName.match(/Mokshagna|sanka/i)) ||
            (u.lastName && u.lastName.match(/Mokshagna|sanka/i))
        );

        if (!target) {
            console.log('>>> ERROR: Target user "Mokshagna" not found in DB list.');
            return;
        }

        console.log(`\nTarget User Found: [${target.role}] ${target.firstName} ${target.lastName}`);

        // 3. Find Tenant Profile
        const tenant = await Tenant.findOne({ email: target.email });
        if (!tenant) {
            console.log('>>> No Tenant profile found for this user.');
            // Maybe they are just a 'user' role?
            return;
        }
        console.log('Tenant Profile ID:', tenant._id);

        // 4. Find Active Lease
        const lease = await Lease.findOne({
            tenant: tenant._id,
            status: { $in: ['active', 'pending'] }
        }).populate('property');

        if (!lease) {
            console.log('>>> No active lease found.');
            return;
        }
        console.log(`Active Lease: ${lease.leaseNumber} for Property: "${lease.property.name}"`);

        // 5. Check Property Manager
        const prop = await Property.findById(lease.property._id);
        console.log('Current Manager ID:', prop.manager);

        if (!prop.manager) {
            console.log('>>> ISSUE: Property has NO manager.');

            // Find a manager to assign
            const managerUser = users.find(u => u.role === 'manager');
            if (managerUser) {
                console.log(`Found a manager system: ${managerUser.firstName} ${managerUser.lastName}`);
                prop.manager = managerUser._id;
                await prop.save();
                console.log('>>> FIX APPLIED: Manager assigned to property! Chat button should appear.');
            } else {
                console.log('>>> CRITICAL: No manager accounts exist in the system.');
            }
        } else {
            const mgr = await User.findById(prop.manager);
            if (mgr) {
                console.log(`Property is managed by: ${mgr.firstName} ${mgr.lastName}`);
            } else {
                console.log('>>> ISSUE: Manager ID exists but User not found.');
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

check();
