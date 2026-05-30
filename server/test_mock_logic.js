import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { processMockPayment } from './src/controllers/bookingController.js';
import Property from './src/models/Property.js';
import User from './src/models/User.js';

dotenv.config();

async function testMock() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        
        const property = await Property.findOne();
        const user = await User.findOne();
        
        console.log('Testing Mock for property:', property._id);
        console.log('Testing Mock for user:', user._id);

        // Mock req/res
        const req = {
            body: {
                propertyId: property._id,
                amount: 100,
                method: 'debit_card'
            },
            user: { userId: user._id }
        };
        const res = {
            status: (s) => ({
                json: (d) => console.log('Response Status:', s, 'JSON:', JSON.stringify(d, null, 2))
            })
        };
        const next = (err) => console.error('Next() called with error:', err);

        await processMockPayment(req, res, next);
        
        process.exit(0);
    } catch (err) {
        console.error('Test script CRASHED:', err);
        process.exit(1);
    }
}

testMock();
