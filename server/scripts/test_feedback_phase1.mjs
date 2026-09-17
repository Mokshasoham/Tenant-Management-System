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

const {
  calculateFeedbackIntervalDays,
  calculateFeedbackPeriods,
  getLeaseFeedbackEligibility,
  recalculatePropertyRating,
  isUserLeaseOwner,
} = await importServer('src/services/feedbackService.js');

const {
  submitFeedback,
  getEligibility,
  getMyFeedback,
  getPropertyFeedback,
  updateFeedbackStatus,
} = await importServer('src/controllers/feedbackController.js');

await mongoose.connect(process.env.MONGODB_URI);
console.log('MongoDB connected.');

let failures = 0;

try {
  console.log('\n=== TEST 1: Deterministic Interval & Period Calculations ===');
  // 1-month lease (31 days)
  const lease1m = {
    startDate: new Date('2026-08-22T00:00:00.000Z'),
    endDate: new Date('2026-09-22T00:00:00.000Z'),
  };
  const interval1m = calculateFeedbackIntervalDays(lease1m);
  console.log('1-month interval:', interval1m, 'days (expected: 7)');
  if (interval1m !== 7) { console.error('FAIL: 1m interval'); failures++; }

  const periods1m = calculateFeedbackPeriods(lease1m);
  console.log(`1-month periods count: ${periods1m.length}`);
  periods1m.forEach(p => {
    console.log(`  Period ${p.periodIndex}: ${p.periodStart.toISOString().slice(0, 10)} -> ${p.periodEnd.toISOString().slice(0, 10)}`);
  });

  if (periods1m.length !== 4) {
    console.error(`FAIL: expected 4 periods, got ${periods1m.length}`);
    failures++;
  }
  // Period 1: 29 Aug -> 5 Sep
  if (periods1m[0].periodStart.toISOString().slice(0, 10) !== '2026-08-29' ||
      periods1m[0].periodEnd.toISOString().slice(0, 10) !== '2026-09-05') {
    console.error('FAIL: Period 1 boundaries mismatch');
    failures++;
  }
  // Period 4 capped at lease end (22 Sep)
  if (periods1m[3].periodEnd.toISOString().slice(0, 10) !== '2026-09-22') {
    console.error('FAIL: Period 4 end should be capped at lease.endDate (2026-09-22)');
    failures++;
  }

  // 3-month lease (92 days)
  const lease3m = {
    startDate: new Date('2026-06-01T00:00:00.000Z'),
    endDate: new Date('2026-09-01T00:00:00.000Z'),
  };
  const interval3m = calculateFeedbackIntervalDays(lease3m);
  console.log('3-month interval:', interval3m, 'days (expected: 14)');
  if (interval3m !== 14) { console.error('FAIL: 3m interval'); failures++; }

  // 1-year lease (365 days)
  const lease1y = {
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-12-31T00:00:00.000Z'),
  };
  const interval1y = calculateFeedbackIntervalDays(lease1y);
  console.log('1-year interval:', interval1y, 'days (expected: 21)');
  if (interval1y !== 21) { console.error('FAIL: 1y interval'); failures++; }

  console.log('\n=== TEST 2: Authoritative Eligibility Engine ===');
  // Find active lease in DB (moksha's apartment)
  const activeLease = await Lease.findOne({ status: 'active' }).populate('property').populate('tenant');
  console.log('Found active lease:', activeLease._id, 'Property:', activeLease.property?.name, 'Tenant email:', activeLease.tenant?.email);

  // Find tenant user associated with this active lease
  let tenantUser = null;
  if (activeLease.tenant?.email) {
    tenantUser = await User.findOne({ email: new RegExp(`^${activeLease.tenant.email.trim()}$`, 'i') });
  }
  if (!tenantUser && activeLease.tenant?.user) {
    tenantUser = await User.findById(activeLease.tenant.user);
  }
  if (!tenantUser) {
    tenantUser = await User.findOne({ role: 'tenant' });
  }
  console.log('Using tenant user:', tenantUser?.email, tenantUser?._id);

  // Test with non-owner
  const managerUser = await User.findOne({ role: 'manager' });
  const nonOwnerElig = await getLeaseFeedbackEligibility(activeLease._id, managerUser._id);
  console.log('Non-owner eligibility status:', nonOwnerElig.status, '(reason:', nonOwnerElig.reason, ')');
  if (nonOwnerElig.status !== 'NOT_ELIGIBLE') {
    console.error('FAIL: Non-owner should be NOT_ELIGIBLE');
    failures++;
  }

  console.log('Active lease duration:', activeLease.startDate.toISOString().slice(0, 10), 'to', activeLease.endDate.toISOString().slice(0, 10));

  // Test with owner during initial 7-day window (2 days after lease start)
  const earlyDate = new Date(activeLease.startDate.getTime() + 2 * 86400000);
  const earlyElig = await getLeaseFeedbackEligibility(activeLease._id, tenantUser._id, earlyDate);
  console.log(`Early window (${earlyDate.toISOString().slice(0, 10)}) status:`, earlyElig.status, 'nextFeedbackAt:', earlyElig.nextFeedbackAt?.toISOString());
  if (earlyElig.status !== 'UPCOMING') {
    console.error('FAIL: Early window should be UPCOMING');
    failures++;
  } else {
    console.log('PASS: Early window (<7 days) correctly returns UPCOMING');
  }

  // Test during Period 1 (8 days after lease start)
  const period1Date = new Date(activeLease.startDate.getTime() + 8 * 86400000);
  const p1Elig = await getLeaseFeedbackEligibility(activeLease._id, tenantUser._id, period1Date);
  console.log(`Period 1 (${period1Date.toISOString().slice(0, 10)}) status:`, p1Elig.status, 'periodIndex:', p1Elig.periodIndex);
  if (p1Elig.status !== 'DUE' || p1Elig.periodIndex !== 1) {
    console.error('FAIL: Period 1 should be DUE with periodIndex=1');
    failures++;
  } else {
    console.log('PASS: Period 1 correctly returns DUE with periodIndex=1');
  }

  // Test after lease ended (2 days after lease end)
  const expiredDate = new Date(activeLease.endDate.getTime() + 2 * 86400000);
  const expiredElig = await getLeaseFeedbackEligibility(activeLease._id, tenantUser._id, expiredDate);
  console.log(`After lease ended (${expiredDate.toISOString().slice(0, 10)}) status:`, expiredElig.status);
  if (expiredElig.status !== 'NOT_ELIGIBLE') {
    console.error('FAIL: After lease ended should be NOT_ELIGIBLE');
    failures++;
  } else {
    console.log('PASS: After lease ended correctly returns NOT_ELIGIBLE');
  }

  console.log('\n=== TEST 3: Feedback Submission & Safeguards ===');
  // Clean up any existing test feedback for this lease first
  await Feedback.deleteMany({ lease: activeLease._id });

  const makeReq = (body = {}, user = tenantUser) => ({
    body,
    user: {
      userId: user._id.toString(),
      _id: user._id,
      role: user.role,
    },
    params: {},
    query: {},
  });

  const makeRes = () => {
    let responseData = null;
    let statusCode = 200;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; },
      getData: () => responseData,
      getStatus: () => statusCode,
    };
    return res;
  };

  // Submit valid feedback for current period (September 17, 2026 is in Period 3: 12 Sep -> 19 Sep)
  const reqSubmit = makeReq({
    leaseId: activeLease._id.toString(),
    // Safeguard 1 test: provide a bogus propertyId, it MUST be ignored and derived from lease
    propertyId: '6a6ad33e9d5b3aa4fd5a387c', // Swaraj Villa ID
    overallRating: 5,
    categoryRatings: {
      propertyCondition: 5,
      cleanliness: 4,
      maintenance: 5,
      location: 5,
      valueForMoney: 4,
      safety: 5,
      management: 5,
    },
    propertyType: 'apartment',
    propertyTypeAnswers: {
      waterSupply: 5,
      parking: 4,
      security: 5,
      commonAreas: 4,
    },
    liked: 'Great location, calm neighborhood, super fast maintenance.',
    improvements: 'None so far, very satisfied!',
    comments: 'Loving the apartment.',
  });

  const resSubmit = makeRes();
  await submitFeedback(reqSubmit, resSubmit);

  const submitData = resSubmit.getData();
  console.log('submitFeedback response status:', resSubmit.getStatus(), 'success:', submitData?.success);
  if (resSubmit.getStatus() !== 201 || !submitData?.success) {
    console.error('FAIL: submitFeedback failed:', submitData);
    failures++;
  }

  const savedFeedback = submitData?.data;
  console.log('Saved feedback property:', savedFeedback?.property?.toString());
  console.log('Active lease property:', activeLease.property?._id?.toString());

  // Safeguard 1 verification: property must match activeLease.property, NOT bogus Swaraj Villa
  if (savedFeedback?.property?.toString() !== activeLease.property?._id?.toString()) {
    console.error('FAIL Safeguard 1: property was NOT derived from lease!');
    failures++;
  } else {
    console.log('PASS Safeguard 1: property was strictly derived from lease.property!');
  }

  // Check Property rating recalculation (Safeguard 2)
  const updatedProp = await Property.findById(activeLease.property._id);
  console.log('Updated Property rating:', updatedProp.rating, 'reviewCount:', updatedProp.reviewCount, 'verifiedReviewCount:', updatedProp.verifiedReviewCount);
  console.log('Updated Property ratingBreakdown:', updatedProp.ratingBreakdown);

  if (updatedProp.rating !== 5 || updatedProp.reviewCount !== 1 || updatedProp.verifiedReviewCount !== 1) {
    console.error('FAIL Safeguard 2: Property rating was not updated correctly!');
    failures++;
  } else {
    console.log('PASS Safeguard 2: Property rating and breakdown updated accurately!');
  }

  console.log('\n=== TEST 4: Duplicate Submission Prevention ===');
  // Attempt duplicate submission for same period
  const resDuplicate = makeRes();
  let duplicateCaught = false;
  try {
    await submitFeedback(reqSubmit, resDuplicate);
  } catch (err) {
    duplicateCaught = true;
    console.log('Duplicate submission correctly rejected with error:', err.message);
  }

  if (!duplicateCaught && resDuplicate.getStatus() === 201) {
    console.error('FAIL: Duplicate submission was allowed!');
    failures++;
  } else {
    console.log('PASS: Duplicate submission was rejected!');
  }

  // Database unique index check
  let dbDuplicateError = false;
  try {
    await Feedback.create({
      tenant: tenantUser._id,
      lease: activeLease._id,
      property: activeLease.property._id,
      periodIndex: savedFeedback.periodIndex,
      periodStart: savedFeedback.periodStart,
      periodEnd: savedFeedback.periodEnd,
      overallRating: 4,
    });
  } catch (dbErr) {
    if (dbErr.code === 11000) {
      dbDuplicateError = true;
      console.log('Database compound unique index { lease: 1, periodIndex: 1 } enforced (E11000).');
    }
  }

  if (!dbDuplicateError) {
    console.error('FAIL: Database unique index did not throw E11000 on duplicate periodIndex!');
    failures++;
  } else {
    console.log('PASS: Database compound unique index verified.');
  }

  console.log('\n=== TEST 5: Public Anonymized Property Reviews API ===');
  const reqPublic = { params: { propertyId: activeLease.property._id.toString() } };
  const resPublic = makeRes();
  await getPropertyFeedback(reqPublic, resPublic);
  const publicData = resPublic.getData()?.data;

  console.log('Public endpoint propertyRating:', publicData?.propertyRating);
  console.log('Public endpoint verifiedReviewCount:', publicData?.verifiedReviewCount);
  console.log('Public reviews count:', publicData?.reviews?.length);
  console.log('Public review author:', publicData?.reviews?.[0]?.author);
  console.log('Public review has tenant ID?', Boolean(publicData?.reviews?.[0]?.tenant));
  console.log('Public review has lease ID?', Boolean(publicData?.reviews?.[0]?.lease));

  if (publicData?.reviews?.[0]?.author !== 'Verified Tenant') {
    console.error('FAIL: Public review author should be "Verified Tenant"');
    failures++;
  }
  if (publicData?.reviews?.[0]?.tenant || publicData?.reviews?.[0]?.lease) {
    console.error('FAIL: Public review exposes private tenant or lease ID!');
    failures++;
  } else {
    console.log('PASS: Public review data is properly anonymized.');
  }

  console.log('\n=== TEST 6: Moderation & Rating Recalculation ===');
  // Update feedback status to 'hidden'
  const reqMod = {
    params: { id: savedFeedback._id.toString() },
    body: { status: 'hidden' },
    user: managerUser,
  };
  const resMod = makeRes();
  await updateFeedbackStatus(reqMod, resMod);

  const propAfterHide = await Property.findById(activeLease.property._id);
  console.log('Property rating after hiding feedback:', propAfterHide.rating, 'reviewCount:', propAfterHide.reviewCount);
  if (propAfterHide.rating !== 0 || propAfterHide.reviewCount !== 0) {
    console.error('FAIL: Hiding feedback did not recalculate rating to 0!');
    failures++;
  } else {
    console.log('PASS: Hiding feedback correctly recalculated rating to 0.');
  }

  // Restore status to 'published'
  const reqRestore = {
    params: { id: savedFeedback._id.toString() },
    body: { status: 'published' },
    user: managerUser,
  };
  const resRestore = makeRes();
  await updateFeedbackStatus(reqRestore, resRestore);

  const propAfterRestore = await Property.findById(activeLease.property._id);
  console.log('Property rating after restoring feedback:', propAfterRestore.rating, 'reviewCount:', propAfterRestore.reviewCount);
  if (propAfterRestore.rating !== 5 || propAfterRestore.reviewCount !== 1) {
    console.error('FAIL: Restoring feedback did not recalculate rating back to 5!');
    failures++;
  } else {
    console.log('PASS: Restoring feedback correctly recalculated rating.');
  }

  // Cleanup test feedback
  await Feedback.deleteMany({ lease: activeLease._id });
  await recalculatePropertyRating(activeLease.property._id);
  console.log('Test feedback cleaned up and property rating reset.');

} catch (err) {
  console.error('Unexpected test error:', err);
  failures++;
} finally {
  await mongoose.disconnect();
  console.log('\nTotal failures:', failures);
  process.exit(failures > 0 ? 1 : 0);
}
