import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import Offer from '../src/models/Offer.js';
import Booking from '../src/models/Booking.js';
import Lease from '../src/models/Lease.js';

import { getPropertyById } from '../src/controllers/propertyController.js';
import { createOffer, respondToOffer } from '../src/controllers/offerController.js';
import { requestBooking } from '../src/controllers/bookingController.js';
import { calculateLeaseDuration, formatDateRange } from '../src/utils/dateDurationHelper.js';

function mockReqRes(user, body = {}, params = {}, query = {}) {
  const req = {
    user: user ? {
      userId: user._id.toString(),
      _id: user._id,
      id: user._id.toString(),
      role: user.role || 'tenant',
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    } : null,
    body,
    params,
    query,
    headers: {},
    get: () => 'localhost:5000',
  };

  let resStatus = 200;
  let resJson = null;

  const res = {
    status(s) {
      resStatus = s;
      return this;
    },
    json(j) {
      resJson = j;
      return this;
    },
    getStatus: () => resStatus,
    getJson: () => resJson,
  };

  const next = (err) => {
    if (err) {
      resStatus = err.statusCode || err.status || 500;
      resJson = {
        success: false,
        statusCode: resStatus,
        message: err.message,
        error: err
      };
    }
  };

  return { req, res, next, getStatus: () => resStatus, getJson: () => resJson };
}

async function run() {
  console.log('================================================================');
  console.log('🚀 NEGOTIATED LEASE PERIOD & DEALFLOW E2E INTEGRATION SUITE');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB:', mongoose.connection.name);

  // Find published property with a manager
  const property = await Property.findOne({
    publishStatus: 'published',
    status: 'available',
    isDeleted: { $ne: true }
  }).populate('manager');

  if (!property) {
    throw new Error('No available published property found for test.');
  }

  const manager = await User.findById(property.manager?._id || property.owner);
  const tenant1 = await User.findOne({ role: 'tenant', isDeleted: { $ne: true } });
  const tenant2 = await User.findOne({ role: 'tenant', _id: { $ne: tenant1._id }, isDeleted: { $ne: true } });

  if (!manager || !tenant1 || !tenant2) {
    throw new Error('Need manager and at least 2 distinct tenant users for testing.');
  }

  const origRent = property.rentAmount;
  const origNegotiation = property.negotiation ? { ...property.negotiation.toObject() } : null;

  const tOfferedRent = Math.round(origRent * 0.85); // 15% discount
  const mCounterRent = Math.round(origRent * 0.92); // 8% discount

  // Configure property negotiation for test
  property.negotiation = {
    enabled: true,
    availability: 'all',
    minAcceptableRent: Math.round(origRent * 0.70),
    offerValidityHours: 72,
    maxRounds: 5
  };
  await property.save();

  // Clean any previous test offers/bookings for this tenant and property
  await Offer.deleteMany({ property: property._id, fromUser: tenant1._id, status: { $in: ['pending', 'countered', 'accepted'] } });
  await Booking.deleteMany({ property: property._id, user: tenant1._id, status: { $in: ['pending', 'approved'] } });

  console.log(`Property: "${property.name}" (ID: ${property._id})`);
  console.log(`Initial Public Rent: ₹${origRent.toLocaleString('en-IN')}/mo`);
  console.log(`Tenant 1 Offer Target: ₹${tOfferedRent.toLocaleString('en-IN')}/mo`);
  console.log(`Manager Counter Target: ₹${mCounterRent.toLocaleString('en-IN')}/mo`);
  console.log(`Manager: ${manager.firstName} ${manager.lastName}`);
  console.log(`Tenant 1: ${tenant1.firstName} ${tenant1.lastName}`);
  console.log(`Tenant 2: ${tenant2.firstName} ${tenant2.lastName}`);

  let createdOfferId = null;
  let createdBookingId = null;
  let createdLeaseId = null;

  try {
    // -------------------------------------------------------------
    // STEP 1: Tenant 1 creates offer with exact Start & End Dates
    // -------------------------------------------------------------
    console.log('\n--- [TEST 1] Tenant Proposes Rent Offer with Exact Period ---');
    const tStart = '2026-10-01';
    const tEnd = '2026-10-31'; // 30 days
    const tExpectedDur = calculateLeaseDuration(tStart, tEnd);

    const { req: req1, res: res1, next: next1, getJson: getJson1 } = mockReqRes(tenant1, {
      propertyId: property._id.toString(),
      offeredRent: tOfferedRent,
      startDate: tStart,
      endDate: tEnd,
      message: 'Hello, requesting 1-month trial term.'
    });

    await createOffer(req1, res1, next1);
    const offerRes = getJson1();
    if (!offerRes?.success && !offerRes?.data) {
      throw new Error(`Failed to create offer: ${offerRes?.message || JSON.stringify(offerRes)}`);
    }

    const offerDoc = offerRes.data;
    createdOfferId = offerDoc._id;
    console.log(`Deal Created: ${offerDoc.dealNumber} (ID: ${createdOfferId})`);
    console.log(`Start Date: ${offerDoc.startDate}`);
    console.log(`End Date: ${offerDoc.endDate}`);
    console.log(`Duration: ${offerDoc.durationText} (${offerDoc.durationDays} days)`);
    console.log(`Round 1 Duration: ${offerDoc.offerHistory[0]?.durationText} (${offerDoc.offerHistory[0]?.durationDays} days)`);

    if (offerDoc.durationDays !== 30) throw new Error(`Expected 30 days, got ${offerDoc.durationDays}`);
    if (offerDoc.offerHistory[0]?.durationDays !== 30) throw new Error('Round 1 history duration mismatch');
    console.log('✓ PASS: Tenant offer correctly captures exact dates & derived duration.');

    // -------------------------------------------------------------
    // STEP 2: Manager counters with ₹33,500 and extended period (60 days)
    // -------------------------------------------------------------
    console.log('\n--- [TEST 2] Manager Counters with Extended Period ---');
    const mStart = '2026-10-01';
    const mEnd = '2026-11-30'; // 60 days
    const mExpectedDur = calculateLeaseDuration(mStart, mEnd);

    const { req: req2, res: res2, next: next2, getJson: getJson2 } = mockReqRes(manager, {
      action: 'counter',
      counterOffer: mCounterRent,
      startDate: mStart,
      endDate: mEnd,
      message: 'We prefer at least 2 months lease term.'
    }, { id: createdOfferId.toString() });

    await respondToOffer(req2, res2, next2);
    const counterRes = getJson2();
    if (!counterRes?.success && !counterRes?.data) {
      throw new Error(`Failed to counter offer: ${counterRes?.message || JSON.stringify(counterRes)}`);
    }

    const counteredDoc = counterRes.data;
    console.log(`Counter Status: ${counteredDoc.status}`);
    console.log(`Current Offer: ₹${counteredDoc.currentOffer}/mo`);
    console.log(`Counter Dates: ${counteredDoc.startDate} to ${counteredDoc.endDate}`);
    console.log(`Duration: ${counteredDoc.durationText} (${counteredDoc.durationDays} days)`);
    console.log(`Round 2 Duration: ${counteredDoc.offerHistory[1]?.durationText} (${counteredDoc.offerHistory[1]?.durationDays} days)`);

    if (counteredDoc.currentOffer !== mCounterRent) throw new Error('Counter amount mismatch');
    if (counteredDoc.durationDays !== 60) throw new Error(`Expected 60 days, got ${counteredDoc.durationDays}`);
    if (counteredDoc.offerHistory[1]?.durationDays !== 60) throw new Error('Round 2 duration mismatch');
    console.log('✓ PASS: Manager counter updated dates and history round with 60 days duration.');

    // -------------------------------------------------------------
    // STEP 3: Tenant accepts the counter offer
    // -------------------------------------------------------------
    console.log('\n--- [TEST 3] Tenant Accepts Counter Offer & Locks Deal ---');
    const { req: req3, res: res3, next: next3, getJson: getJson3 } = mockReqRes(tenant1, {
      action: 'accept',
      message: 'Agreed! Proceeding with 2 months.'
    }, { id: createdOfferId.toString() });

    await respondToOffer(req3, res3, next3);
    const acceptRes = getJson3();
    if (!acceptRes?.success && !acceptRes?.data) {
      throw new Error(`Failed to accept offer: ${acceptRes?.message || JSON.stringify(acceptRes)}`);
    }

    const acceptedDoc = acceptRes.data;
    console.log(`Accepted Deal Status: ${acceptedDoc.status}`);
    console.log(`Agreed Rent: ₹${acceptedDoc.agreedRent}/mo`);
    console.log(`Agreed Start Date: ${acceptedDoc.agreedStartDate}`);
    console.log(`Agreed End Date: ${acceptedDoc.agreedEndDate}`);
    console.log(`Agreed Duration: ${acceptedDoc.durationText} (${acceptedDoc.durationDays} days)`);

    if (acceptedDoc.status !== 'accepted') throw new Error('Offer status should be accepted');
    if (acceptedDoc.agreedRent !== mCounterRent) throw new Error('Agreed rent mismatch');
    if (!acceptedDoc.agreedStartDate || !acceptedDoc.agreedEndDate) throw new Error('Agreed dates missing');
    console.log('✓ PASS: Deal locked with immutable agreedRent and agreed start/end dates.');

    // -------------------------------------------------------------
    // STEP 4: Property Details includes locked privateDeal
    // -------------------------------------------------------------
    console.log('\n--- [TEST 4] Property Details Returns Locked Private Deal for Tenant 1 ---');
    const { req: req4, res: res4, next: next4, getJson: getJson4 } = mockReqRes(tenant1, {}, { id: property._id.toString() });

    await getPropertyById(req4, res4, next4);
    const propRes = getJson4();
    const propData = propRes.data;
    console.log(`Public Listing Rent: ₹${propData.rentAmount}/mo`);
    console.log('Resolved privateDeal:', propData.privateDeal);

    if (!propData.privateDeal) throw new Error('Expected privateDeal to be present for Tenant 1');
    if (propData.privateDeal.agreedRent !== mCounterRent) throw new Error('privateDeal agreedRent mismatch');
    if (!propData.privateDeal.agreedStartDate || !propData.privateDeal.agreedEndDate) throw new Error('privateDeal agreed dates missing');
    console.log('✓ PASS: Property details returns privateDeal with locked rate and exact dates.');

    // -------------------------------------------------------------
    // STEP 5: Backend Authority on Booking Request
    // -------------------------------------------------------------
    console.log('\n--- [TEST 5] Backend Authority Overrides Rogue Client-Submitted Dates ---');
    // Tenant attempts to submit a booking for December 2026 at ₹5,000
    const rogueStartDate = '2026-12-01';
    const rogueEndDate = '2026-12-31';

    const { req: req5, res: res5, next: next5, getJson: getJson5 } = mockReqRes(tenant1, {
      propertyId: property._id.toString(),
      startDate: rogueStartDate,
      endDate: rogueEndDate,
      totalAmount: 5000,
      offerId: createdOfferId.toString(),
      paymentReference: 'PENDING'
    });

    await requestBooking(req5, res5, next5);
    const bookingRes = getJson5();
    if (!bookingRes?.success && !bookingRes?.data) {
      throw new Error(`Failed to request booking: ${bookingRes?.message || JSON.stringify(bookingRes)}`);
    }

    const bookingDoc = bookingRes.data;
    createdBookingId = bookingDoc._id;
    console.log(`Booking Created ID: ${createdBookingId}`);
    console.log(`Client Submitted Dates: ${rogueStartDate} to ${rogueEndDate}`);
    const toYMD = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
    console.log(`Backend Stored Dates: ${toYMD(bookingDoc.startDate)} to ${toYMD(bookingDoc.endDate)}`);
    console.log(`Stored Agreed Dates: ${toYMD(bookingDoc.agreedStartDate)} to ${toYMD(bookingDoc.agreedEndDate)}`);
    console.log(`Stored Agreed Rent: ₹${bookingDoc.agreedRent}/mo`);

    const storedStart = toYMD(bookingDoc.startDate);
    const storedEnd = toYMD(bookingDoc.endDate);
    if (storedStart !== mStart || storedEnd !== mEnd) {
      throw new Error(`Backend authority failure! Expected dates ${mStart} to ${mEnd}, but stored ${storedStart} to ${storedEnd}`);
    }
    if (bookingDoc.agreedRent !== mCounterRent) throw new Error('Booking agreedRent mismatch');
    console.log('✓ PASS: Backend successfully ignored rogue client dates and enforced locked deal dates.');

    // -------------------------------------------------------------
    // STEP 6: Public Rent Immunity Check
    // -------------------------------------------------------------
    console.log('\n--- [TEST 6] Public Rent Immunity Check ---');
    // Property manager raises public listing rent by ₹5,000
    const newPublicRent = origRent + 5000;
    property.rentAmount = newPublicRent;
    await property.save();
    console.log(`Property public rent increased to: ₹${newPublicRent.toLocaleString('en-IN')}/mo`);

    // Fetch existing booking: must remain at ₹33,500 and 60 days
    const dbBooking = await Booking.findById(createdBookingId).populate('property');
    console.log(`Existing Booking Snapshot: agreedRent=₹${dbBooking.agreedRent}, startDate=${dbBooking.startDate.toISOString().split('T')[0]}, endDate=${dbBooking.endDate.toISOString().split('T')[0]}`);
    console.log(`Property Current Listed Rent: ₹${dbBooking.property.rentAmount}`);

    if (dbBooking.agreedRent !== mCounterRent) {
      throw new Error(`Public rent change corrupted booking! Expected mCounterRent, got ${dbBooking.agreedRent}`);
    }
    if (dbBooking.startDate.toISOString().split('T')[0] !== mStart || dbBooking.endDate.toISOString().split('T')[0] !== mEnd) {
      throw new Error('Booking dates corrupted after public rent update');
    }

    // Tenant 2 queries the property: must see new public rent and NO private deal
    const { req: req6, res: res6, next: next6, getJson: getJson6 } = mockReqRes(tenant2, {}, { id: property._id.toString() });
    await getPropertyById(req6, res6, next6);
    const tenant2PropRes = getJson6();
    console.log(`Tenant 2 sees Rent: ₹${tenant2PropRes.data.rentAmount}`);
    console.log(`Tenant 2 privateDeal: ${tenant2PropRes.data.privateDeal}`);

    if (tenant2PropRes.data.rentAmount !== newPublicRent) {
      throw new Error(`Tenant 2 should see new public rent ${newPublicRent}, got ${tenant2PropRes.data.rentAmount}`);
    }
    if (tenant2PropRes.data.privateDeal !== null) {
      throw new Error('Tenant 2 must NOT see Tenant 1 privateDeal');
    }
    console.log('✓ PASS: Existing booking is 100% immune to public rent changes; other tenants see updated public rent.');

    // -------------------------------------------------------------
    // STEP 7: Downstream Lease Snapshot Verification
    // -------------------------------------------------------------
    console.log('\n--- [TEST 7] Downstream Lease Creation from Booking Snapshot ---');
    const leaseNumber = `LEASE-TEST-${Date.now()}`;
    const lease = await Lease.create({
      leaseNumber,
      booking: dbBooking._id,
      property: dbBooking.property._id,
      tenant: dbBooking.user,
      startDate: dbBooking.startDate,
      endDate: dbBooking.endDate,
      rentAmount: dbBooking.agreedRent || dbBooking.property.rentAmount,
      depositAmount: dbBooking.depositAmount || 0,
      status: 'pending',
      createdBy: manager._id,
      terms: 'Generated from booking with locked private deal'
    });
    createdLeaseId = lease._id;

    console.log(`Lease Created: ${lease.leaseNumber}`);
    console.log(`Lease Rent: ₹${lease.rentAmount}/mo`);
    console.log(`Lease Dates: ${lease.startDate.toISOString().split('T')[0]} to ${lease.endDate.toISOString().split('T')[0]}`);
    const lDur = calculateLeaseDuration(lease.startDate, lease.endDate);
    console.log(`Lease Duration: ${lDur.durationText} (${lDur.days} days)`);

    if (lease.rentAmount !== mCounterRent) throw new Error(`Lease rentAmount expected mCounterRent, got ${lease.rentAmount}`);
    if (lease.startDate.toISOString().split('T')[0] !== mStart) throw new Error('Lease startDate mismatch');
    if (lease.endDate.toISOString().split('T')[0] !== mEnd) throw new Error('Lease endDate mismatch');
    if (lDur.days !== 60) throw new Error(`Lease duration expected 60 days, got ${lDur.days}`);
    console.log('✓ PASS: Downstream lease directly preserves negotiated rent and exact period without leaking public rent.');

    console.log('\n================================================================');
    console.log('🎉 ALL 7 E2E INTEGRATION TESTS PASSED WITHOUT ERRORS!');
    console.log('================================================================\n');

  } finally {
    console.log('--- Cleaning Up Test Artifacts ---');
    if (createdLeaseId) await Lease.findByIdAndDelete(createdLeaseId);
    if (createdBookingId) await Booking.findByIdAndDelete(createdBookingId);
    if (createdOfferId) await Offer.findByIdAndDelete(createdOfferId);

    // Restore property rent & negotiation
    property.rentAmount = origRent;
    if (origNegotiation) {
      property.negotiation = origNegotiation;
    }
    await property.save();
    console.log(`Property restored to original public rent (₹${origRent.toLocaleString('en-IN')}).`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

run().catch((err) => {
  console.error('\n❌ E2E TEST RUNNER FAILED:', err);
  process.exit(1);
});
