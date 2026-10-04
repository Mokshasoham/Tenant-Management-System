import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management';

async function check() {
  await mongoose.connect(MONGO_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Property = mongoose.model('Property', new mongoose.Schema({}, { strict: false }));
  const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }));

  console.log('--- ALL MANAGERS ---');
  const managers = await User.find({ role: 'manager' }).select('_id firstName lastName email role');
  console.log(JSON.stringify(managers, null, 2));

  console.log('--- ALL PROPERTIES ---');
  const props = await Property.find({}).select('_id name owner manager');
  console.log(JSON.stringify(props, null, 2));

  console.log('--- ALL TENANTS ---');
  const tenants = await Tenant.find({}).select('_id firstName lastName email managedBy');
  console.log(JSON.stringify(tenants, null, 2));

  await mongoose.disconnect();
}

check().catch(console.error);
