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
console.log('MongoDB connected successfully for database inspection.');
console.log('Target database:', mongoose.connection.name);

// 1. Inspect ALL properties
const allProperties = await Property.find({}).populate('owner').lean();
console.log(`\nTotal properties found in DB: ${allProperties.length}`);

const legitimate = allProperties.filter(p => !p.name?.includes('Phase') && !p.name?.includes('Test'));
const testProperties = allProperties.filter(p => p.name?.includes('Phase') || p.name?.includes('Test'));

console.log(`\n=== LEGITIMATE PROPERTIES (${legitimate.length}) ===`);
legitimate.forEach((p, idx) => {
  console.log(`[${idx + 1}] ID: ${p._id} | Name: "${p.name}" | City: ${p.city} | Rent: ₹${p.rentAmount} | Owner: ${p.owner?.name || `${p.owner?.firstName || ''} ${p.owner?.lastName || ''}`.trim() || p.owner}`);
});

console.log(`\n=== TEST PROPERTIES TO REMOVE (${testProperties.length}) ===`);
testProperties.forEach((p, idx) => {
  console.log(`[${idx + 1}] ID: ${p._id} | Name: "${p.name}" | Created: ${p.createdAt} | Owner: ${p.owner?.firstName} ${p.owner?.lastName} (${p.owner?.email})`);
});

console.log(`\nFound ${testProperties.length} test property records to investigate.`);

// 3. Detailed inspection for each test property
const testPropertyIds = testProperties.map(p => p._id);

const relatedLeases = await Lease.find({ property: { $in: testPropertyIds } }).populate('tenant').populate('property').lean();
const relatedFeedback = await Feedback.find({ property: { $in: testPropertyIds } }).lean();
const relatedBookings = await Booking.find({ property: { $in: testPropertyIds } }).lean();
const relatedPayments = await Payment.find({ property: { $in: testPropertyIds } }).lean();
const relatedMaintenance = await Maintenance.find({ property: { $in: testPropertyIds } }).lean();

console.log('\n--- DETAILED INSPECTION OF TEST PROPERTIES ---');
for (const p of testProperties) {
  const leases = relatedLeases.filter(l => l.property?._id?.toString() === p._id.toString() || l.property?.toString() === p._id.toString());
  const feedbacks = relatedFeedback.filter(f => f.property?.toString() === p._id.toString());
  const bookings = relatedBookings.filter(b => b.property?.toString() === p._id.toString());
  const payments = relatedPayments.filter(pay => pay.property?.toString() === p._id.toString());
  const maintenance = relatedMaintenance.filter(m => m.property?.toString() === p._id.toString());

  console.log(`\nProperty: "${p.name}"`);
  console.log(`  ID: ${p._id}`);
  console.log(`  Created: ${p.createdAt}`);
  console.log(`  Owner: ${p.owner?.firstName} ${p.owner?.lastName} (${p.owner?.email}) ID: ${p.owner?._id}`);
  console.log(`  Associated Leases: ${leases.length}`);
  leases.forEach(l => console.log(`    - Lease ID: ${l._id}, Status: ${l.status}, Tenant: ${l.tenant?.email || l.tenant}`));
  console.log(`  Associated Feedback: ${feedbacks.length}`);
  feedbacks.forEach(f => console.log(`    - Feedback ID: ${f._id}, Period: ${f.periodIndex}, Rating: ${f.overallRating}, Status: ${f.status}`));
  console.log(`  Associated Bookings: ${bookings.length}`);
  console.log(`  Associated Payments: ${payments.length}`);
  console.log(`  Associated Maintenance: ${maintenance.length}`);
}

// 4. Test Users & Tenants created by Phase 5
const testUsers = await User.find({
  $or: [
    { email: /^phase5_manager_/ },
    { email: /^aarav_tenant_/ },
    { email: /^bhavna_tenant_/ },
    { email: /^phase4_owner_/ },
    { email: /^confidential_tenant_/ },
  ]
}).lean();

console.log(`\n--- TEST USERS CREATED DURING QA (${testUsers.length} found) ---`);
testUsers.forEach(u => {
  console.log(`  User: ${u.firstName} ${u.lastName} (${u.email}) [Role: ${u.role}] ID: ${u._id}`);
});

const testUserIds = testUsers.map(u => u._id);
const testTenants = await Tenant.find({
  $or: [
    { user: { $in: testUserIds } },
    { email: /^aarav_tenant_/ },
    { email: /^bhavna_tenant_/ },
    { email: /^confidential_tenant_/ },
  ]
}).lean();

console.log(`\n--- TEST TENANT PROFILES (${testTenants.length} found) ---`);
testTenants.forEach(t => {
  console.log(`  Tenant: ${t.firstName} ${t.lastName} (${t.email}) ID: ${t._id}`);
});

const testNotifications = await NotificationModel.find({
  $or: [
    { recipient: { $in: testUserIds } },
    { idempotencyKey: { $regex: /^feedback:/ } }
  ]
}).lean();

console.log(`\n--- TEST NOTIFICATIONS (${testNotifications.length} found) ---`);
testNotifications.forEach(n => {
  console.log(`  Notif ID: ${n._id}, Recipient: ${n.recipient}, Title: ${n.title}, Key: ${n.idempotencyKey}`);
});

await mongoose.disconnect();
console.log('\nInspection complete. MongoDB disconnected.');
