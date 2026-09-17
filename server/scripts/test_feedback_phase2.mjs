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
const Feedback = (await importServer('src/models/Feedback.js')).default;

const {
  getEligibility,
  submitFeedback,
} = await importServer('src/controllers/feedbackController.js');

await mongoose.connect(process.env.MONGODB_URI);
console.log('MongoDB connected.');

let failures = 0;

try {
  console.log('\n=== PHASE 2 TEST: Tenant Experience & Client Integration API Contract ===');

  const activeLease = await Lease.findOne({ status: 'active' }).populate('property').populate('tenant');
  console.log('Active lease ID:', activeLease._id, 'Property:', activeLease.property?.name);

  // Find tenant user for this lease
  let tenantUser = null;
  if (activeLease.tenant?.email) {
    tenantUser = await User.findOne({ email: new RegExp(`^${activeLease.tenant.email.trim()}$`, 'i') });
  }
  if (!tenantUser) {
    tenantUser = await User.findOne({ role: 'tenant' });
  }
  console.log('Tenant user:', tenantUser?.email, tenantUser?._id);

  // Clean up any test feedback first
  await Feedback.deleteMany({ lease: activeLease._id });

  const makeReq = (params = {}, body = {}) => ({
    params,
    body,
    user: {
      userId: tenantUser._id.toString(),
      _id: tenantUser._id,
      role: 'tenant',
    },
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

  // 1. Test GET /api/feedback/eligibility/:leaseId (consumed by LeaseFeedbackCard & MyLeasePage)
  const reqElig = makeReq({ leaseId: activeLease._id.toString() });
  const resElig = makeRes();
  await getEligibility(reqElig, resElig);

  const eligData = resElig.getData()?.data;
  console.log('Eligibility API response:');
  console.log('  Status:', eligData?.status);
  console.log('  Period Index:', eligData?.periodIndex);
  console.log('  Period Start:', eligData?.periodStart);
  console.log('  Period End:', eligData?.periodEnd);
  console.log('  Has Maintenance:', eligData?.hasMaintenance);
  console.log('  Property Amenities:', eligData?.propertyAmenities);
  console.log('  Property Type:', eligData?.propertyType);

  if (!eligData || !['DUE', 'UPCOMING', 'SUBMITTED'].includes(eligData.status)) {
    console.error('FAIL: Eligibility API response missing valid status');
    failures++;
  } else {
    console.log('PASS: Eligibility API response matches frontend contract.');
  }

  // 2. Test exact payload sent by TenantFeedbackModal
  if (eligData.status === 'DUE') {
    const modalPayload = {
      leaseId: activeLease._id.toString(),
      overallRating: 5,
      categoryRatings: {
        propertyCondition: 5,
        cleanliness: 5,
        maintenance: 4,
        location: 5,
        valueForMoney: 5,
        safety: 5,
        management: 5,
      },
      maintenanceFeedback: eligData.hasMaintenance ? {
        hadMaintenance: true,
        responseRating: 'fast',
        repairQuality: 'satisfied',
        communication: 'yes',
      } : undefined,
      propertyType: eligData.propertyType || 'apartment',
      propertyTypeAnswers: {
        waterSupply: 5,
        parking: 5,
        security: 5,
        commonAreas: 5,
      },
      amenitiesRatings: {},
      liked: 'Excellent apartment and location!',
      improvements: 'Everything is great.',
      comments: 'Submitting via Phase 2 TenantFeedbackModal test.',
    };

    const reqModalSubmit = makeReq({}, modalPayload);
    const resModalSubmit = makeRes();
    await submitFeedback(reqModalSubmit, resModalSubmit);

    const submitResult = resModalSubmit.getData();
    console.log('submitFeedback result status:', resModalSubmit.getStatus(), 'success:', submitResult?.success);

    if (resModalSubmit.getStatus() !== 201 || !submitResult?.success) {
      console.error('FAIL: Modal payload submission failed:', submitResult);
      failures++;
    } else {
      console.log('PASS: Modal payload submission succeeded!');
    }

    // 3. Re-query eligibility: Must immediately transition to SUBMITTED
    const resEligAfter = makeRes();
    await getEligibility(reqElig, resEligAfter);
    const eligAfter = resEligAfter.getData()?.data;

    console.log('Eligibility after submission:');
    console.log('  Status:', eligAfter?.status, '(expected: SUBMITTED)');
    console.log('  Rating:', eligAfter?.rating, '(expected: 5)');
    console.log('  Submitted At:', eligAfter?.submittedAt);
    console.log('  Next Feedback At:', eligAfter?.nextFeedbackAt);

    if (eligAfter?.status !== 'SUBMITTED' || eligAfter?.rating !== 5) {
      console.error('FAIL: Eligibility did not transition to SUBMITTED with recorded rating!');
      failures++;
    } else {
      console.log('PASS: Immediate transition to SUBMITTED state confirmed!');
    }
  }

  // Cleanup test feedback
  await Feedback.deleteMany({ lease: activeLease._id });
  const { recalculatePropertyRating } = await importServer('src/services/feedbackService.js');
  await recalculatePropertyRating(activeLease.property._id);
  console.log('Phase 2 test cleanup complete.');

} catch (err) {
  console.error('Phase 2 test error:', err);
  failures++;
} finally {
  await mongoose.disconnect();
  console.log('\nTotal failures:', failures);
  process.exit(failures > 0 ? 1 : 0);
}
