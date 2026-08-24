import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

async function isolateTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('Connected to database. Isolating test/demo data...');

    // 1. Find & Tag all test users
    const testUsersResult = await db.collection('users').updateMany(
      {
        $or: [
          { email: { $regex: '@test\\.com$', $options: 'i' } },
          { email: { $regex: '^manager_\\d+@test\\.com$', $options: 'i' } },
          { email: { $regex: '^tenant_\\d+@test\\.com$', $options: 'i' } },
          { firstName: { $regex: '^Manager Test', $options: 'i' } },
          { firstName: { $regex: '^Tenant Test', $options: 'i' } },
        ]
      },
      {
        $set: {
          isTest: true,
          isInternal: true
        }
      }
    );
    console.log(`Tagged ${testUsersResult.modifiedCount} test users with isTest: true, isInternal: true.`);

    // Get list of test user IDs
    const testUsers = await db.collection('users').find({
      $or: [
        { isTest: true },
        { isInternal: true },
        { email: { $regex: '@test\\.com$', $options: 'i' } }
      ]
    }).toArray();
    const testUserIds = testUsers.map(u => u._id);

    // 2. Find & Tag all test properties
    const testPropsResult = await db.collection('properties').updateMany(
      {
        $or: [
          { owner: { $in: testUserIds } },
          { manager: { $in: testUserIds } },
          { name: { $regex: '^Property [AB] \\(With', $options: 'i' } },
          { name: { $regex: 'Maintenance\\) \\d+', $options: 'i' } }
        ]
      },
      {
        $set: {
          isTest: true,
          isInternal: true,
          isArchived: true,
          publishStatus: 'archived',
          status: 'maintenance'
        }
      }
    );
    console.log(`Tagged ${testPropsResult.modifiedCount} test properties with isTest: true, isArchived: true, publishStatus: 'archived'.`);

    // 3. Ensure all legitimate real properties have publishStatus: 'published', isTest: false
    const realPropsResult = await db.collection('properties').updateMany(
      {
        _id: {
          $nin: (await db.collection('properties').find({ isTest: true }).toArray()).map(p => p._id)
        }
      },
      {
        $set: {
          isTest: false,
          isInternal: false,
          isArchived: false,
          publishStatus: 'published'
        }
      }
    );
    console.log(`Verified ${realPropsResult.modifiedCount} real properties as published.`);

    console.log('\n--- VERIFICATION OF PUBLIC PROPERTIES ---');
    const publicProps = await db.collection('properties').find({
      isTest: { $ne: true },
      isInternal: { $ne: true },
      isArchived: { $ne: true },
      isDeleted: { $ne: true },
      publishStatus: 'published',
      status: { $in: ['available', 'occupied', 'rented'] }
    }).toArray();

    console.log(`Total Publicly Discoverable Properties: ${publicProps.length}`);
    publicProps.forEach(p => console.log(`  - [${p._id}] ${p.name} (status: ${p.status}, publish: ${p.publishStatus})`));

    await mongoose.disconnect();
    console.log('\nMigration complete.');
  } catch (err) {
    console.error('Error during data isolation:', err);
    process.exit(1);
  }
}

isolateTestData();
