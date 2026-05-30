import mongoose from 'mongoose';
import User from './src/models/User.js';
import 'dotenv/config';

await mongoose.connect(process.env.MONGODB_URI);
const users = await User.find({ role: { $in: ['manager', 'admin'] } });
console.log('Managers/Admins in DB:');
users.forEach(u => console.log(`${u.email} - ${u.role}`));
await mongoose.disconnect();
