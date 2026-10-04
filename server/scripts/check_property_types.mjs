import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Property = mongoose.model('Property', new mongoose.Schema({}, { strict: false }));
  const types = await Property.distinct('type');
  console.log('Existing property types in DB:', types);
  const count = await Property.countDocuments();
  console.log('Total properties count:', count);
  const sample = await Property.find({}, 'name type manager owner').limit(10);
  console.log('Sample properties:', JSON.stringify(sample, null, 2));
  await mongoose.disconnect();
  process.exit(0);
}
check().catch(err => {
  console.error(err);
  process.exit(1);
});
