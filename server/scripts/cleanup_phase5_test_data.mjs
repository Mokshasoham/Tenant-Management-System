import path from 'path';
import { pathToFileURL } from 'url';

const serverDir = 'c:/Users/sanka/OneDrive/Desktop/tenant-management-system/server';
const importServer = (relPath) => import(pathToFileURL(path.join(serverDir, relPath)).href);
const { default: mongoose } = await importServer('node_modules/mongoose/index.js');
const { default: dotenv } = await importServer('node_modules/dotenv/lib/main.js');
dotenv.config({ path: path.join(serverDir, '.env') });

const Property = (await importServer('src/models/Property.js')).default;
const Lease = (await importServer('src/models/Lease.js')).default;
const User = (await importServer('src/models/User.js')).default;
const Tenant = (await importServer('src/models/Tenant.js')).default;
const Feedback = (await importServer('src/models/Feedback.js')).default;
const NotificationModel = (await importServer('src/models/Notification.js')).default;
const Booking = (await importServer('src/models/Booking.js')).default;
const Payment = (await importServer('src/models/Payment.js')).default;
const Maintenance = (await importServer('src/models/Maintenance.js')).default;

await mongoose.connect(process.env.MONGODB_URI);
console.log('MongoDB connected for safe cleanup.');

// Explicit Phase 5 test property ObjectIds identified from inspection
const phase5PropertyIds = [
  '6aabe0c5d114c6b9d1e5bb22', // Phase 5 Residency Block A
  '6aabe0c5d114c6b9d1e5bb30', // Phase 5 Residency Block B
  '6aabe12796dead7cf25b83ba', // Phase 5 Residency Block A
  '6aabe12796dead7cf25b83c1', // Phase 5 Residency Block B
  '6aabe1852bc13162cb1a37f7', // Phase 5 Residency Block A
  '6aabe1852bc13162cb1a3800', // Phase 5 Residency Block B
  '6aabf2bc14ebdf7f28bccff9', // Phase 5 Residency Block A (from 19:31 run)
  '6aabf2bc14ebdf7f28bcd000', // Phase 5 Residency Block B (from 19:31 run)
].map(id => new mongoose.Types.ObjectId(id));

// Phase 4 test property ObjectIds identified from inspection
const phase4PropertyIds = [
  '6aabdd8330a5ad7105fa1bb8', // Phase 4 Zero Review Test Property
  '6aabdd8330a5ad7105fa1bc6', // Phase 4 Reviewed Test Property
  '6aabdd91f1a085107d4434ef', // Phase 4 Zero Review Test Property
  '6aabdd91f1a085107d4434fd', // Phase 4 Reviewed Test Property
  '6aabf1b47161b2f541d81b89', // Phase 4 Zero Review Test Property (from 19:27 run)
  '6aabf1b47161b2f541d81b95', // Phase 4 Reviewed Test Property (from 19:27 run)
].map(id => new mongoose.Types.ObjectId(id));

const allTestPropertyIds = [...phase5PropertyIds, ...phase4PropertyIds];

// Pre-deletion safety check: verify that all IDs belong to test properties
const propertiesToDelete = await Property.find({ _id: { $in: allTestPropertyIds } }).lean();
console.log(`\nVerified ${propertiesToDelete.length} test properties to delete:`);
propertiesToDelete.forEach(p => {
  console.log(`  - [CONFIRMED TEST] ID: ${p._id} | Name: "${p.name}"`);
});

// Safeguard: Ensure no legitimate properties are in the target list
const legitimateNames = ['MOksha hieghts', 'house', 'Swaraj Villa', 'Ocean Pearl Residency', "moksha's apartment", 'Shree Ganesh Trade Center'];
const accidentalMatches = propertiesToDelete.filter(p => legitimateNames.some(legit => p.name.toLowerCase().includes(legit.toLowerCase())));
if (accidentalMatches.length > 0) {
  console.error('CRITICAL ABORT: Target list contains legitimate properties!', accidentalMatches);
  process.exit(1);
}

// Identify associated test Users (managers and tenants created by test scripts)
const testUsers = await User.find({
  $or: [
    { email: /^phase5_manager_/ },
    { email: /^aarav_tenant_/ },
    { email: /^bhavna_tenant_/ },
    { email: /^phase4_owner_/ },
    { email: /^confidential_tenant_/ },
  ]
}).lean();
const testUserIds = testUsers.map(u => u._id);

console.log(`\nVerified ${testUsers.length} test user accounts to delete.`);

// Identify associated test Tenants
const testTenants = await Tenant.find({
  $or: [
    { user: { $in: testUserIds } },
    { email: /^aarav_tenant_/ },
    { email: /^bhavna_tenant_/ },
    { email: /^confidential_tenant_/ },
  ]
}).lean();
const testTenantIds = testTenants.map(t => t._id);
console.log(`Verified ${testTenants.length} test tenant documents to delete.`);

// Identify associated test Leases
const testLeases = await Lease.find({
  $or: [
    { property: { $in: allTestPropertyIds } },
    { tenant: { $in: testTenantIds } },
  ]
}).lean();
const testLeaseIds = testLeases.map(l => l._id);
console.log(`Verified ${testLeases.length} test lease records to delete.`);

// Identify associated test Feedback
const testFeedback = await Feedback.find({
  $or: [
    { property: { $in: allTestPropertyIds } },
    { lease: { $in: testLeaseIds } },
    { tenant: { $in: testUserIds } },
  ]
}).lean();
console.log(`Verified ${testFeedback.length} test feedback records to delete.`);

// Identify associated test Notifications (only those sent to test users or with test lease keys)
const testNotifications = await NotificationModel.find({
  recipient: { $in: testUserIds }
}).lean();
console.log(`Verified ${testNotifications.length} test notifications to delete.`);

// Check for Bookings, Payments, Maintenance (should be 0)
const testBookings = await Booking.find({ property: { $in: allTestPropertyIds } }).lean();
const testPayments = await Payment.find({ property: { $in: allTestPropertyIds } }).lean();
const testMaintenance = await Maintenance.find({ property: { $in: allTestPropertyIds } }).lean();

console.log(`Test Bookings: ${testBookings.length}, Test Payments: ${testPayments.length}, Test Maintenance: ${testMaintenance.length}`);

// Perform safe targeted deletions
console.log('\n--- EXECUTING DELETIONS ---');
const delFeedback = await Feedback.deleteMany({
  $or: [
    { property: { $in: allTestPropertyIds } },
    { lease: { $in: testLeaseIds } },
    { tenant: { $in: testUserIds } },
  ]
});
console.log(`Deleted ${delFeedback.deletedCount} Feedback records.`);

const delNotifications = await NotificationModel.deleteMany({
  recipient: { $in: testUserIds }
});
console.log(`Deleted ${delNotifications.deletedCount} Notification records.`);

const delLeases = await Lease.deleteMany({
  $or: [
    { property: { $in: allTestPropertyIds } },
    { tenant: { $in: testTenantIds } },
  ]
});
console.log(`Deleted ${delLeases.deletedCount} Lease records.`);

const delTenants = await Tenant.deleteMany({
  _id: { $in: testTenantIds }
});
console.log(`Deleted ${delTenants.deletedCount} Tenant profile records.`);

const delProperties = await Property.deleteMany({
  _id: { $in: allTestPropertyIds }
});
console.log(`Deleted ${delProperties.deletedCount} Property records.`);

const delUsers = await User.deleteMany({
  _id: { $in: testUserIds }
});
console.log(`Deleted ${delUsers.deletedCount} User records.`);

if (testBookings.length > 0) {
  await Booking.deleteMany({ property: { $in: allTestPropertyIds } });
}
if (testPayments.length > 0) {
  await Payment.deleteMany({ property: { $in: allTestPropertyIds } });
}
if (testMaintenance.length > 0) {
  await Maintenance.deleteMany({ property: { $in: allTestPropertyIds } });
}

// Post-deletion verification:
console.log('\n--- POST-CLEANUP VERIFICATION ---');
const remainingTestProps = await Property.find({
  $or: [
    { name: /Phase 5/i },
    { name: /Phase 4/i },
  ]
}).lean();
console.log(`Remaining test properties matching "Phase": ${remainingTestProps.length}`);

const remainingLegitimate = await Property.find({}).lean();
console.log(`Total remaining properties in database: ${remainingLegitimate.length}`);
console.log('\nRemaining properties in DB:');
remainingLegitimate.forEach((p, idx) => {
  console.log(`  [${idx + 1}] ID: ${p._id} | Name: "${p.name}" | City: ${p.city} | Rent: ₹${p.rentAmount}`);
});

await mongoose.disconnect();
console.log('\nCleanup script completed successfully.');
