import mongoose from 'mongoose';
import 'dotenv/config';
import Booking from './server/src/models/Booking.js';
import Property from './server/src/models/Property.js';
import User from './server/src/models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dbadmin:moksha918255@tenant.fvsjcem.mongodb.net/tenant-management-system?retryWrites=true&w=majority&appName=tenant';

async function checkBookings() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const propertyId = '6a7dfb31ef0f7e1029cc1d4a';
    const property = await Property.findById(propertyId);
    console.log('Property:', property ? { name: property.name, _id: property._id, bookingType: property.bookingType, rentAmount: property.rentAmount } : 'NOT FOUND');

    const bookings = await Booking.find({ property: propertyId });
    console.log(`Found ${bookings.length} bookings for property ${propertyId}:`);
    for (const b of bookings) {
        console.log({
            _id: b._id,
            user: b.user,
            status: b.status,
            paymentStatus: b.paymentStatus,
            totalAmount: b.totalAmount,
            razorpayOrderId: b.razorpayOrderId,
            createdAt: b.createdAt
        });
    }

    const allPendingBookings = await Booking.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(5);
    console.log(`\nLast 5 pending bookings in system:`);
    for (const b of allPendingBookings) {
        console.log({
            _id: b._id,
            property: b.property,
            status: b.status,
            paymentStatus: b.paymentStatus,
            totalAmount: b.totalAmount
        });
    }

    await mongoose.disconnect();
}

checkBookings();
