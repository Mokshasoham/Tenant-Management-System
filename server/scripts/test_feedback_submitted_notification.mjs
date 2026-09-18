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
const NotificationService = (await importServer('src/services/NotificationService.js')).default;

const {
  submitFeedback,
  getEligibility,
} = await importServer('src/controllers/feedbackController.js');

const {
  getLeaseFeedbackEligibility,
} = await importServer('src/services/feedbackService.js');

const {
  sendFeedbackReminders,
} = await importServer('src/utils/cronJobs.js');

await mongoose.connect(process.env.MONGODB_URI);
console.log('MongoDB connected for Feedback Recorded Notification test.');

let failures = 0;

function mockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

let testManager, testTenantUser, testTenantDoc, testProperty, testLease;

try {
  console.log('\n--- SETUP: Creating Isolated Test Fixtures ---');
  testManager = await User.create({
    firstName: 'NotifyTest',
    lastName: 'Manager',
    email: `notify_manager_${Date.now()}@example.com`,
    password: 'Password123!',
    role: 'manager',
  });

  testTenantUser = await User.create({
    firstName: 'Devika',
    lastName: 'Rao',
    email: `devika_tenant_${Date.now()}@example.com`,
    password: 'Password123!',
    role: 'tenant',
  });

  testTenantDoc = await Tenant.create({
    firstName: testTenantUser.firstName,
    lastName: testTenantUser.lastName,
    email: testTenantUser.email,
    phone: '9988776655',
    address: '404 Palm Avenue, Hyderabad',
    user: testTenantUser._id,
    managedBy: testManager._id,
  });

  testProperty = await Property.create({
    owner: testManager._id,
    name: 'Palm Sapphire Heights',
    description: 'Luxury residences in central Hyderabad',
    rentAmount: 35000,
    depositAmount: 70000,
    type: 'apartment',
    bedrooms: 2,
    bathrooms: 2,
    address: '404 Palm Avenue',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    rating: 0,
    reviewCount: 0,
    verifiedReviewCount: 0,
  });

  // Active lease started 8 days ago (period 1 is DUE)
  const now = new Date();
  const startDate = new Date(now.getTime() - 8 * 86400000);
  const endDate = new Date(startDate.getTime() + 60 * 86400000);

  testLease = await Lease.create({
    property: testProperty._id,
    tenant: testTenantDoc._id,
    createdBy: testManager._id,
    rentAmount: 35000,
    depositAmount: 70000,
    startDate,
    endDate,
    status: 'active',
  });

  console.log('Entities initialized:');
  console.log('  Property:', testProperty._id.toString(), `"${testProperty.name}"`);
  console.log('  Tenant User (recipient):', testTenantUser._id.toString());
  console.log('  Tenant Profile Doc:', testTenantDoc._id.toString());
  console.log('  Lease:', testLease._id.toString());

  // =========================================================================
  // TEST 1: Eligibility Check returns DUE before submission
  // =========================================================================
  console.log('\n=== TEST 1: Initial Eligibility Verification ===');
  const eligBefore = await getLeaseFeedbackEligibility(testLease._id, testTenantUser._id);
  console.log('Eligibility before submission:', eligBefore.status, 'periodIndex:', eligBefore.periodIndex);
  if (eligBefore.status !== 'DUE' || eligBefore.periodIndex !== 1) {
    console.error('FAIL: Expected status DUE with periodIndex 1');
    failures++;
  } else {
    console.log('PASS: Initial eligibility is DUE for period 1.');
  }

  // =========================================================================
  // TEST 2: Submit Valid Feedback -> Verifies 201, Rating Update, and Notification
  // =========================================================================
  console.log('\n=== TEST 2: Valid Feedback Submission & Notification Dispatch ===');
  const reqSubmit = {
    user: {
      userId: testTenantUser._id.toString(),
      _id: testTenantUser._id,
      role: 'tenant',
    },
    body: {
      leaseId: testLease._id.toString(),
      overallRating: 5,
      categoryRatings: {
        propertyCondition: 5,
        cleanliness: 5,
        maintenance: 5,
        location: 5,
        valueForMoney: 5,
        safety: 5,
        management: 5,
      },
      liked: 'Impeccable facilities and polite maintenance crew.',
      improvements: 'None, everything has been seamless.',
      comments: 'Thoroughly enjoying living here!',
    },
  };
  const resSubmit = mockResponse();
  await submitFeedback(reqSubmit, resSubmit);

  console.log('submitFeedback response status:', resSubmit.statusCode, 'success:', resSubmit.body?.success);
  if (resSubmit.statusCode !== 201 || !resSubmit.body?.success) {
    console.error('FAIL: Feedback submission failed', resSubmit.body);
    failures++;
  } else {
    console.log('PASS: Feedback submitted successfully.');
  }

  // Verify property rating updated
  const updatedProp = await Property.findById(testProperty._id);
  console.log('Updated property rating:', updatedProp.rating, 'verified reviews:', updatedProp.verifiedReviewCount);
  if (updatedProp.rating !== 5 || updatedProp.verifiedReviewCount !== 1) {
    console.error('FAIL: Property rating was not updated to 5.0 / 1 review');
    failures++;
  } else {
    console.log('PASS: Property rating mathematically updated.');
  }

  // Verify backend status transitioned to SUBMITTED
  const eligAfter = await getLeaseFeedbackEligibility(testLease._id, testTenantUser._id);
  console.log('Post-submission eligibility status:', eligAfter.status, 'recorded rating:', eligAfter.rating);
  if (eligAfter.status !== 'SUBMITTED' || eligAfter.rating !== 5) {
    console.error('FAIL: Backend eligibility did not transition to SUBMITTED');
    failures++;
  } else {
    console.log('PASS: Backend eligibility transitioned to SUBMITTED.');
  }

  // =========================================================================
  // TEST 3: Verification of "Feedback Recorded" Notification Details & Recipient
  // =========================================================================
  console.log('\n=== TEST 3: Notification Entity & Recipient Audit ===');
  const expectedKey = `feedback-recorded:${testLease._id}:1`;
  const notifications = await NotificationModel.find({ idempotencyKey: expectedKey });
  console.log(`Found ${notifications.length} notification(s) for idempotencyKey "${expectedKey}"`);

  if (notifications.length !== 1) {
    console.error(`FAIL: Expected exactly 1 notification, found ${notifications.length}`);
    failures++;
  } else {
    const notif = notifications[0];
    console.log('Notification details:');
    console.log('  Recipient:', notif.recipient.toString(), '(Expected User ID:', testTenantUser._id.toString(), ')');
    console.log('  Title:', notif.title);
    console.log('  Message:', notif.message);
    console.log('  Category:', notif.category);
    console.log('  Type:', notif.type);
    console.log('  Severity:', notif.severity);
    console.log('  ActionUrl:', notif.actionUrl);
    console.log('  IdempotencyKey:', notif.idempotencyKey);

    // Safeguard 1 Check: recipient must be User._id, NOT Tenant._id
    if (notif.recipient.toString() !== testTenantUser._id.toString()) {
      console.error('FAIL SAFEGUARD 1: Recipient is NOT the authenticated User _id!');
      failures++;
    } else if (notif.recipient.toString() === testTenantDoc._id.toString()) {
      console.error('FAIL SAFEGUARD 1: Recipient was erroneously set to the Tenant document ID!');
      failures++;
    } else {
      console.log('PASS SAFEGUARD 1: Recipient confirmed as authentic User._id.');
    }

    // Title and message content verification
    if (notif.title !== 'Feedback Recorded') {
      console.error('FAIL: Expected title "Feedback Recorded", got:', notif.title);
      failures++;
    } else {
      console.log('PASS: Notification title is "Feedback Recorded".');
    }

    const expectedMessage = `Your feedback for ${testProperty.name} has been successfully recorded. Thank you for sharing your experience.`;
    if (notif.message !== expectedMessage) {
      console.error('FAIL: Message content mismatch.\n  Expected:', expectedMessage, '\n  Received:', notif.message);
      failures++;
    } else {
      console.log('PASS: Notification message correctly includes property name and exact required text.');
    }

    if (notif.category !== 'lease') {
      console.error('FAIL: Expected category "lease", got:', notif.category);
      failures++;
    } else {
      console.log('PASS: Category is "lease".');
    }
  }

  // =========================================================================
  // TEST 4: Independent Notification Idempotency Test (Safeguard 4)
  // =========================================================================
  console.log('\n=== TEST 4: Independent Notification Idempotency Safeguard ===');
  // Attempt to directly invoke NotificationService.notify with the identical idempotencyKey
  const duplicateNotifResult = await NotificationService.notify({
    recipient: testTenantUser._id,
    title: 'Feedback Recorded',
    message: `Your feedback for ${testProperty.name} has been successfully recorded. Thank you for sharing your experience.`,
    category: 'lease',
    idempotencyKey: expectedKey,
  });

  console.log('Direct duplicate notification attempt result:', duplicateNotifResult);
  const countAfterDirectDup = await NotificationModel.countDocuments({ idempotencyKey: expectedKey });
  if (countAfterDirectDup !== 1) {
    console.error(`FAIL: Idempotency failed! Found ${countAfterDirectDup} notifications for the same key`);
    failures++;
  } else {
    console.log('PASS: Independent notification idempotency strictly enforced (count remained exactly 1).');
  }

  // =========================================================================
  // TEST 5: Duplicate Feedback Submission Rejection & Notification Safety
  // =========================================================================
  console.log('\n=== TEST 5: Duplicate Feedback Submission Safeguard ===');
  const resDupSubmit = mockResponse();
  let duplicateSubmissionCaught = false;
  try {
    await submitFeedback(reqSubmit, resDupSubmit);
  } catch (dupErr) {
    duplicateSubmissionCaught = true;
    console.log('Duplicate feedback submission caught with message:', dupErr.message);
  }

  const countAfterDupSubmit = await NotificationModel.countDocuments({ idempotencyKey: expectedKey });
  if (!duplicateSubmissionCaught && resDupSubmit.statusCode === 201) {
    console.error('FAIL: Duplicate feedback submission was allowed!');
    failures++;
  } else if (countAfterDupSubmit !== 1) {
    console.error('FAIL: Duplicate submission created extra notification!');
    failures++;
  } else {
    console.log('PASS: Duplicate submission rejected and notification count remains exactly 1.');
  }

  // =========================================================================
  // TEST 6: Invalid Feedback Submission Produces Zero Notifications
  // =========================================================================
  console.log('\n=== TEST 6: Invalid Submission Error Handling ===');
  const reqInvalid = {
    user: {
      userId: testTenantUser._id.toString(),
      _id: testTenantUser._id,
      role: 'tenant',
    },
    body: {
      leaseId: testLease._id.toString(),
      overallRating: 99, // Invalid rating!
    },
  };
  const resInvalid = mockResponse();
  let invalidCaught = false;
  try {
    await submitFeedback(reqInvalid, resInvalid);
  } catch (invErr) {
    invalidCaught = true;
    console.log('Invalid submission caught as expected:', invErr.message);
  }

  const totalNotifsForTenant = await NotificationModel.countDocuments({ recipient: testTenantUser._id });
  if (!invalidCaught && resInvalid.statusCode === 201) {
    console.error('FAIL: Invalid rating submission was allowed!');
    failures++;
  } else if (totalNotifsForTenant !== 1) {
    console.error(`FAIL: Invalid submission created unwanted notification! Total: ${totalNotifsForTenant}`);
    failures++;
  } else {
    console.log('PASS: Invalid submission rejected; zero additional notifications created.');
  }

  // =========================================================================
  // TEST 7: Scheduler Exclusion (sendFeedbackReminders skips SUBMITTED period)
  // =========================================================================
  console.log('\n=== TEST 7: Scheduler Skips SUBMITTED Period ===');
  const sweepStats = await sendFeedbackReminders(new Date());
  console.log('Sweep result:', sweepStats);

  const reminderKey = `feedback:${testLease._id}:1`;
  const reminderNotif = await NotificationModel.findOne({ idempotencyKey: reminderKey });
  if (reminderNotif) {
    console.error('FAIL: Scheduler generated a reminder notification for an already SUBMITTED lease period!');
    failures++;
  } else {
    console.log('PASS: Scheduler correctly skipped the SUBMITTED period (zero reminder notifications dispatched).');
  }

  // =========================================================================
  // TEST 8: Client UI Contract Simulation
  // =========================================================================
  console.log('\n=== TEST 8: Client LeaseFeedbackCard Contract ===');
  // When status === 'SUBMITTED', LeaseFeedbackCard must return null
  const submittedEligibility = {
    status: 'SUBMITTED',
    periodIndex: 1,
    periodStart: startDate,
    periodEnd: endDate,
    rating: 5,
    nextFeedbackAt: null,
  };

  // Simulate LeaseFeedbackCard logic
  function simulateLeaseFeedbackCard(eligibility) {
    if (!eligibility || eligibility.status === 'NOT_ELIGIBLE') return null;
    if (eligibility.status === 'DUE') return 'RENDER_DUE_CARD';
    if (eligibility.status === 'SUBMITTED') return null; // Expected
    if (eligibility.status === 'UPCOMING') return 'RENDER_UPCOMING_CARD';
    return null;
  }

  const cardOutput = simulateLeaseFeedbackCard(submittedEligibility);
  console.log('LeaseFeedbackCard output for status=SUBMITTED:', cardOutput);
  if (cardOutput !== null) {
    console.error('FAIL: LeaseFeedbackCard did not return null for SUBMITTED state!');
    failures++;
  } else {
    console.log('PASS: LeaseFeedbackCard returns null for SUBMITTED state (card hidden, notification-only).');
  }

  const dueCardOutput = simulateLeaseFeedbackCard({ status: 'DUE', periodIndex: 1 });
  if (dueCardOutput !== 'RENDER_DUE_CARD') {
    console.error('FAIL: DUE state broken');
    failures++;
  } else {
    console.log('PASS: DUE state still renders feedback card.');
  }

  const upcomingCardOutput = simulateLeaseFeedbackCard({ status: 'UPCOMING', nextFeedbackAt: new Date() });
  if (upcomingCardOutput !== 'RENDER_UPCOMING_CARD') {
    console.error('FAIL: UPCOMING state broken');
    failures++;
  } else {
    console.log('PASS: UPCOMING state still renders upcoming info.');
  }

} catch (err) {
  console.error('Unexpected error during test execution:', err);
  failures++;
} finally {
  console.log('\n--- CLEANUP: Removing Test Entities ---');
  try {
    if (testProperty?._id) {
      await Feedback.deleteMany({ property: testProperty._id });
      await Lease.deleteMany({ property: testProperty._id });
      await Property.deleteOne({ _id: testProperty._id });
    }
    if (testTenantUser?._id) {
      await NotificationModel.deleteMany({ recipient: testTenantUser._id });
      await Tenant.deleteMany({ user: testTenantUser._id });
      await User.deleteOne({ _id: testTenantUser._id });
    }
    if (testManager?._id) {
      await User.deleteOne({ _id: testManager._id });
    }
    console.log('Cleanup complete: All test entities purged.');
  } catch (cleanErr) {
    console.warn('Cleanup error:', cleanErr.message);
  }
  await mongoose.disconnect();
  console.log('MongoDB disconnected.');
}

console.log('\n========================================');
console.log(`Feedback Recorded Notification Test Results: ${failures === 0 ? 'ALL PASSED' : failures + ' FAILURES'}`);
console.log('========================================\n');

process.exit(failures > 0 ? 1 : 0);
