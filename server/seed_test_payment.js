import mongoose from 'mongoose';
import Payment from './src/models/Payment.js';
import User from './src/models/User.js';
import Property from './src/models/Property.js';
import 'dotenv/config';

async function seedTestPayment() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Find a user and a property
        const user = await User.findOne({ role: 'tenant' });
        const property = await Property.findOne({});
        
        if (!user || !property) {
            console.log("Missing user or property to create a test payment.");
            return;
        }

        const payment = await Payment.create({
            tenant: user._id,
            property: property._id,
            amount: 1500,
            type: 'rent',
            status: 'pending',
            paymentMethod: 'debit_card',
            description: 'Test Rent Payment'
        });

        console.log(`Created test payment: ${payment._id}`);

    } catch (err) {
        console.error("Seeding failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

seedTestPayment();
