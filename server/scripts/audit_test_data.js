import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const testUsers = await db.collection('users').find({
    $or: [
      { email: { $regex: '@test\\.com$', $options: 'i' } },
      { email: { $regex: 'test', $options: 'i' } },
      { firstName: { $regex: 'Test', $options: 'i' } },
      { lastName: { $regex: 'Test', $options: 'i' } }
    ]
  }).toArray();
  console.log('--- TEST USERS (', testUsers.length, ') ---');
  testUsers.forEach(u => console.log(`ID: ${u._id} | Email: ${u.email} | Name: ${u.firstName} ${u.lastName}`));

  const testUserIds = testUsers.map(u => u._id);
  const testProps = await db.collection('properties').find({
    $or: [
      { owner: { $in: testUserIds } },
      { manager: { $in: testUserIds } },
      { name: { $regex: 'Property [AB] \\(With', $options: 'i' } }
    ]
  }).toArray();
  console.log('\n--- TEST PROPERTIES (', testProps.length, ') ---');
  testProps.forEach(p => console.log(`ID: ${p._id} | Name: ${p.name} | Owner: ${p.owner}`));

  const realProps = await db.collection('properties').find({
    _id: { $nin: testProps.map(p => p._id) }
  }).toArray();
  console.log('\n--- REAL PROPERTIES (', realProps.length, ') ---');
  realProps.forEach(p => console.log(`ID: ${p._id} | Name: ${p.name} | Owner: ${p.owner}`));

  await mongoose.disconnect();
}

audit();
