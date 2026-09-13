import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import PropertyVisit from '../src/models/PropertyVisit.js';
import Offer from '../src/models/Offer.js';
import Booking from '../src/models/Booking.js';
import Lease from '../src/models/Lease.js';

import { getPropertyById, createProperty, updateProperty } from '../src/controllers/propertyController.js';
import { createOffer, respondToOffer, getMyOffers, getManagerOffers } from '../src/controllers/offerController.js';
import { requestBooking, approveBooking, processMockPayment } from '../src/controllers/bookingController.js';

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

  return { req, res, next };
}

async function runE2ETests() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('   TMS — PRIVATE RENT NEGOTIATION & DEALFLOW FULL E2E TEST SUITE       ');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');
  console.log('✔ Connected to MongoDB');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extra = '') {
    if (condition) {
      console.log(`  ✔ PASS: ${testName} ${extra}`);
      passed++;
    } else {
      console.error(`  ✖ FAIL: ${testName} ${extra}`);
      failed++;
    }
  }

  try {
    // 1. Setup Test Users
    let manager = await User.findOne({ role: 'manager' });
    if (!manager) {
      manager = await User.create({
        firstName: 'Test',
        lastName: 'Manager',
        email: `manager_${Date.now()}@test.com`,
        password: 'Password123!',
        role: 'manager',
        isEmailVerified: true
      });
    }

    let tenant1 = await User.findOne({ role: 'tenant' });
    if (!tenant1) {
      tenant1 = await User.create({
        firstName: 'Tenant',
        lastName: 'One',
        email: `tenant1_${Date.now()}@test.com`,
        password: 'Password123!',
        role: 'tenant',
        isEmailVerified: true
      });
    }

    const tenant2 = await User.create({
      firstName: 'Tenant',
      lastName: 'Two',
      email: `tenant2_${Date.now()}@test.com`,
      password: 'Password123!',
      role: 'tenant',
      isEmailVerified: true
    });

    console.log(`\nTest Users Prepared:`);
    console.log(`  Manager: ${manager.email} (${manager._id})`);
    console.log(`  Tenant 1: ${tenant1.email} (${tenant1._id})`);
    console.log(`  Tenant 2: ${tenant2.email} (${tenant2._id})`);

    // 2. Create Test Property with Listed Rent ₹15,000 and Negotiation Enabled
    const testProp = await Property.create({
      name: `Negotiation Test Penthouse ${Date.now()}`,
      address: '100 DealFlow Road',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      zipCode: '560001',
      rentAmount: 15000,
      depositAmount: 30000,
      type: 'apartment',
      manager: manager._id,
      owner: manager._id,
      status: 'available',
      publishStatus: 'published',
      negotiation: {
        enabled: true,
        availability: 'visit_requested',
        maxDiscountPercentage: 10,
        minAcceptableRent: 13500,
        offerValidityHours: 48,
        maxRounds: 5
      }
    });

    console.log(`\n--- Test 1: Property Negotiation Consistency & Floor Reconciliation ---`);
    // Verify reconciliation if manager enters conflicting lower min rent
    const testProp2 = await Property.create({
      name: `Floor Reconciliation Property ${Date.now()}`,
      address: '101 Floor Ave',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      zipCode: '560001',
      rentAmount: 20000,
      depositAmount: 40000,
      type: 'apartment',
      manager: manager._id,
      owner: manager._id,
      status: 'available',
      publishStatus: 'published',
      negotiation: {
        enabled: true,
        availability: 'all',
        maxDiscountPercentage: 10,
        minAcceptableRent: 15000, // Conflict: 10% discount from 20,000 floor should be 18,000!
        offerValidityHours: 24,
        maxRounds: 5
      }
    });

    // Test updateProperty through controller
    const { req: reqUp, res: resUp } = mockReqRes(manager, {
      negotiation: {
        enabled: true,
        availability: 'all',
        maxDiscountPercentage: 10,
        minAcceptableRent: 12000 // Conflicting floor below 10% discount (18,000)
      }
    }, { id: testProp2._id.toString() });
    await updateProperty(reqUp, resUp);
    const updatedProp = await Property.findById(testProp2._id);
    assert(
      updatedProp.negotiation.minAcceptableRent >= 18000,
      'Backend automatically enforces floor consistency (10% off ₹20,000 = ₹18,000 min rent)',
      `Actual minAcceptableRent: ₹${updatedProp.negotiation.minAcceptableRent}`
    );

    console.log(`\n--- Test 2: Public View Confidentiality (Adjustment #1) ---`);
    // Tenant view of Property
    const { req: reqView, res: resView, next: nextView } = mockReqRes(tenant1, {}, { id: testProp._id.toString() });
    await getPropertyById(reqView, resView, nextView);
    const viewJson = resView.getJson();
    assert(
      viewJson.success === true && viewJson.data.rentAmount === 15000,
      'Public listed rent remains exactly ₹15,000'
    );
    assert(
      viewJson.data.negotiation?.minAcceptableRent === undefined && viewJson.data.negotiation?.maxDiscountPercentage === undefined,
      'Manager confidential floor (minAcceptableRent) & max discount % are stripped from tenant response'
    );
    assert(
      viewJson.data.negotiation?.enabled === true,
      'Negotiation enabled status is visible to tenant'
    );
    assert(
      viewJson.data.negotiationEligibility?.eligible === false && (viewJson.data.negotiationEligibility?.reason === 'requires_visit' || viewJson.data.negotiationEligibility?.reason === 'visit_required'),
      'Tenant is not eligible yet because property requires a visit request first'
    );

    console.log(`\n--- Test 3: Eligibility Enforcement (Visit Required) ---`);
    // Tenant 1 tries to submit offer without visit
    const { req: reqOff1Fail, res: resOff1Fail, next: nextOff1Fail } = mockReqRes(tenant1, {
      propertyId: testProp._id.toString(),
      offerAmount: 13500,
      leasePeriod: '12 months',
      message: 'Hello, please consider ₹13,500'
    });
    await createOffer(reqOff1Fail, resOff1Fail, nextOff1Fail);
    assert(
      resOff1Fail.getStatus() === 403,
      'Offer creation rejected with 403 when visit is required but not requested'
    );

    // Record visit request for Tenant 1
    await PropertyVisit.create({
      property: testProp._id,
      tenant: tenant1._id,
      manager: manager._id,
      visitDate: new Date(),
      timeSlot: '10:00 AM - 11:00 AM',
      status: 'approved'
    });

    console.log(`\n--- Test 4: Offer Creation & Canonical DEAL Number ---`);
    // Now Tenant 1 submits offer
    const { req: reqOff1, res: resOff1 } = mockReqRes(tenant1, {
      propertyId: testProp._id.toString(),
      offerAmount: 13500,
      leasePeriod: '12 months',
      message: 'Hello manager, please consider my offer of ₹13,500/month.'
    });
    await createOffer(reqOff1, resOff1);
    assert(resOff1.getStatus() === 201, 'Offer created successfully with 201 Created');
    const offer1 = resOff1.getJson()?.data;
    assert(
      offer1?.dealNumber && offer1.dealNumber.startsWith('DEAL-'),
      `Canonical deal number generated atomically: ${offer1?.dealNumber}`
    );
    assert(
      offer1?.roundCount === 1 && String(offer1?.currentOfferedBy) === String(tenant1._id) && offer1?.currentOffer === 13500,
      'Round starts at 1 with tenant offer ₹13,500'
    );

    // Verify Property public price is NOT altered
    const propCheck1 = await Property.findById(testProp._id);
    assert(
      propCheck1.rentAmount === 15000,
      'Property.rentAmount remains unchanged at ₹15,000 (public price untouched)'
    );

    console.log(`\n--- Test 5: Uniqueness Check (Adjustment #3: One active deal per Tenant + Property) ---`);
    // Tenant 1 attempts to submit a 2nd offer on the same property while offer1 is active
    const { req: reqOff1Dup, res: resOff1Dup, next: nextOff1Dup } = mockReqRes(tenant1, {
      propertyId: testProp._id.toString(),
      offerAmount: 14000,
      leasePeriod: '12 months'
    });
    await createOffer(reqOff1Dup, resOff1Dup, nextOff1Dup);
    assert(
      resOff1Dup.getStatus() === 409,
      'Duplicate active offer by same tenant on same property rejected with 409 Conflict'
    );

    console.log(`\n--- Test 6: Multi-Tenant Concurrency on Same Property ---`);
    // Tenant 2 requests visit & submits an offer on the SAME property
    await PropertyVisit.create({
      property: testProp._id,
      tenant: tenant2._id,
      manager: manager._id,
      visitDate: new Date(),
      timeSlot: '02:00 PM - 03:00 PM',
      status: 'approved'
    });
    const { req: reqOff2, res: resOff2, next: nextOff2 } = mockReqRes(tenant2, {
      propertyId: testProp._id.toString(),
      offerAmount: 14000,
      leasePeriod: '12 months',
      message: 'Tenant 2 proposing ₹14,000'
    });
    await createOffer(reqOff2, resOff2, nextOff2);
    assert(
      resOff2.getStatus() === 201,
      'Second tenant successfully creates concurrent private deal on the same property'
    );
    const offer2 = resOff2.getJson()?.data;
    assert(
      offer2?.dealNumber !== offer1?.dealNumber,
      `Second tenant received distinct deal number: ${offer2?.dealNumber}`
    );

    console.log(`\n--- Test 7: Negotiation Rounds & 5-Round Limit (Adjustment #2) ---`);
    // Round 2: Manager counters Tenant 1 with ₹14,200
    const { req: reqR2, res: resR2, next: nextR2 } = mockReqRes(manager, {
      action: 'counter',
      counterRent: 14200,
      message: 'I can do ₹14,200/month with maintenance included.'
    }, { id: offer1._id.toString() });
    await respondToOffer(reqR2, resR2, nextR2);
    const r2Data = resR2.getJson()?.data;
    assert(
      r2Data?.roundCount === 2 && String(r2Data?.currentOfferedBy) === String(manager._id) && r2Data?.currentOffer === 14200,
      'Round 2: Manager countered with ₹14,200'
    );

    // Round 3: Tenant 1 counters back with ₹13,700
    const { req: reqR3, res: resR3, next: nextR3 } = mockReqRes(tenant1, {
      action: 'counter',
      counterRent: 13700,
      message: 'How about ₹13,700?'
    }, { id: offer1._id.toString() });
    await respondToOffer(reqR3, resR3, nextR3);
    const r3Data = resR3.getJson()?.data;
    assert(
      r3Data?.roundCount === 3 && String(r3Data?.currentOfferedBy) === String(tenant1._id) && r3Data?.currentOffer === 13700,
      'Round 3: Tenant countered with ₹13,700'
    );

    // Round 4: Manager counters with ₹14,000
    const { req: reqR4, res: resR4, next: nextR4 } = mockReqRes(manager, {
      action: 'counter',
      counterRent: 14000,
      message: 'Final counter: ₹14,000'
    }, { id: offer1._id.toString() });
    await respondToOffer(reqR4, resR4, nextR4);
    const r4Data = resR4.getJson()?.data;
    assert(
      r4Data?.roundCount === 4 && String(r4Data?.currentOfferedBy) === String(manager._id) && r4Data?.currentOffer === 14000,
      'Round 4: Manager countered with ₹14,000'
    );

    // Round 5: Tenant 1 counters with ₹13,900 (Round 5 reached)
    const { req: reqR5, res: resR5, next: nextR5 } = mockReqRes(tenant1, {
      action: 'counter',
      counterRent: 13900,
      message: 'Meeting in middle at ₹13,900.'
    }, { id: offer1._id.toString() });
    await respondToOffer(reqR5, resR5, nextR5);
    const r5Data = resR5.getJson()?.data;
    assert(
      r5Data?.roundCount === 5 && String(r5Data?.currentOfferedBy) === String(tenant1._id) && r5Data?.currentOffer === 13900,
      'Round 5: Tenant countered with ₹13,900 (Max rounds reached)'
    );

    // Round 6 Attempt: Manager tries to counter again beyond maxRounds (5)
    const { req: reqR6, res: resR6, next: nextR6 } = mockReqRes(manager, {
      action: 'counter',
      counterRent: 13950
    }, { id: offer1._id.toString() });
    await respondToOffer(reqR6, resR6, nextR6);
    assert(
      resR6.getStatus() === 400 && resR6.getJson()?.message?.includes('limit reached'),
      'Counter beyond 5 rounds rejected with 400 MAX_ROUNDS_REACHED'
    );

    console.log(`\n--- Test 8: Deal Acceptance & Rate Locking ---`);
    // Manager accepts Tenant 1's ₹13,900 offer
    const { req: reqAccept, res: resAccept, next: nextAccept } = mockReqRes(manager, {
      action: 'accept',
      message: 'Agreed at ₹13,900. Welcome aboard!'
    }, { id: offer1._id.toString() });
    await respondToOffer(reqAccept, resAccept, nextAccept);
    assert(resAccept.getStatus() === 200, 'Manager accepted the offer');
    const acceptedDeal = resAccept.getJson()?.data;
    assert(
      acceptedDeal?.status === 'accepted' && acceptedDeal?.agreedRent === 13900,
      'Deal status is accepted and agreedRent locked at ₹13,900'
    );

    // Verify Tenant 1 gets privateDeal when viewing property
    const { req: reqViewT1, res: resViewT1, next: nextViewT1 } = mockReqRes(tenant1, {}, { id: testProp._id.toString() });
    await getPropertyById(reqViewT1, resViewT1, nextViewT1);
    const t1PropView = resViewT1.getJson()?.data;
    assert(
      t1PropView?.privateDeal?.agreedRent === 13900 && t1PropView?.privateDeal?.dealNumber === offer1.dealNumber,
      `Tenant 1 receives locked privateDeal: ₹${t1PropView?.privateDeal?.agreedRent}/mo (${t1PropView?.privateDeal?.dealNumber})`
    );

    // Verify Tenant 2 DOES NOT get Tenant 1's deal
    const { req: reqViewT2, res: resViewT2, next: nextViewT2 } = mockReqRes(tenant2, {}, { id: testProp._id.toString() });
    await getPropertyById(reqViewT2, resViewT2, nextViewT2);
    const t2PropView = resViewT2.getJson()?.data;
    assert(
      !t2PropView?.privateDeal && t2PropView?.rentAmount === 15000,
      'Tenant 2 is strictly isolated: sees no privateDeal and public listed rent ₹15,000'
    );

    console.log(`\n--- Test 9: Pre-Booking Real-Time Availability Check (Adjustment #4) ---`);
    // Mark property as occupied temporarily
    testProp.status = 'occupied';
    await testProp.save();

    const { req: reqBookFailAvail, res: resBookFailAvail, next: nextBookFailAvail } = mockReqRes(tenant1, {
      propertyId: testProp._id.toString(),
      offerId: offer1._id.toString(),
      startDate: new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 38 * 86400000).toISOString().split('T')[0],
      totalAmount: 13900
    });
    await requestBooking(reqBookFailAvail, resBookFailAvail, nextBookFailAvail);
    assert(
      resBookFailAvail.getStatus() === 400 && resBookFailAvail.getJson()?.message?.includes('available'),
      'Booking with accepted deal rejected if property is occupied / unavailable'
    );

    // Restore property availability
    testProp.status = 'available';
    await testProp.save();

    // Test expired offer rejection
    await Offer.findByIdAndUpdate(offer1._id, { expiresAt: new Date(Date.now() - 10000) });
    const { req: reqBookFailExp, res: resBookFailExp, next: nextBookFailExp } = mockReqRes(tenant1, {
      propertyId: testProp._id.toString(),
      offerId: offer1._id.toString(),
      startDate: new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 38 * 86400000).toISOString().split('T')[0],
      totalAmount: 13900
    });
    await requestBooking(reqBookFailExp, resBookFailExp, nextBookFailExp);
    assert(
      resBookFailExp.getStatus() === 400 && resBookFailExp.getJson()?.message?.includes('expired'),
      'Booking with expired private deal rejected with 400 OFFER_EXPIRED'
    );

    // Restore valid expiry and accepted status
    await Offer.findByIdAndUpdate(offer1._id, { status: 'accepted', expiresAt: new Date(Date.now() + 48 * 3600000) });

    console.log(`\n--- Test 10: Booking, Deposit Calculation & Lease Activation at Negotiated Rent ---`);
    const { req: reqBookOk, res: resBookOk, next: nextBookOk } = mockReqRes(tenant1, {
      propertyId: testProp._id.toString(),
      offerId: offer1._id.toString(),
      startDate: new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 38 * 86400000).toISOString().split('T')[0],
      totalAmount: 13900
    });
    await requestBooking(reqBookOk, resBookOk, nextBookOk);
    assert(resBookOk.getStatus() === 201, 'Booking request created successfully with 201 Created');
    const createdBooking = resBookOk.getJson()?.data;
    assert(
      createdBooking?.agreedRent === 13900 && createdBooking?.listedRent === 15000,
      'Booking preserves both agreedRent (₹13,900) and listedRent (₹15,000)'
    );

    // Verify Offer is linked to Booking
    const updatedOfferAfterBooking = await Offer.findById(offer1._id);
    assert(
      updatedOfferAfterBooking.booking?.toString() === createdBooking._id.toString(),
      'Offer is linked to booking record'
    );

    // Manager Approves Booking
    const { req: reqApprove, res: resApprove, next: nextApprove } = mockReqRes(manager, {}, { id: createdBooking._id.toString() });
    await approveBooking(reqApprove, resApprove, nextApprove);
    assert(resApprove.getStatus() === 200, 'Manager approved booking');

    // Execute Payment / Mock Payment to Activate Lease
    const { req: reqPay, res: resPay, next: nextPay } = mockReqRes(tenant1, {
      bookingId: createdBooking._id.toString(),
      paymentMethod: 'mock_card'
    });
    await processMockPayment(reqPay, resPay, nextPay);
    assert(resPay.getStatus() === 200, 'Payment processed and lease activated successfully');

    // Verify Active Lease
    const activeLease = await Lease.findOne({ booking: createdBooking._id });
    assert(
      activeLease !== null && activeLease.rentAmount === 13900,
      `Active lease created with agreed negotiated rent: ₹${activeLease?.rentAmount} (NOT public rent ₹15,000)`
    );

    // Verify Offer status is completed
    const completedOffer = await Offer.findById(offer1._id);
    assert(
      completedOffer.status === 'completed',
      'Offer status transitions to completed'
    );

    // Verify base Property rentAmount is STILL 15,000 (Immutable public rent)
    const finalProp = await Property.findById(testProp._id);
    assert(
      finalProp.rentAmount === 15000,
      'Property.rentAmount is completely untouched and remains ₹15,000'
    );

    // Clean up test data
    await Lease.deleteMany({ property: { $in: [testProp._id, testProp2._id] } });
    await Booking.deleteMany({ property: { $in: [testProp._id, testProp2._id] } });
    await Offer.deleteMany({ property: { $in: [testProp._id, testProp2._id] } });
    await PropertyVisit.deleteMany({ property: { $in: [testProp._id, testProp2._id] } });
    await Property.deleteMany({ _id: { $in: [testProp._id, testProp2._id] } });
    await User.deleteMany({ _id: tenant2._id });

    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log(`   E2E TEST RESULTS: ${passed} PASSED, ${failed} FAILED               `);
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runE2ETests();
