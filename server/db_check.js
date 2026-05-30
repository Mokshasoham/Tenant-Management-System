import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Property from './src/models/Property.js';
import User from './src/models/User.js';

dotenv.config();

async function checkDb() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        
        const properties = await Property.find().limit(5);
        console.log('Properties found:', properties.length);
        if (properties.length > 0) {
            console.log('Sample Property ID:', properties[0]._id);
        }

        const users = await User.find().limit(5);
        console.log('Users found:', users.length);
        
        process.exit(0);
    } catch (err) {
        console.error('DB Check failed:', err);
        process.exit(1);
    }
}

checkDb();
