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

const {
  calculateFeedbackIntervalDays,
  calculateFeedbackPeriods,
  getLeaseFeedbackEligibility,
  recalculatePropertyRating,
  isUserLeaseOwner,
} = await importServer('src/services/feedbackService.js');

const {
  sendFeedbackReminders,
} = await importServer('src/utils/cronJobs.js');

const {
  submitFeedback,
  getEligibility,
  getMyFeedback,
  getPropertyFeedback,
  updateFeedbackStatus,
} = await importServer('src/controllers/feedbackController.js');

await mongoose.connect(process.env.MONGODB_URI);
console.log('MongoDB connected for Phase 5 End-to-End QA.');

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

try {
  console.log('\n--- SETUP: Creating Isolated Test Entities ---');
  const testOwner = await User.create({
    firstName: 'Phase5',
    lastName: 'Manager',
    email: `phase5_manager_${Date.now()}@example.com`,
    password: 'Password123!',
    role: 'manager',
  });

  const tenantA = await User.create({
    firstName: 'Aarav',
    lastName: 'Sharma',
    email: `aarav_tenant_${Date.now()}@example.com`,
    password: 'Password123!',
    role: 'tenant',
  });

  const tenantB = await User.create({
    firstName: 'Bhavna',
    lastName: 'Patel',
    email: `bhavna_tenant_${Date.now()}@example.com`,
    password: 'Password123!',
    role: 'tenant',
  });

  const tenantDocA = await Tenant.create({
    firstName: tenantA.firstName,
    lastName: tenantA.lastName,
    email: tenantA.email,
    phone: '9876543210',
    address: '101 Residency Road, Pune',
    user: tenantA._id,
    managedBy: testOwner._id,
  });

  const tenantDocB = await Tenant.create({
    firstName: tenantB.firstName,
    lastName: tenantB.lastName,
    email: tenantB.email,
    phone: '9876543211',
    address: '102 Residency Road, Pune',
    user: tenantB._id,
    managedBy: testOwner._id,
  });

  const propertyA = await Property.create({
    owner: testOwner._id,
    name: 'Phase 5 Residency Block A',
    description: 'High-end suburban apartments',
    rentAmount: 32000,
    depositAmount: 64000,
    type: 'apartment',
    bedrooms: 2,
    bathrooms: 2,
    address: '101 Residency Road',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    rating: 0,
    reviewCount: 0,
    verifiedReviewCount: 0,
    ratingBreakdown: {
      propertyCondition: 0,
      cleanliness: 0,
      maintenance: 0,
      location: 0,
      valueForMoney: 0,
      safety: 0,
      management: 0,
    },
  });

  const propertyB = await Property.create({
    owner: testOwner._id,
    name: 'Phase 5 Residency Block B',
    description: 'Modern urban units',
    rentAmount: 28000,
    depositAmount: 56000,
    type: 'apartment',
    bedrooms: 1,
    bathrooms: 1,
    address: '102 Residency Road',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    rating: 0,
    reviewCount: 0,
    verifiedReviewCount: 0,
  });

  // Leases currently active
  const now = new Date();
  const leaseAStart = new Date(now.getTime() - 8 * 86400000); // 8 days ago
  const leaseAEnd = new Date(leaseAStart.getTime() + 60 * 86400000); // 60-day lease (14-day interval)
  const leaseBStart = new Date(now.getTime() - 10 * 86400000);
  const leaseBEnd = new Date(leaseBStart.getTime() + 365 * 86400000); // 1-year lease (21-day interval)

  // 60-day lease for Tenant A on Property A
  const leaseA = await Lease.create({
    property: propertyA._id,
    tenant: tenantDocA._id,
    createdBy: testOwner._id,
    rentAmount: 32000,
    depositAmount: 64000,
    startDate: leaseAStart,
    endDate: leaseAEnd,
    status: 'active',
  });

  // 1-year lease for Tenant B on Property B
  const leaseB = await Lease.create({
    property: propertyB._id,
    tenant: tenantDocB._id,
    createdBy: testOwner._id,
    rentAmount: 28000,
    depositAmount: 56000,
    startDate: leaseBStart,
    endDate: leaseBEnd,
    status: 'active',
  });

  console.log('Entities initialized:');
  console.log('Property A:', propertyA._id.toString(), 'Lease A:', leaseA._id.toString());
  console.log('Property B:', propertyB._id.toString(), 'Lease B:', leaseB._id.toString());

  // =========================================================================
  // TEST SUITE 1: Full End-to-End Feedback Lifecycle
  // =========================================================================
  console.log('\n=== TEST 1: Full End-to-End Lifecycle Flow ===');
  // 1.1 Before Day 7 occupancy: UPCOMING state
  const day3 = new Date(leaseAStart.getTime() + 3 * 86400000);
  const eligDay3 = await getLeaseFeedbackEligibility(leaseA._id, tenantA._id, day3);
  console.log('Day 3 eligibility status:', eligDay3.status, '(expected: UPCOMING)');
  if (eligDay3.status !== 'UPCOMING') {
    console.error('FAIL: Day 3 (<7 days occupancy) must be UPCOMING');
    failures++;
  }

  // 1.2 On Day 8 occupancy (today): DUE for Period 1
  const day8 = now;
  const eligDay8 = await getLeaseFeedbackEligibility(leaseA._id, tenantA._id, day8);
  console.log('Day 8 eligibility status:', eligDay8.status, 'periodIndex:', eligDay8.periodIndex, '(expected: DUE, 1)');
  if (eligDay8.status !== 'DUE' || eligDay8.periodIndex !== 1) {
    console.error('FAIL: Day 8 must be DUE for periodIndex 1');
    failures++;
  }

  // 1.3 Scheduler sweep triggers notification
  await NotificationModel.deleteMany({ idempotencyKey: new RegExp(`^feedback:${leaseA._id}`) });
  const sweepRes = await sendFeedbackReminders(day8);
  const createdNotif = await NotificationModel.findOne({ idempotencyKey: `feedback:${leaseA._id}:1` });
  console.log('Scheduler notification created:', !!createdNotif, 'link:', createdNotif?.link);
  if (!createdNotif || createdNotif.link !== `/my-lease?leaseId=${leaseA._id}&openFeedback=true`) {
    console.error('FAIL: Expected reminder notification with correct deep-link');
    failures++;
  } else {
    console.log('PASS: Reminder notification dispatched with deep-link and idempotencyKey.');
  }

  // 1.4 Repeated scheduler sweep produces 0 duplicate notifications (idempotency)
  await sendFeedbackReminders(day8);
  const notifCount = await NotificationModel.countDocuments({ idempotencyKey: `feedback:${leaseA._id}:1` });
  console.log('Notification count after re-sweep:', notifCount, '(expected: 1)');
  if (notifCount !== 1) {
    console.error('FAIL: Idempotency violated; duplicate notifications created');
    failures++;
  } else {
    console.log('PASS: Re-running scheduler sweep produced zero duplicates.');
  }

  // 1.5 Tenant submits feedback via API
  const submitReq = {
    user: { _id: tenantA._id, userId: tenantA._id.toString(), role: 'tenant' },
    body: {
      leaseId: leaseA._id.toString(),
      periodIndex: 1,
      periodStart: eligDay8.periodStart,
      periodEnd: eligDay8.periodEnd,
      overallRating: 4.7,
      ratings: {
        propertyCondition: 5,
        cleanliness: 5,
        maintenance: 4,
        location: 5,
        valueForMoney: 5,
        safety: 5,
        management: 4,
      },
      comments: 'Quiet community with prompt building maintenance.',
      liked: 'Underground parking and security staff.',
      improvements: 'Gym equipment upgrade would be great.',
    },
  };
  const submitRes = mockResponse();
  await submitFeedback(submitReq, submitRes);
  console.log('Feedback submission response status:', submitRes.statusCode, submitRes.body?.success);
  if (submitRes.statusCode !== 201 || !submitRes.body?.success) {
    console.error('FAIL: Feedback submission failed', submitRes.body);
    failures++;
  } else {
    console.log('PASS: Feedback submitted successfully.');
  }

  // 1.6 Verify persisted Feedback entity invariants
  const savedFeedback = await Feedback.findOne({ lease: leaseA._id, periodIndex: 1 });
  console.log('Saved feedback verification:', {
    hasPropertyA: savedFeedback?.property?.toString() === propertyA._id.toString(),
    hasTenantA: savedFeedback?.tenant?.toString() === tenantA._id.toString(),
    hasLeaseA: savedFeedback?.lease?.toString() === leaseA._id.toString(),
    periodIndex: savedFeedback?.periodIndex,
    overallRating: savedFeedback?.overallRating,
    status: savedFeedback?.status,
  });
  if (
    !savedFeedback ||
    savedFeedback.property.toString() !== propertyA._id.toString() ||
    savedFeedback.tenant.toString() !== tenantA._id.toString() ||
    savedFeedback.periodIndex !== 1 ||
    savedFeedback.status !== 'published'
  ) {
    console.error('FAIL: Feedback record has mismatched relational bindings');
    failures++;
  } else {
    console.log('PASS: Feedback entity relational integrity verified.');
  }

  // 1.7 Post-submission eligibility immediately becomes SUBMITTED
  const eligPostSubmit = await getLeaseFeedbackEligibility(leaseA._id, tenantA._id, day8);
  console.log('Post-submission eligibility status:', eligPostSubmit.status, '(expected: SUBMITTED)');
  if (eligPostSubmit.status !== 'SUBMITTED') {
    console.error('FAIL: Eligibility must transition immediately to SUBMITTED');
    failures++;
  } else {
    console.log('PASS: Eligibility transitioned to SUBMITTED.');
  }

  // 1.8 Scheduler sweep now ignores SUBMITTED period
  const preSweepNotifCount = await NotificationModel.countDocuments({ recipient: tenantA._id });
  await sendFeedbackReminders(day8);
  const postSweepNotifCount = await NotificationModel.countDocuments({ recipient: tenantA._id });
  if (postSweepNotifCount !== preSweepNotifCount) {
    console.error('FAIL: Reminder dispatched for already SUBMITTED period');
    failures++;
  } else {
    console.log('PASS: Scheduler correctly skipped SUBMITTED period.');
  }

  // =========================================================================
  // TEST SUITE 2: Deterministic Boundary Intervals (≤31, 32-93, >93 days)
  // =========================================================================
  console.log('\n=== TEST 2: Deterministic Interval & Period Boundary Rules ===');
  const lease31 = { startDate: new Date('2026-01-01'), endDate: new Date('2026-02-01') }; // 31 days
  const lease32 = { startDate: new Date('2026-01-01'), endDate: new Date('2026-02-02') }; // 32 days
  const lease93 = { startDate: new Date('2026-01-01'), endDate: new Date('2026-04-04') }; // 93 days
  const lease94 = { startDate: new Date('2026-01-01'), endDate: new Date('2026-04-05') }; // 94 days

  const int31 = calculateFeedbackIntervalDays(lease31);
  const int32 = calculateFeedbackIntervalDays(lease32);
  const int93 = calculateFeedbackIntervalDays(lease93);
  const int94 = calculateFeedbackIntervalDays(lease94);

  console.log(`Boundary intervals: 31d=${int31} (exp 7), 32d=${int32} (exp 14), 93d=${int93} (exp 14), 94d=${int94} (exp 21)`);
  if (int31 !== 7 || int32 !== 14 || int93 !== 14 || int94 !== 21) {
    console.error('FAIL: Exact boundary interval calculation failed');
    failures++;
  } else {
    console.log('PASS: All boundary intervals strictly adhere to rules.');
  }

  // Verify all period dates remain within lease boundaries
  const periodsA = calculateFeedbackPeriods(leaseA);
  console.log(`Lease A periods count: ${periodsA.length}`);
  let boundsViolated = false;
  periodsA.forEach(p => {
    if (p.periodStart < leaseA.startDate || p.periodEnd > leaseA.endDate) {
      boundsViolated = true;
    }
  });
  if (boundsViolated) {
    console.error('FAIL: Period dates exceeded lease boundary dates');
    failures++;
  } else {
    console.log('PASS: All period boundaries strictly contained within lease duration.');
  }

  // =========================================================================
  // TEST SUITE 3: Duplicate Submission Prevention (API & DB Unique Index)
  // =========================================================================
  console.log('\n=== TEST 3: Duplicate Submission Prevention ===');
  // API duplicate check
  let apiDupCaught = false;
  try {
    const dupRes = mockResponse();
    await submitFeedback(submitReq, dupRes);
  } catch (err) {
    if (err.statusCode === 400 && err.message?.includes('already been submitted')) {
      apiDupCaught = true;
      console.log('PASS: Duplicate submission rejected with 400 at controller layer:', err.message);
    }
  }
  if (!apiDupCaught) {
    console.error('FAIL: Duplicate submission was not rejected by API');
    failures++;
  }

  // Direct DB compound unique index enforcement { lease: 1, periodIndex: 1 }
  let dbDuplicateCaught = false;
  try {
    await Feedback.create({
      lease: leaseA._id,
      tenant: tenantA._id,
      property: propertyA._id,
      periodIndex: 1,
      periodStart: eligDay8.periodStart,
      periodEnd: eligDay8.periodEnd,
      overallRating: 5,
      status: 'published',
    });
  } catch (err) {
    if (err.code === 11000) {
      dbDuplicateCaught = true;
      console.log('PASS: Database compound unique index E11000 caught duplicate insert.');
    }
  }
  if (!dbDuplicateCaught) {
    console.error('FAIL: MongoDB unique index failed to reject duplicate { lease, periodIndex }');
    failures++;
  }

  // =========================================================================
  // TEST SUITE 4: Rating Consistency, Mathematical Accuracy & Moderation
  // =========================================================================
  console.log('\n=== TEST 4: Rating Consistency & Moderation Recalculation ===');
  // Add Period 2 feedback for Property A to test multi-review weighted average
  const fbP2 = await Feedback.create({
    lease: leaseA._id,
    tenant: tenantA._id,
    property: propertyA._id,
    periodIndex: 2,
    periodStart: new Date(leaseAStart.getTime() + 21 * 86400000),
    periodEnd: new Date(leaseAStart.getTime() + 35 * 86400000),
    ratings: {
      propertyCondition: 4,
      cleanliness: 4,
      maintenance: 3,
      location: 4,
      valueForMoney: 4,
      safety: 4,
      management: 3,
    },
    overallRating: 3.7,
    comments: 'Good overall, slight maintenance delay this month.',
    status: 'published',
  });

  await recalculatePropertyRating(propertyA._id);
  const propA = await Property.findById(propertyA._id);
  console.log('Updated property ratings:', {
    rating: propA.rating,
    verifiedReviewCount: propA.verifiedReviewCount,
    ratingBreakdown: propA.ratingBreakdown,
  });

  // Expected combined rating: (savedFeedback.overallRating + fbP2.overallRating) / 2
  // savedFeedback overall = 4.7
  // fbP2 overall = 3.7
  // Expected average = (4.7 + 3.7)/2 = 4.2
  if (propA.verifiedReviewCount !== 2 || propA.rating !== 4.2) {
    console.error(`FAIL: Expected rating 4.2 with count 2, got rating ${propA.rating} count ${propA.verifiedReviewCount}`);
    failures++;
  } else {
    console.log('PASS: Mathematical rating average accurately updated.');
  }

  // Moderation test: Hide fbP2
  fbP2.status = 'hidden';
  await fbP2.save();
  await recalculatePropertyRating(propertyA._id);
  const propAfterHide = await Property.findById(propertyA._id);
  console.log('Property rating after hiding fbP2:', propAfterHide.rating, 'count:', propAfterHide.verifiedReviewCount);
  if (propAfterHide.verifiedReviewCount !== 1 || propAfterHide.rating !== 4.7) {
    console.error(`FAIL: Hidden feedback must be excluded from public property rating`);
    failures++;
  } else {
    console.log('PASS: Moderation hiding accurately reflected in property rating.');
  }

  // Restore fbP2
  fbP2.status = 'published';
  await fbP2.save();
  await recalculatePropertyRating(propertyA._id);

  // =========================================================================
  // TEST SUITE 5: Privacy Audit & Public Feedback Contract
  // =========================================================================
  console.log('\n=== TEST 5: Privacy & Anonymization Audit ===');
  const pubReq = { params: { propertyId: propertyA._id.toString() } };
  const pubRes = mockResponse();
  await getPropertyFeedback(pubReq, pubRes);

  if (pubRes.statusCode !== 200 || !pubRes.body?.success) {
    console.error('FAIL: Public property feedback API failed', pubRes.body);
    failures++;
  } else {
    const reviews = pubRes.body.data.reviews;
    console.log(`Public feedback returned ${reviews.length} reviews.`);

    let privacyViolation = false;
    reviews.forEach((r, idx) => {
      console.log(`Review ${idx + 1} author:`, r.author);
      if (r.author !== 'Verified Tenant') {
        privacyViolation = true;
      }
      if (r.tenant || r.lease || r.email || r.phone || r.userId || r._id === tenantA._id.toString()) {
        privacyViolation = true;
      }
    });

    if (privacyViolation) {
      console.error('FAIL: PRIVACY AUDIT FAILED! Public reviews exposed tenant/lease PII or identifiers!');
      failures++;
    } else {
      console.log('PASS: Privacy audit passed with 100% anonymization as "Verified Tenant".');
    }
  }

  // =========================================================================
  // TEST SUITE 6: Cross-Property & Multi-Tenant Isolation
  // =========================================================================
  console.log('\n=== TEST 6: Cross-Property & Multi-Tenant Isolation ===');
  // Property B has 0 feedback submissions
  const pubReqB = { params: { propertyId: propertyB._id.toString() } };
  const pubResB = mockResponse();
  await getPropertyFeedback(pubReqB, pubResB);

  const reviewsB = pubResB.body?.data?.reviews || [];
  console.log('Property B public reviews count:', reviewsB.length, 'rating:', pubResB.body?.data?.propertyRating);
  if (reviewsB.length !== 0 || pubResB.body?.data?.propertyRating !== 0) {
    console.error('FAIL: Cross-property leak! Property B returned reviews belonging to Property A!');
    failures++;
  } else {
    console.log('PASS: Cross-property isolation verified at API level.');
  }

  // Unauthorized tenant submission attempt: Tenant B attempts to submit feedback for Lease A
  let crossTenantBlocked = false;
  try {
    const unauthReq = {
      user: { _id: tenantB._id, userId: tenantB._id.toString(), role: 'tenant' },
      body: {
        leaseId: leaseA._id.toString(),
        periodIndex: 3,
        overallRating: 5,
        ratings: { propertyCondition: 5 },
      },
    };
    const unauthRes = mockResponse();
    await submitFeedback(unauthReq, unauthRes);
  } catch (err) {
    if (err.statusCode === 403) {
      crossTenantBlocked = true;
      console.log('PASS: Cross-tenant feedback submission strictly blocked with 403 Forbidden:', err.message);
    }
  }
  if (!crossTenantBlocked) {
    console.error('FAIL: Cross-tenant feedback submission was not rejected with 403');
    failures++;
  }

  // =========================================================================
  // TEST SUITE 7: Existing Core Workflows & Schema Regression Safeguards
  // =========================================================================
  console.log('\n=== TEST 7: Existing Core Workflows Regression Safeguards ===');
  // 7.1 Property integrity: rentAmount, depositAmount, privateDeal remain untouched
  const verifiedProp = await Property.findById(propertyA._id);
  if (verifiedProp.rentAmount !== 32000 || verifiedProp.depositAmount !== 64000) {
    console.error('FAIL: Property rentAmount or depositAmount corrupted');
    failures++;
  } else {
    console.log('PASS: Property financial fields unaltered.');
  }

  // 7.2 Lease integrity: rentAmount, depositAmount, status remain untouched
  const verifiedLease = await Lease.findById(leaseA._id);
  if (verifiedLease.rentAmount !== 32000 || verifiedLease.status !== 'active') {
    console.error('FAIL: Lease financial fields or status corrupted');
    failures++;
  } else {
    console.log('PASS: Lease financial fields and active status unaltered.');
  }

  // 7.3 User accounts unaltered
  const verifiedTenant = await User.findById(tenantA._id);
  if (verifiedTenant.role !== 'tenant' || verifiedTenant.email !== tenantA.email) {
    console.error('FAIL: Tenant user record corrupted');
    failures++;
  } else {
    console.log('PASS: User authentication and role intact.');
  }

  // =========================================================================
  // CLEANUP
  // =========================================================================
  console.log('\n--- CLEANUP: Removing Phase 5 Test Data ---');
  await Feedback.deleteMany({ property: { $in: [propertyA._id, propertyB._id] } });
  await NotificationModel.deleteMany({ recipient: { $in: [tenantA._id, tenantB._id] } });
  await Lease.deleteMany({ _id: { $in: [leaseA._id, leaseB._id] } });
  await Tenant.deleteMany({ _id: { $in: [tenantDocA._id, tenantDocB._id] } });
  await Property.deleteMany({ _id: { $in: [propertyA._id, propertyB._id] } });
  await User.deleteMany({ _id: { $in: [testOwner._id, tenantA._id, tenantB._id] } });
  console.log('Cleanup complete.');

} catch (err) {
  console.error('Fatal error during Phase 5 QA test:', err);
  failures++;
} finally {
  await mongoose.disconnect();
  console.log('MongoDB disconnected.');
}

console.log('\n========================================');
console.log(`Phase 5 Comprehensive QA Results: ${failures === 0 ? 'ALL PASSED' : failures + ' FAILURES'}`);
console.log('========================================\n');

process.exit(failures > 0 ? 1 : 0);
