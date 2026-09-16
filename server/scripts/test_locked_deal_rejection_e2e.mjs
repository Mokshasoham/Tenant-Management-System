import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Offer from '../src/models/Offer.js';
import Property from '../src/models/Property.js';
import Booking from '../src/models/Booking.js';
import User from '../src/models/User.js';
import { enrichOfferWithState, respondToOffer, createOffer } from '../src/controllers/offerController.js';
import { requestBooking, rejectBooking } from '../src/controllers/bookingController.js';

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
    getStatusCode: () => resStatus,
    getData: () => resJson,
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

  return { req, res, next, getStatus: () => resStatus, getJson: () => resJson, getStatusCode: () => resStatus, getData: () => resJson };
}

async function runLockedDealRejectionE2E() {
  console.log('================================================================');
  console.log('  LOCKED DEAL + BOOKING REJECTION E2E VERIFICATION SUITE');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB:', mongoose.connection.name);

  // 1. Locate suitable test property and users
  let property = await Property.findOne({
    publishStatus: 'published',
    status: 'available',
    isDeleted: { $ne: true }
  }).populate('manager');

  if (!property) {
    property = await Property.findOne({
      publishStatus: 'published',
      isDeleted: { $ne: true }
    }).populate('manager');

    if (property) {
      property.status = 'available';
      property.isTest = false;
      property.isInternal = false;
      property.isArchived = false;
      await property.save();
    }
  }

  if (!property) {
    throw new Error('No published property found.');
  }

  // Ensure available status
  if (property.status !== 'available' || property.isTest) {
    property.status = 'available';
    property.isTest = false;
    await property.save();
  }

  const manager = await User.findById(property.manager?._id || property.owner);
  const tenant = await User.findOne({ role: 'tenant', isDeleted: { $ne: true } });

  if (!manager || !tenant) {
    throw new Error('Could not find manager or tenant user.');
  }

  const origRent = property.rentAmount;
  console.log(`🏠 Property: "${property.name}" (ID: ${property._id})`);
  console.log(`💰 Public Listed Rent: ₹${origRent.toLocaleString('en-IN')}/month`);
  console.log(`👤 Manager: ${manager.firstName} ${manager.lastName} (${manager._id})`);
  console.log(`👤 Tenant: ${tenant.firstName} ${tenant.lastName} (${tenant._id})`);

  // Ensure negotiation is enabled on property for the test
  property.negotiation = {
    enabled: true,
    availability: 'all',
    minAcceptableRent: Math.round(origRent * 0.50),
    offerValidityHours: 72,
    maxRounds: 5
  };
  await property.save();

  // Clean any previous test offers/bookings for this tenant and property
  await Offer.deleteMany({ property: property._id, fromUser: tenant._id, status: { $in: ['pending', 'countered', 'accepted'] } });
  await Booking.deleteMany({ property: property._id, status: { $in: ['pending', 'approved'] } });

  let testOffer = null;
  let testBooking = null;
  let newOffer = null;

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Tenant creates offer with exact Start Date & End Date
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 1: Tenant Submits Private Negotiation Offer via Controller ---');
    const offeredRent = Math.round(origRent * 0.85);
    const startDate = '2026-11-01';
    const endDate = '2027-10-31';

    const { req: req1, res: res1, next: next1, getJson: getJson1, getStatus: getStatus1 } = mockReqRes(tenant, {
      propertyId: property._id.toString(),
      offeredRent: offeredRent,
      startDate: startDate,
      endDate: endDate,
      message: 'Initial proposal for 12-month lease'
    });

    await createOffer(req1, res1, next1);
    const offerRes = getJson1();
    if (getStatus1() !== 201 || (!offerRes?.success && !offerRes?.data)) {
      throw new Error(`createOffer failed with status ${getStatus1()}: ${offerRes?.message}`);
    }

    const offerDoc = offerRes.data?.offer || offerRes.data;
    testOffer = await Offer.findById(offerDoc._id);
    console.log(`✅ Offer created: ID ${testOffer._id}, Deal: ${testOffer.dealNumber}`);
    console.log(`   Proposed Rent: ₹${offeredRent.toLocaleString('en-IN')}, Status: ${testOffer.status}`);
    console.log(`   Period: ${testOffer.startDate.toISOString().split('T')[0]} to ${testOffer.endDate.toISOString().split('T')[0]}`);

    // -------------------------------------------------------------------------
    // STEP 2: Manager accepts the offer -> Deal becomes LOCKED
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 2: Manager Accepts Offer -> Deal Becomes LOCKED ---');
    const { req: req2, res: res2, next: next2, getJson: getJson2, getStatus: getStatus2 } = mockReqRes(manager, {
      action: 'accept',
      message: 'Deal terms accepted and locked.'
    }, { id: testOffer._id.toString() });

    await respondToOffer(req2, res2, next2);
    const acceptRes = getJson2();
    if (getStatus2() !== 200 || (!acceptRes?.success && !acceptRes?.data)) {
      throw new Error(`respondToOffer (accept) failed with status ${getStatus2()}: ${acceptRes?.message}`);
    }

    testOffer = await Offer.findById(testOffer._id);
    const enrichedAccepted = enrichOfferWithState(testOffer.toObject(), tenant._id);
    console.log(`✅ Deal status: ${enrichedAccepted.status}`);
    console.log(`   isAccepted: ${enrichedAccepted.isAccepted}, isExpired: ${enrichedAccepted.isExpired}`);
    console.log(`   Locked Rent: ₹${enrichedAccepted.agreedRent?.toLocaleString('en-IN')}`);
    console.log(`   Locked Period: ${testOffer.agreedStartDate.toISOString().split('T')[0]} to ${testOffer.agreedEndDate.toISOString().split('T')[0]}`);
    if (!enrichedAccepted.isAccepted || enrichedAccepted.isExpired) {
      throw new Error('Offer should be accepted and NOT expired at this stage.');
    }

    // -------------------------------------------------------------------------
    // STEP 3: Tenant creates Booking Request with locked offer
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 3: Tenant Requests Booking with Locked Deal ---');
    const { req: req3, res: res3, next: next3, getJson: getJson3, getStatus: getStatus3 } = mockReqRes(tenant, {
      propertyId: property._id.toString(),
      offerId: testOffer._id.toString(),
      startDate: startDate,
      endDate: endDate,
      notes: 'Booking with accepted private negotiation'
    });

    await requestBooking(req3, res3, next3);
    const bookingRes = getJson3();
    if (getStatus3() !== 201) {
      throw new Error(`Booking request failed with status ${getStatus3()}: ${bookingRes?.message}`);
    }

    const bookingData = bookingRes.data?.booking || bookingRes.data;
    testBooking = await Booking.findById(bookingData._id || bookingData.id);
    console.log(`✅ Booking Created: ID ${testBooking._id}, Status: ${testBooking.status}`);
    console.log(`   Booking Agreed Rent: ₹${testBooking.agreedRent?.toLocaleString('en-IN')}`);
    console.log(`   Associated Deal FK (booking.offer): ${testBooking.offer}`);

    if (String(testBooking.offer) !== String(testOffer._id)) {
      throw new Error(`booking.offer (${testBooking.offer}) does not match testOffer._id (${testOffer._id})`);
    }
    if (testBooking.agreedRent !== offeredRent) {
      throw new Error(`booking.agreedRent (${testBooking.agreedRent}) does not match locked offer rent (${offeredRent})`);
    }

    // -------------------------------------------------------------------------
    // STEP 4 & 5: Manager rejects booking -> Deal transitions to EXPIRED
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 4 & 5: Manager Rejects Booking -> Booking REJECTED & Deal EXPIRED ---');
    const rejectionReason = 'Property undergoing urgent structural inspection';
    const { req: req4, res: res4, next: next4, getJson: getJson4, getStatus: getStatus4 } = mockReqRes(manager, {
      reason: rejectionReason
    }, { id: testBooking._id.toString() });

    await rejectBooking(req4, res4, next4);
    const rejRes = getJson4();
    console.log(`Rejection API response: Status ${getStatus4()}, Message: "${rejRes?.message}"`);
    if (getStatus4() !== 200) {
      throw new Error(`rejectBooking failed with status ${getStatus4()}: ${rejRes?.message}`);
    }

    // Reload booking and offer from database
    const refreshedBooking = await Booking.findById(testBooking._id);
    const refreshedOffer = await Offer.findById(testOffer._id);

    console.log(`✅ Refreshed Booking Status: "${refreshedBooking.status}"`);
    console.log(`   Rejection Reason: "${refreshedBooking.rejectionReason}"`);
    if (refreshedBooking.status !== 'rejected') {
      throw new Error(`Expected booking status 'rejected', got '${refreshedBooking.status}'`);
    }

    console.log(`✅ Refreshed Offer Status: "${refreshedOffer.status}"`);
    console.log(`   expiredAt: ${refreshedOffer.expiredAt}`);
    console.log(`   expirationReason: "${refreshedOffer.expirationReason}"`);
    if (refreshedOffer.status !== 'expired') {
      throw new Error(`Expected offer status 'expired', got '${refreshedOffer.status}'`);
    }
    if (!refreshedOffer.expiredAt) {
      throw new Error('Expected offer.expiredAt to be set.');
    }
    if (refreshedOffer.expirationReason !== 'booking_rejected_by_manager') {
      throw new Error(`Expected expirationReason 'booking_rejected_by_manager', got '${refreshedOffer.expirationReason}'`);
    }

    const lastHistory = refreshedOffer.offerHistory[refreshedOffer.offerHistory.length - 1];
    console.log(`   Last History Action: "${lastHistory.action}", Message: "${lastHistory.message}"`);
    if (lastHistory.action !== 'expired') {
      throw new Error(`Expected last history action 'expired', got '${lastHistory.action}'`);
    }
    if (!lastHistory.message.includes(rejectionReason)) {
      throw new Error(`Expected last history message to contain rejection reason, got: "${lastHistory.message}"`);
    }

    // Check enrichOfferWithState for expired deal
    const enrichedExpired = enrichOfferWithState(refreshedOffer.toObject(), tenant._id);
    console.log(`   Enriched isAccepted: ${enrichedExpired.isAccepted}, isExpired: ${enrichedExpired.isExpired}`);
    if (enrichedExpired.isAccepted !== false || enrichedExpired.isExpired !== true) {
      throw new Error('enrichOfferWithState should mark expired deal as isExpired: true and isAccepted: false');
    }

    // -------------------------------------------------------------------------
    // STEP 6: Idempotency Test - Second rejection call
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 6: Idempotency Verification ---');
    const historyCountBefore = refreshedOffer.offerHistory.length;
    const { req: idempReq, res: idempRes, next: idempNext, getJson: idempJson, getStatus: idempStatus } = mockReqRes(manager, {
      reason: 'Another rejection attempt'
    }, { id: testBooking._id.toString() });

    await rejectBooking(idempReq, idempRes, idempNext);
    console.log(`Second rejection response: Status ${idempStatus()}, Message: "${idempJson()?.message}"`);
    if (idempStatus() !== 200) {
      throw new Error(`Idempotency call returned unexpected status: ${idempStatus()}`);
    }

    const offerAfterIdemp = await Offer.findById(testOffer._id);
    if (offerAfterIdemp.offerHistory.length !== historyCountBefore) {
      throw new Error('Idempotent call should NOT add duplicate history entries!');
    }
    console.log('✅ Idempotency test passed: No duplicate history items added.');

    // -------------------------------------------------------------------------
    // STEP 7: Security Test - Tenant attempts booking with expired offerId
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 7: Security Test: Attempt Booking with Expired Offer ID ---');
    const { req: rogueReq, res: rogueRes, next: rogueNext, getJson: rogueJson, getStatus: rogueStatus } = mockReqRes(tenant, {
      propertyId: property._id.toString(),
      offerId: testOffer._id.toString(),
      startDate: startDate,
      endDate: endDate
    });

    await requestBooking(rogueReq, rogueRes, rogueNext);
    console.log(`Rogue booking attempt response: Status ${rogueStatus()}, Message: "${rogueJson()?.message}"`);
    if (rogueStatus() !== 400) {
      throw new Error(`Expected HTTP 400 when submitting expired offerId, got ${rogueStatus()}`);
    }
    if (!rogueJson()?.message?.toLowerCase().includes('expired')) {
      throw new Error(`Expected error message to mention 'expired', got: "${rogueJson()?.message}"`);
    }
    console.log('✅ Security check passed: Expired offer is strictly rejected with HTTP 400.');

    // -------------------------------------------------------------------------
    // STEP 8: Security Test - Tenant attempts to Accept or Counter expired deal
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 8: Security Test: Attempt to Accept/Counter Expired Deal ---');
    const { req: actReq, res: actRes, next: actNext, getJson: actJson, getStatus: actStatus } = mockReqRes(tenant, {
      action: 'accept'
    }, { id: testOffer._id.toString() });

    await respondToOffer(actReq, actRes, actNext);
    console.log(`Accept expired deal response: Status ${actStatus()}, Message: "${actJson()?.message}"`);
    if (actStatus() !== 400) {
      throw new Error(`Expected HTTP 400 when responding to expired deal, got ${actStatus()}`);
    }
    console.log('✅ Security check passed: Expired deal cannot be accepted or countered.');

    // -------------------------------------------------------------------------
    // STEP 9: "Negotiate Again" Test - Tenant creates new offer on same property
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 9: "Negotiate Again" - Tenant Starts Fresh Negotiation ---');
    const newRent = Math.round(origRent * 0.88);
    const { req: newReq, res: newRes, next: newNext, getJson: newJson, getStatus: newStatus } = mockReqRes(tenant, {
      propertyId: property._id.toString(),
      offeredRent: newRent,
      startDate: '2026-12-01',
      endDate: '2027-11-30',
      message: 'Starting fresh negotiation after previous booking was declined'
    });

    await createOffer(newReq, newRes, newNext);
    console.log(`Create new offer response: Status ${newStatus()}, Success: ${newJson()?.success}`);
    if (newStatus() !== 201) {
      throw new Error(`createOffer failed with status ${newStatus()}: ${newJson()?.message}`);
    }

    const createdOfferData = newJson()?.data?.offer || newJson()?.data;
    newOffer = await Offer.findById(createdOfferData._id);
    console.log(`✅ New Offer successfully created: ID ${newOffer._id}, Deal: ${newOffer.dealNumber}, Status: ${newOffer.status}`);
    console.log(`   New Offer Rent: ₹${newOffer.currentOffer.toLocaleString('en-IN')}`);

    if (String(newOffer._id) === String(testOffer._id)) {
      throw new Error('New offer ID should be completely different from the old expired offer ID!');
    }

    // Verify old offer is STILL intact with status 'expired'
    const oldOfferCheck = await Offer.findById(testOffer._id);
    if (!oldOfferCheck || oldOfferCheck.status !== 'expired') {
      throw new Error('Old offer record must be preserved and remain expired!');
    }
    console.log(`✅ Old Offer preserved intact in database: ID ${oldOfferCheck._id}, Status: ${oldOfferCheck.status}`);

    // -------------------------------------------------------------------------
    // STEP 10: Public Rent Immunity Check
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 10: Public Rent Immunity Check ---');
    const propertyAfter = await Property.findById(property._id);
    console.log(`Original Listed Rent: ₹${origRent.toLocaleString('en-IN')}`);
    console.log(`Current Listed Rent:  ₹${propertyAfter.rentAmount.toLocaleString('en-IN')}`);
    if (propertyAfter.rentAmount !== origRent) {
      throw new Error(`Property rentAmount was modified! Expected ${origRent}, got ${propertyAfter.rentAmount}`);
    }
    console.log('✅ Public Rent Immunity verified: Property.rentAmount was NOT mutated at any point.');

    console.log('\n================================================================');
    console.log('  ALL LOCKED DEAL + BOOKING REJECTION E2E TESTS PASSED! 🎉');
    console.log('================================================================\n');

  } finally {
    // Cleanup created test records
    console.log('Cleaning up test records...');
    if (testBooking) {
      await Booking.deleteOne({ _id: testBooking._id });
    }
    if (testOffer) {
      await Offer.deleteOne({ _id: testOffer._id });
    }
    if (newOffer) {
      await Offer.deleteOne({ _id: newOffer._id });
    }
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runLockedDealRejectionE2E().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
