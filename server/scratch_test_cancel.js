import mongoose from 'mongoose';
import Booking from './src/models/Booking.js';
import Property from './src/models/Property.js';
import Lease from './src/models/Lease.js';
import Notification from './src/models/Notification.js';

async function testCancel() {
    await mongoose.connect('mongodb://localhost:27017/tenant-management-system');
    console.log('Connected to MongoDB');

    try {
        const bookingId = '6a61a02a723ce658895211eb';
        const booking = await Booking.findById(bookingId).populate('property');
        if (!booking) {
            console.log('Booking not found!');
            return;
        }

        console.log(`Initial Status: ${booking.status}`);
        const property = booking.property;
        const now = new Date();
        const startDate = new Date(booking.startDate);
        const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        console.log('Hours until start:', hoursUntilStart);
        console.log('Booking property:', property?._id);

        let refundAmount = 0;
        
        booking.status = 'cancelled';
        console.log('Set status to cancelled');

        // Unlock property schedule
        console.log('Updating property...');
        await Property.updateOne(
            { _id: property._id },
            { 
                $pull: { bookedDates: { bookingId: booking._id } },
                $set: { status: 'available' }
            }
        );
        console.log('Property updated successfully');

        // Disable any dangling leases
        console.log('Updating leases...');
        await Lease.updateMany(
            { property: property._id, status: { $in: ['pending', 'active'] } },
            { $set: { status: 'terminated' } }
        );
        console.log('Leases updated successfully');

        // Create notification
        console.log('Creating notification...');
        await Notification.create({
            recipient: property.manager || property.owner,
            sender: booking.user,
            title: 'Booking Cancelled By Tenant',
            message: `Booking ${booking._id.toString().slice(-8)} has been formally cancelled. Property is now unlocked.`,
            type: 'alert',
            link: `/bookings/${booking._id}`
        });
        console.log('Notification created successfully');

        console.log('All steps completed without errors!');
    } catch (err) {
        console.error('Error during cancellation:', err);
    } finally {
        await mongoose.disconnect();
    }
}

testCancel();
