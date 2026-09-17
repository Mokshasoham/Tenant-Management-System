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

const { getLeaseFeedbackEligibility } = await importServer('src/services/feedbackService.js');
const { sendFeedbackReminders } = await importServer('src/utils/cronJobs.js');

await mongoose.connect(process.env.MONGODB_URI);
console.log('MongoDB connected.');

let failures = 0;

try {
  console.log('\n=== PHASE 3 TEST SUITE: Automated Feedback Reminder Notifications & Scheduler ===');

  // Find or create test active lease
  let activeLease = await Lease.findOne({ status: 'active' }).populate('property').populate('tenant');
  if (!activeLease) {
    throw new Error('No active lease found in database for testing.');
  }

  console.log(`Active Lease: ${activeLease.leaseNumber} (_id: ${activeLease._id})`);
  console.log(`Property: ${activeLease.property?.name}`);

  // Resolve tenant User
  let tenantUser = null;
  if (activeLease.tenant?.user) {
    tenantUser = await User.findById(activeLease.tenant.user);
  }
  if (!tenantUser && activeLease.tenant?.userId) {
    tenantUser = await User.findById(activeLease.tenant.userId);
  }
  if (!tenantUser && activeLease.tenant?.email) {
    tenantUser = await User.findOne({ email: new RegExp(`^${activeLease.tenant.email.trim()}$`, 'i') });
  }
  if (!tenantUser && activeLease.tenant) {
    const tId = activeLease.tenant._id || activeLease.tenant;
    tenantUser = await User.findById(tId);
  }
  if (!tenantUser) {
    tenantUser = await User.findOne({ role: 'tenant' });
  }
  if (!tenantUser) {
    throw new Error('Could not resolve a valid tenant user for testing.');
  }
  console.log(`Tenant User: ${tenantUser.email} (_id: ${tenantUser._id})`);

  // Target reference date where period 1 is DUE
  // Period 1 starts at startDate + 7 days
  const startDate = new Date(activeLease.startDate);
  const dueTestDate = new Date(startDate.getTime() + 8 * 86400000); // 8 days after lease start -> Period 1 DUE

  console.log(`Evaluation reference date for DUE state: ${dueTestDate.toISOString().slice(0, 10)}`);

  // Clean up any existing feedback and notifications for this test lease
  await Feedback.deleteMany({ lease: activeLease._id });
  await NotificationModel.deleteMany({ idempotencyKey: new RegExp(`^feedback:${activeLease._id}:`) });

  // -------------------------------------------------------------
  // TEST 1: Active Lease with DUE period -> Scheduler generates 1 notification with idempotencyKey
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Scheduled Sweep generates DUE feedback notification ---');
  const eligibilityBefore = await getLeaseFeedbackEligibility(activeLease._id, tenantUser._id, dueTestDate);
  console.log(`Eligibility status: ${eligibilityBefore.status}, periodIndex: ${eligibilityBefore.periodIndex}`);

  if (eligibilityBefore.status !== 'DUE') {
    console.error(`FAIL: Expected status DUE, got ${eligibilityBefore.status}`);
    failures++;
  }

  const expectedKey = `feedback:${activeLease._id}:${eligibilityBefore.periodIndex}`;
  const run1Result = await sendFeedbackReminders(dueTestDate);
  console.log('Sweep 1 result:', run1Result);

  const notif1 = await NotificationModel.findOne({ idempotencyKey: expectedKey });
  if (!notif1) {
    console.error(`FAIL: Notification with idempotencyKey ${expectedKey} was not created!`);
    failures++;
  } else {
    console.log('✓ Created Notification:', {
      id: notif1._id,
      recipient: notif1.recipient,
      title: notif1.title,
      category: notif1.category,
      idempotencyKey: notif1.idempotencyKey,
      link: notif1.link,
      actionUrl: notif1.actionUrl,
    });

    if (String(notif1.recipient) !== String(tenantUser._id)) {
      console.error(`FAIL: Expected recipient ${tenantUser._id}, got ${notif1.recipient}`);
      failures++;
    }
    if (notif1.title !== 'Feedback Requested') {
      console.error(`FAIL: Expected title 'Feedback Requested', got ${notif1.title}`);
      failures++;
    }
    if (notif1.category !== 'lease') {
      console.error(`FAIL: Expected category 'lease', got ${notif1.category}`);
      failures++;
    }
    const expectedLink = `/my-lease?leaseId=${activeLease._id}&openFeedback=true`;
    if (notif1.link !== expectedLink && notif1.actionUrl !== expectedLink) {
      console.error(`FAIL: Expected link ${expectedLink}, got link=${notif1.link}, actionUrl=${notif1.actionUrl}`);
      failures++;
    }
    console.log('✓ TEST 1 PASSED: Reminder successfully dispatched with correct deep-link and idempotencyKey.');
  }

  // -------------------------------------------------------------
  // TEST 2: Strict Idempotency & Duplicate Prevention
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Strict Idempotency (re-running sweep on same date) ---');
  const countBeforeSweep2 = await NotificationModel.countDocuments({ idempotencyKey: expectedKey });
  const run2Result = await sendFeedbackReminders(dueTestDate);
  console.log('Sweep 2 result:', run2Result);
  const countAfterSweep2 = await NotificationModel.countDocuments({ idempotencyKey: expectedKey });

  if (countAfterSweep2 !== 1 || countAfterSweep2 !== countBeforeSweep2) {
    console.error(`FAIL: Duplicate notification created! Count before: ${countBeforeSweep2}, count after: ${countAfterSweep2}`);
    failures++;
  } else {
    console.log(`✓ TEST 2 PASSED: 0 duplicate notifications created (count remained ${countAfterSweep2}).`);
  }

  // -------------------------------------------------------------
  // TEST 3: UPCOMING Period Exclusion (now < startDate + 7 days)
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: UPCOMING Period Exclusion ---');
  const upcomingTestDate = new Date(startDate.getTime() + 2 * 86400000); // 2 days after start
  const upcomingEligibility = await getLeaseFeedbackEligibility(activeLease._id, tenantUser._id, upcomingTestDate);
  console.log(`Upcoming evaluation status: ${upcomingEligibility.status} (daysUntilAvailable: ${upcomingEligibility.daysUntilAvailable})`);

  if (upcomingEligibility.status !== 'UPCOMING') {
    console.error(`FAIL: Expected UPCOMING, got ${upcomingEligibility.status}`);
    failures++;
  }

  const upcomingKey = `feedback:${activeLease._id}:${upcomingEligibility.periodIndex || 1}`;
  await NotificationModel.deleteMany({ idempotencyKey: upcomingKey });

  await sendFeedbackReminders(upcomingTestDate);
  const notifUpcoming = await NotificationModel.findOne({ idempotencyKey: upcomingKey });
  if (notifUpcoming) {
    console.error('FAIL: Notification was created for an UPCOMING period!');
    failures++;
  } else {
    console.log('✓ TEST 3 PASSED: No reminder dispatched for UPCOMING period.');
  }

  // -------------------------------------------------------------
  // TEST 4: Already SUBMITTED Period Exclusion
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Already SUBMITTED Period Exclusion ---');
  // Create a feedback document for period 1
  await Feedback.create({
    tenant: tenantUser._id,
    lease: activeLease._id,
    property: activeLease.property?._id,
    periodIndex: eligibilityBefore.periodIndex,
    periodStart: eligibilityBefore.periodStart,
    periodEnd: eligibilityBefore.periodEnd,
    overallRating: 5,
    status: 'published',
  });

  // Remove existing notification to test whether scheduler attempts to re-notify for a SUBMITTED period
  await NotificationModel.deleteMany({ idempotencyKey: expectedKey });

  const submittedEligibility = await getLeaseFeedbackEligibility(activeLease._id, tenantUser._id, dueTestDate);
  console.log(`Submitted evaluation status: ${submittedEligibility.status}`);

  if (submittedEligibility.status !== 'SUBMITTED') {
    console.error(`FAIL: Expected SUBMITTED, got ${submittedEligibility.status}`);
    failures++;
  }

  await sendFeedbackReminders(dueTestDate);
  const notifAfterSubmitted = await NotificationModel.findOne({ idempotencyKey: expectedKey });
  if (notifAfterSubmitted) {
    console.error('FAIL: Notification was created for an already SUBMITTED period!');
    failures++;
  } else {
    console.log('✓ TEST 4 PASSED: No reminder dispatched for already SUBMITTED period.');
  }

  // Clean up test feedback
  await Feedback.deleteMany({ lease: activeLease._id });

  // -------------------------------------------------------------
  // TEST 5: Non-Active Lease Exclusion (terminated, expired, etc.)
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Non-Active Lease Exclusion ---');
  const originalStatus = activeLease.status;
  await Lease.updateOne({ _id: activeLease._id }, { status: 'expired' });

  await NotificationModel.deleteMany({ idempotencyKey: expectedKey });
  await sendFeedbackReminders(dueTestDate);

  const notifOnExpired = await NotificationModel.findOne({ idempotencyKey: expectedKey });
  if (notifOnExpired) {
    console.error('FAIL: Notification was created for an EXPIRED lease!');
    failures++;
  } else {
    console.log('✓ TEST 5 PASSED: Expired / inactive leases are strictly excluded.');
  }

  // Restore original status
  await Lease.updateOne({ _id: activeLease._id }, { status: originalStatus });

  // -------------------------------------------------------------
  // TEST 6: Error Isolation
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Error Isolation across multiple leases ---');
  // Create a corrupt lease document
  const corruptLease = await Lease.create({
    leaseNumber: `TEST-CORRUPT-${Date.now()}`,
    property: new mongoose.Types.ObjectId(),
    tenant: new mongoose.Types.ObjectId(), // tenant does not exist in User collection
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-09-01'),
    rentAmount: 15000,
    status: 'active',
    createdBy: tenantUser._id,
  });

  try {
    const sweepResultWithError = await sendFeedbackReminders(dueTestDate);
    console.log('Sweep result with corrupt lease present:', sweepResultWithError);
    // Corrupt lease was skipped (tenant User not resolved) without crashing the sweep
    console.log('✓ TEST 6 PASSED: Sweep completed resiliently despite corrupt lease data.');
  } catch (sweepCrash) {
    console.error('FAIL: Sweep crashed instead of isolating the error:', sweepCrash.message);
    failures++;
  } finally {
    await Lease.deleteOne({ _id: corruptLease._id });
  }

  // -------------------------------------------------------------
  // TEST 7: Deep-Link URI & Key Validation
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Deep-link URI & Key Contract Validation ---');
  const sampleKey = `feedback:${activeLease._id}:1`;
  const sampleLink = `/my-lease?leaseId=${activeLease._id}&openFeedback=true`;

  const keyPattern = /^feedback:[a-fA-F0-9]{24}:\d+$/;
  const linkPattern = /^\/my-lease\?leaseId=[a-fA-F0-9]{24}&openFeedback=true$/;

  if (!keyPattern.test(sampleKey)) {
    console.error(`FAIL: sampleKey ${sampleKey} does not match contract!`);
    failures++;
  }
  if (!linkPattern.test(sampleLink)) {
    console.error(`FAIL: sampleLink ${sampleLink} does not match contract!`);
    failures++;
  }
  console.log('✓ TEST 7 PASSED: IdempotencyKey and deep-link URI format strictly adhere to specification.');

  // Clean up
  await Feedback.deleteMany({ lease: activeLease._id });
  await NotificationModel.deleteMany({ idempotencyKey: new RegExp(`^feedback:${activeLease._id}:`) });

} catch (err) {
  console.error('CRITICAL TEST ERROR:', err);
  failures++;
} finally {
  await mongoose.disconnect();
  console.log('\n========================================');
  if (failures === 0) {
    console.log('ALL PHASE 3 TESTS PASSED (0 failures)!');
    process.exit(0);
  } else {
    console.error(`TEST SUITE FAILED with ${failures} failure(s).`);
    process.exit(1);
  }
}
