import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management';

async function check() {
  await mongoose.connect(MONGO_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const techs = await User.find({ role: 'technician' });
  console.log('ALL TECHNICIANS IN DB:');
  console.log(JSON.stringify(techs, null, 2));
  await mongoose.disconnect();
}

check().catch(console.error);
