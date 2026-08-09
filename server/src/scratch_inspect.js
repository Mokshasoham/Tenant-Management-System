import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management';

async function testPeopleQueries() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);

    const User = mongoose.connection.db.collection('users');

    const tenants = await User.find({ role: { $in: ['tenant', 'user', 'Tenant', 'User'] } }).toArray();
    console.log('\n--- GET /api/users/admin/people?role=tenant ---');
    console.log('Total Tenants Found:', tenants.length);
    tenants.forEach(t => console.log(`- ${t.firstName} ${t.lastName} (Role: "${t.role}", Email: ${t.email})`));

    const managers = await User.find({ role: { $in: ['manager', 'Manager'] } }).toArray();
    console.log('\n--- GET /api/users/admin/people?role=manager ---');
    console.log('Total Managers Found:', managers.length);
    managers.forEach(m => console.log(`- ${m.firstName} ${m.lastName} (Role: "${m.role}", Email: ${m.email})`));

    const technicians = await User.find({ role: { $in: ['technician', 'Technician'] } }).toArray();
    console.log('\n--- GET /api/users/admin/people?role=technician ---');
    console.log('Total Technicians Found:', technicians.length);
    technicians.forEach(tc => console.log(`- ${tc.firstName} ${tc.lastName} (Role: "${tc.role}", Email: ${tc.email})`));

    await mongoose.disconnect();
    console.log('\nDone testing people queries!');
  } catch (err) {
    console.error('Error:', err);
  }
}

testPeopleQueries();
