import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

import User from '../src/models/User.js';
import Tenant from '../src/models/Tenant.js';
import Property from '../src/models/Property.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management-system';

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    // Create demo users
    const salt = await bcryptjs.genSalt(10);

    const adminPassword = await bcryptjs.hash('Admin@1234', salt);
    const managerPassword = await bcryptjs.hash('Manager@1234', salt);
    const userPassword = await bcryptjs.hash('User@1234', salt);

    const users = [
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@gmail.com',
        password: adminPassword,
        phone: '+1 (555) 111-1111',
        role: 'admin',
        isActive: true,
      },
      {
        firstName: 'Manager',
        lastName: 'User',
        email: 'manager@gmail.com',
        password: managerPassword,
        phone: '+1 (555) 222-2222',
        role: 'manager',
        isActive: true,
      },
      {
        firstName: 'Regular',
        lastName: 'User',
        email: 'user@example.com',
        password: userPassword,
        phone: '+1 (555) 333-3333',
        role: 'user',
        isActive: true,
      },
    ];

    const createdUsers = await User.insertMany(users);
    console.log('✅ Created demo users:');
    createdUsers.forEach((user) => {
      console.log(`  - ${user.email} (${user.role})`);
    });

    // Create demo tenants
    const tenants = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1 (555) 444-4444',
        address: '123 Main St, Downtown, New York, NY 10001',
        occupationStatus: 'employed',
        occupation: 'Software Engineer',
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'Spouse',
          phone: '+1 (555) 555-5555',
        },
        managedBy: createdUsers[1]._id,
        status: 'active',
      },
      {
        firstName: 'Sarah',
        lastName: 'Smith',
        email: 'sarah.smith@example.com',
        phone: '+1 (555) 666-6666',
        address: '456 Oak Ave, Suburb, Boston, MA 02101',
        occupationStatus: 'employed',
        occupation: 'Nurse',
        emergencyContact: {
          name: 'Mike Smith',
          relationship: 'Brother',
          phone: '+1 (555) 777-7777',
        },
        managedBy: createdUsers[1]._id,
        status: 'active',
      },
    ];

    const createdTenants = await Tenant.insertMany(tenants);
    console.log('✅ Created demo tenants:');
    createdTenants.forEach((tenant) => {
      console.log(`  - ${tenant.firstName} ${tenant.lastName}`);
    });

    // Create demo properties
    const properties = [
      {
        name: 'Downtown Apartment',
        address: '123 Main St, Downtown',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        type: 'apartment',
        bedrooms: 2,
        bathrooms: 1,
        size: 900,
        rentAmount: 2000,
        amenities: ['WiFi', 'Parking', 'Gym'],
        owner: createdUsers[1]._id,
        status: 'available',
      },
      {
        name: 'Suburban House',
        address: '456 Oak Ave, Suburb',
        city: 'Boston',
        state: 'MA',
        zipCode: '02101',
        type: 'house',
        bedrooms: 3,
        bathrooms: 2,
        size: 1500,
        rentAmount: 2500,
        amenities: ['Garden', 'Garage', 'Patio'],
        owner: createdUsers[1]._id,
        status: 'occupied',
        currentOccupant: createdTenants[0]._id,
      },
    ];

    const createdProperties = await Property.insertMany(properties);
    console.log('✅ Created demo properties:');
    createdProperties.forEach((property) => {
      console.log(`  - ${property.name} (${property.rentAmount}/month)`);
    });

    console.log('\n✅ Database seeded successfully!');
    console.log('\nDemo Credentials:');
    console.log('  Admin:   admin@gmail.com / Admin@1234');
    console.log('  Manager: manager@gmail.com / Manager@1234');
    console.log('  User:    user@example.com / User@1234');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
