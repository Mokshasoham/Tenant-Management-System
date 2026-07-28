import mongoose from 'mongoose';
import Booking from './src/models/Booking.js';
import User from './src/models/User.js';

async function lookupUser() {
    await mongoose.connect('mongodb://localhost:27017/tenant-management-system');
    console.log('Connected to MongoDB');

    try {
        const booking = await Booking.findById('6a61a02a723ce658895211eb');
        if (booking) {
            console.log(`Booking User ID: ${booking.user}`);
            const user = await User.findById(booking.user);
            console.log(`User details: ${user?.firstName} ${user?.lastName}, Email: ${user?.email}, Role: ${user?.role}`);
        } else {
            console.log('Booking not found!');
        }

        // Print all users in DB
        const users = await User.find({});
        console.log('All Users in DB:');
        for (const u of users) {
            console.log(`ID: ${u._id}, Name: ${u.firstName} ${u.lastName}, Email: ${u.email}, Role: ${u.role}`);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

lookupUser();
