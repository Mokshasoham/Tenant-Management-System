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
  recalculatePropertyRating,
} = await importServer('src/services/feedbackService.js');

const {
  getPropertyFeedback,
} = await importServer('src/controllers/feedbackController.js');

await mongoose.connect(process.env.MONGODB_URI);
console.log('MongoDB connected for Phase 4 tests.');

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
  // Create a test owner/manager
  const testOwner = await User.create({
    firstName: 'Phase4',
    lastName: 'Owner',
    email: `phase4_owner_${Date.now()}@example.com`,
    password: 'Password123!',
    role: 'manager',
  });

  console.log('\n=== TEST 1: Zero-Review Property Empty State Contract ===');
  // Create a clean dummy property with 0 reviews
  const zeroReviewProp = await Property.create({
    owner: testOwner._id,
    name: 'Phase 4 Zero Review Test Property',
    description: 'Empty reviews test',
    rentAmount: 15000,
    depositAmount: 30000,
    type: 'apartment',
    bedrooms: 2,
    bathrooms: 2,
    address: '404 Empty Lane',
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

  const req1 = { params: { propertyId: zeroReviewProp._id.toString() } };
  const res1 = mockResponse();
  await getPropertyFeedback(req1, res1);

  if (res1.statusCode !== 200 || !res1.body?.success) {
    console.error('FAIL: getPropertyFeedback failed for zero review property', res1.body);
    failures++;
  } else {
    const data = res1.body.data;
    console.log('Zero review response data:', {
      propertyRating: data.propertyRating,
      reviewCount: data.reviewCount,
      verifiedReviewCount: data.verifiedReviewCount,
      reviewsLength: data.reviews?.length,
    });

    if (data.propertyRating !== 0 || data.reviewCount !== 0 || data.verifiedReviewCount !== 0) {
      console.error('FAIL: zero review property returned non-zero count/rating');
      failures++;
    }
    if (!Array.isArray(data.reviews) || data.reviews.length !== 0) {
      console.error('FAIL: expected empty reviews array');
      failures++;
    }
  }

  console.log('\n=== TEST 2: Active Reviews Display & Mathematical Calculation ===');
  const reviewedProp = await Property.create({
    owner: testOwner._id,
    name: 'Phase 4 Reviewed Test Property',
    description: 'Reviewed property test',
    rentAmount: 25000,
    depositAmount: 50000,
    type: 'apartment',
    bedrooms: 3,
    bathrooms: 2,
    address: '42 Verified Court',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
  });

  const testTenant = await User.create({
    firstName: 'Confidential',
    lastName: 'Tenant',
    email: `confidential_tenant_${Date.now()}@example.com`,
    password: 'Password123!',
    role: 'tenant',
  });

  const testLease = await Lease.create({
    property: reviewedProp._id,
    tenant: testTenant._id,
    createdBy: testOwner._id,
    rentAmount: 25000,
    depositAmount: 50000,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    status: 'active',
  });

  const fb1 = await Feedback.create({
    lease: testLease._id,
    tenant: testTenant._id,
    property: reviewedProp._id,
    periodIndex: 1,
    periodStart: new Date('2026-01-08'),
    periodEnd: new Date('2026-01-29'),
    ratings: {
      propertyCondition: 5,
      cleanliness: 5,
      maintenance: 4,
      location: 5,
      valueForMoney: 4,
      safety: 5,
      management: 5,
    },
    overallRating: 4.7,
    comments: 'Outstanding place, loved the natural ventilation!',
    liked: 'Spacious balcony and prompt security staff.',
    improvements: 'None so far.',
    status: 'published',
  });

  const fb2 = await Feedback.create({
    lease: testLease._id,
    tenant: testTenant._id,
    property: reviewedProp._id,
    periodIndex: 2,
    periodStart: new Date('2026-01-29'),
    periodEnd: new Date('2026-02-19'),
    ratings: {
      propertyCondition: 4,
      cleanliness: 4,
      maintenance: 4,
      location: 5,
      valueForMoney: 4,
      safety: 4,
      management: 4,
    },
    overallRating: 4.1,
    comments: 'Very comfortable living experience overall.',
    liked: 'Prime location near transit.',
    improvements: 'Water pressure in guest bathroom could be slightly higher.',
    status: 'published',
  });

  const updatedRating = await recalculatePropertyRating(reviewedProp._id);
  console.log('Recalculated rating result:', {
    rating: updatedRating.rating,
    verifiedReviewCount: updatedRating.verifiedReviewCount,
    ratingBreakdown: updatedRating.ratingBreakdown,
  });

  if (updatedRating.verifiedReviewCount !== 2) {
    console.error(`FAIL: expected verifiedReviewCount = 2, got ${updatedRating.verifiedReviewCount}`);
    failures++;
  }
  if (updatedRating.rating < 4.3 || updatedRating.rating > 4.5) {
    console.error(`FAIL: unexpected rating ${updatedRating.rating}`);
    failures++;
  }

  const req2 = { params: { propertyId: reviewedProp._id.toString() } };
  const res2 = mockResponse();
  await getPropertyFeedback(req2, res2);

  if (res2.statusCode !== 200 || !res2.body?.success) {
    console.error('FAIL: getPropertyFeedback failed for reviewed property', res2.body);
    failures++;
  } else {
    const data = res2.body.data;
    console.log('Public feedback API response reviews count:', data.reviews?.length);
    if (data.reviews?.length !== 2) {
      console.error(`FAIL: expected 2 public reviews, got ${data.reviews?.length}`);
      failures++;
    }

    console.log('\n=== TEST 3: Strict Privacy & Anonymization Audit ===');
    for (const rev of data.reviews) {
      console.log('Inspecting public review payload:', {
        author: rev.author,
        overallRating: rev.overallRating,
        hasTenantId: !!rev.tenant,
        hasLeaseId: !!rev.lease,
        hasPhone: !!rev.phone,
        hasEmail: !!rev.email,
        comments: rev.comments?.slice(0, 30) + '...',
      });

      if (rev.author !== 'Verified Tenant') {
        console.error(`FAIL: expected author to be 'Verified Tenant', got '${rev.author}'`);
        failures++;
      }
      if (rev.tenant || rev.lease || rev.phone || rev.email) {
        console.error('FAIL: PRIVACY LEAK! Internal IDs or PII exposed in public feedback response!');
        failures++;
      }
      if (!rev.overallRating || !rev.submittedAt) {
        console.error('FAIL: missing required public display fields (overallRating or submittedAt)');
        failures++;
      }
    }
  }

  console.log('\n=== TEST 4: Cross-Property Data Isolation ===');
  const reqIso = { params: { propertyId: zeroReviewProp._id.toString() } };
  const resIso = mockResponse();
  await getPropertyFeedback(reqIso, resIso);

  if (resIso.body?.data?.reviews?.length !== 0) {
    console.error('FAIL: Cross-property contamination! Zero review property returned reviews from another property!');
    failures++;
  } else {
    console.log('PASS: Cross-property data isolation verified. Zero reviews returned for unreviewed property.');
  }

  await Feedback.deleteMany({ property: { $in: [zeroReviewProp._id, reviewedProp._id] } });
  await Lease.deleteOne({ _id: testLease._id });
  await User.deleteOne({ _id: testTenant._id });
  await User.deleteOne({ _id: testOwner._id });
  await Property.deleteMany({ _id: { $in: [zeroReviewProp._id, reviewedProp._id] } });
  console.log('Test cleanup completed.');

} catch (err) {
  console.error('Error running Phase 4 tests:', err);
  failures++;
} finally {
  await mongoose.disconnect();
  console.log('MongoDB disconnected.');
}

console.log('\n========================================');
console.log(`Phase 4 Test Suite Results: ${failures === 0 ? 'ALL PASSED' : failures + ' FAILURES'}`);
console.log('========================================\n');

process.exit(failures > 0 ? 1 : 0);
