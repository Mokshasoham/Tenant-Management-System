import mongoose from 'mongoose';
import User from './src/models/User.js';
import 'dotenv/config';

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({}, 'email role');
        console.log('--- ALL USERS ---');
        users.forEach(u => console.log(`${u.email} [${u.role}]`));
        console.log('-----------------');
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
check();
