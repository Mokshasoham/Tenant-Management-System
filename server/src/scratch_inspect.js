import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management';

async function inspectDb() {
  try {
    console.log('Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully!');

    const db = mongoose.connection.db;

    // Collections
    const collections = await db.listCollections().toArray();
    console.log('Collections in DB:', collections.map(c => c.name));

    // Users
    const users = await db.collection('users').find({}).toArray();
    console.log('\n--- USERS COUNT:', users.length);
    const rolesCount = {};
    users.forEach(u => {
      rolesCount[u.role] = (rolesCount[u.role] || 0) + 1;
      console.log(`User ID: ${u._id} | Name: ${u.firstName} ${u.lastName} | Role: "${u.role}" | Email: ${u.email} | Active: ${u.isActive}`);
    });
    console.log('Roles breakdown:', rolesCount);

    // Tenants
    if (collections.some(c => c.name === 'tenants')) {
      const tenants = await db.collection('tenants').find({}).toArray();
      console.log('\n--- TENANTS COLLECTION COUNT:', tenants.length);
      tenants.forEach(t => {
        console.log(`Tenant ID: ${t._id} | UserRef: ${t.user} | PropertyRef: ${t.property} | Name: ${t.firstName || t.name}`);
      });
    }

    // Properties
    const properties = await db.collection('properties').find({}).toArray();
    console.log('\n--- PROPERTIES COUNT:', properties.length);
    properties.forEach(p => {
      console.log(`Property ID: ${p._id} | Name: ${p.name} | City: ${p.city} | Manager: ${p.manager} | Owner: ${p.owner} | Location:`, p.location);
    });

    // Maintenance
    const maintenance = await db.collection('maintenances').find({}).toArray();
    console.log('\n--- MAINTENANCE COUNT:', maintenance.length);

    // Leases
    const leases = await db.collection('leases').find({}).toArray();
    console.log('\n--- LEASES COUNT:', leases.length);

    await mongoose.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error('Error inspecting DB:', err);
  }
}

inspectDb();
