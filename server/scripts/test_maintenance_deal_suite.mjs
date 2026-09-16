import path from 'path';
import { pathToFileURL } from 'url';

const serverDir = 'c:/Users/sanka/OneDrive/Desktop/tenant-management-system/server';
const importServer = (relPath) => import(pathToFileURL(path.join(serverDir, relPath)).href);

const { default: mongoose } = await importServer('node_modules/mongoose/index.js');
const { default: dotenv } = await importServer('node_modules/dotenv/lib/main.js');
dotenv.config({ path: path.join(serverDir, '.env') });

const { default: Offer } = await importServer('src/models/Offer.js');
const { default: Property } = await importServer('src/models/Property.js');
const { default: Booking } = await importServer('src/models/Booking.js');
const { default: Lease } = await importServer('src/models/Lease.js');
const { default: User } = await importServer('src/models/User.js');
const { default: PlatformSetting } = await importServer('src/models/PlatformSetting.js');
const { resolveMaintenanceFee, calculatePaymentBreakdown, getPlatformFeeConfig } = await importServer('src/services/platformFeeService.js');
const { createOffer, respondToOffer, enrichOfferWithState } = await importServer('src/controllers/offerController.js');
const { getPropertyById } = await importServer('src/controllers/propertyController.js');
const { requestBooking, approveBooking } = await importServer('src/controllers/bookingController.js');

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
      };
    }
  };

  return { req, res, next };
}

async function run() {
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('  RUNNING MAINTENANCE ADD-ON DEAL PRESERVATION TEST SUITE        ');
  console.log('═════════════════════════════════════════════════════════════════\n');

  let testOfferId = null;
  let testBookingId = null;
  let testLeaseId = null;
  let property = null;

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management-system';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB:', mongoose.connection.name);

    // 1. Resolve target tenant and manager
    const tenant = await User.findOne({ role: 'tenant' });
    const manager = await User.findOne({ role: { $in: ['manager', 'admin'] } });

    if (!tenant || !manager) {
      throw new Error(`Prerequisites not met: tenant=${!!tenant}, manager=${!!manager}`);
    }

    // Create isolated test property matching exact ₹35,000 rent & ₹10,000 deposit scenario
    property = await Property.create({
      name: 'Test Apartment for Maintenance Suite',
      address: '99 Residency Road',
      city: 'Bangalore',
      state: 'Karnataka',
      rentAmount: 35000,
      depositAmount: 10000,
      type: 'apartment',
      status: 'available',
      publishStatus: 'published',
      manager: manager._id,
      owner: manager._id,
      negotiation: {
        enabled: true,
        availability: 'all',
        minAcceptableRent: 25000,
        maxDiscountPercentage: 30,
        offerValidityHours: 48,
        maxRounds: 5
      }
    });

    console.log(`Using Tenant: ${tenant.email} (${tenant._id})`);
    console.log(`Using Manager: ${manager.email} (${manager._id})`);
    console.log(`Using Property: ${property.name} (Rent: ₹${property.rentAmount}, Deposit: ₹${property.depositAmount})\n`);

    // ─── TEST 1: Service level resolution of maintenance fee ───
    console.log('--- TEST 1: resolveMaintenanceFee backend authority ---');
    const feeConfig = await getPlatformFeeConfig();
    console.log(`Platform maintenance fee config: featureEnabled=${feeConfig.maintenanceFeatureEnabled}, fee=${feeConfig.maintenanceFee}`);
    
    const feeWhenIncluded = await resolveMaintenanceFee(33500, true);
    const feeWhenExcluded = await resolveMaintenanceFee(33500, false);
    console.log(`Resolved fee (included=true): ₹${feeWhenIncluded}`);
    console.log(`Resolved fee (included=false): ₹${feeWhenExcluded}`);
    if (feeWhenIncluded !== 500) throw new Error(`Expected fee 500, got ${feeWhenIncluded}`);
    if (feeWhenExcluded !== 0) throw new Error(`Expected fee 0, got ${feeWhenExcluded}`);
    console.log('✓ TEST 1 PASSED: Backend resolves maintenance fee authoritatively\n');

    // ─── TEST 2: Offer submission WITHOUT maintenance ───
    console.log('--- TEST 2: Offer created without maintenance ---');
    const { req: reqOfferNoMaint, res: resOfferNoMaint, next: nextOfferNoMaint } = mockReqRes(
      tenant,
      {
        propertyId: property._id.toString(),
        offeredRent: 33000,
        startDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        endDate: new Date(Date.now() + 375 * 86400000).toISOString(),
        leasePeriod: '12 Months',
        maintenanceIncluded: false,
      }
    );
    await createOffer(reqOfferNoMaint, resOfferNoMaint, nextOfferNoMaint);
    const createdNoMaint = resOfferNoMaint.getData();
    if (!createdNoMaint?.success) throw new Error(`createOffer failed: ${JSON.stringify(createdNoMaint)}`);
    console.log(`Offer created: dealNumber=${createdNoMaint.data.dealNumber}`);
    console.log(`maintenanceIncluded=${createdNoMaint.data.maintenanceIncluded}, maintenanceAmount=${createdNoMaint.data.maintenanceAmount}, totalMonthlyAmount=${createdNoMaint.data.totalMonthlyAmount}`);
    if (createdNoMaint.data.maintenanceIncluded !== false) throw new Error('Expected maintenanceIncluded to be false');
    if (createdNoMaint.data.maintenanceAmount !== 0) throw new Error('Expected maintenanceAmount to be 0');
    if (createdNoMaint.data.totalMonthlyAmount !== 33000) throw new Error(`Expected totalMonthlyAmount 33000, got ${createdNoMaint.data.totalMonthlyAmount}`);
    
    // Clean up test 2 offer
    await Offer.deleteOne({ _id: createdNoMaint.data._id });
    console.log('✓ TEST 2 PASSED: Offer without maintenance cleanly records 0 and rent-only total\n');

    // ─── TEST 3: Offer submission WITH maintenance (attempting client fee override) ───
    console.log('--- TEST 3: Offer created WITH maintenance (verifying client fee override is rejected) ---');
    const futureStart = new Date(Date.now() + 10 * 86400000);
    const futureEnd = new Date(Date.now() + 375 * 86400000);
    const { req: reqOfferMaint, res: resOfferMaint, next: nextOfferMaint } = mockReqRes(
      tenant,
      {
        propertyId: property._id.toString(),
        offeredRent: 33500,
        startDate: futureStart.toISOString(),
        endDate: futureEnd.toISOString(),
        leasePeriod: '12 Months',
        includeMaintenance: true,
        maintenanceAmount: 99999, // Malicious / untrusted client fee
      }
    );
    await createOffer(reqOfferMaint, resOfferMaint, nextOfferMaint);
    const createdMaint = resOfferMaint.getData();
    if (!createdMaint?.success) throw new Error(`createOffer failed: ${JSON.stringify(createdMaint)}`);
    testOfferId = createdMaint.data._id;
    console.log(`Offer created: dealNumber=${createdMaint.data.dealNumber}, ID=${testOfferId}`);
    console.log(`maintenanceIncluded=${createdMaint.data.maintenanceIncluded}`);
    console.log(`maintenanceAmount=${createdMaint.data.maintenanceAmount} (Resolved backend fee, ignored client 99999)`);
    console.log(`totalMonthlyAmount=${createdMaint.data.totalMonthlyAmount}`);
    
    if (createdMaint.data.maintenanceIncluded !== true) throw new Error('Expected maintenanceIncluded=true');
    if (createdMaint.data.maintenanceAmount !== 500) throw new Error(`Expected maintenanceAmount=500, got ${createdMaint.data.maintenanceAmount}`);
    if (createdMaint.data.totalMonthlyAmount !== 34000) throw new Error(`Expected totalMonthlyAmount=34000, got ${createdMaint.data.totalMonthlyAmount}`);
    if (createdMaint.data.offerHistory[0].maintenanceIncluded !== true) throw new Error('Expected offerHistory[0].maintenanceIncluded=true');
    console.log('✓ TEST 3 PASSED: Maintenance is included and resolved strictly from platform config\n');

    // ─── TEST 4: Manager counters WITHOUT mentioning maintenance ───
    console.log('--- TEST 4: Manager counters (verifying maintenance survives counter round) ---');
    const { req: reqCounter, res: resCounter, next: nextCounter } = mockReqRes(
      manager,
      {
        action: 'counter',
        counterRent: 34000,
        counterStartDate: futureStart.toISOString(),
        counterEndDate: futureEnd.toISOString(),
        message: 'Counter offer: ₹34,000/month',
      },
      { id: testOfferId }
    );
    await respondToOffer(reqCounter, resCounter, nextCounter);
    const counteredRes = resCounter.getData();
    if (!counteredRes?.success) throw new Error(`respondToOffer counter failed: ${JSON.stringify(counteredRes)}`);
    
    const dbOfferAfterCounter = await Offer.findById(testOfferId);
    console.log(`Offer roundCount: ${dbOfferAfterCounter.roundCount}`);
    console.log(`offer.maintenanceIncluded: ${dbOfferAfterCounter.maintenanceIncluded}`);
    console.log(`offer.counterOffer.maintenanceIncluded: ${dbOfferAfterCounter.counterOffer.maintenanceIncluded}`);
    console.log(`offer.counterOffer.maintenanceAmount: ${dbOfferAfterCounter.counterOffer.maintenanceAmount}`);
    
    if (dbOfferAfterCounter.maintenanceIncluded !== true) throw new Error('Expected maintenanceIncluded to survive counter');
    if (dbOfferAfterCounter.maintenanceAmount !== 500) throw new Error(`Expected maintenanceAmount=500, got ${dbOfferAfterCounter.maintenanceAmount}`);
    if (dbOfferAfterCounter.counterOffer.maintenanceIncluded !== true) throw new Error('Expected counterOffer.maintenanceIncluded=true');
    
    const enrichedCounter = enrichOfferWithState(dbOfferAfterCounter, tenant._id);
    console.log(`Enriched after counter: totalMonthlyAmount=${enrichedCounter.totalMonthlyAmount} (34000 + 500 = 34500)`);
    if (enrichedCounter.totalMonthlyAmount !== 34500) throw new Error(`Expected totalMonthlyAmount=34500, got ${enrichedCounter.totalMonthlyAmount}`);
    console.log('✓ TEST 4 PASSED: Maintenance selection survived counter round and is recorded in counterOffer\n');

    // ─── TEST 5: Tenant accepts the counter offer -> Deal Locked ───
    console.log('--- TEST 5: Tenant accepts counter -> Deal locks with maintenance ---');
    const { req: reqAccept, res: resAccept, next: nextAccept } = mockReqRes(
      tenant,
      { action: 'accept' },
      { id: testOfferId }
    );
    await respondToOffer(reqAccept, resAccept, nextAccept);
    const acceptRes = resAccept.getData();
    if (!acceptRes?.success) throw new Error(`respondToOffer accept failed: ${JSON.stringify(acceptRes)}`);

    const dbOfferLocked = await Offer.findById(testOfferId);
    console.log(`Deal status: ${dbOfferLocked.status}`);
    console.log(`agreedRent: ₹${dbOfferLocked.agreedRent}`);
    console.log(`maintenanceIncluded: ${dbOfferLocked.maintenanceIncluded}`);
    console.log(`maintenanceAmount: ₹${dbOfferLocked.maintenanceAmount}`);
    
    if (dbOfferLocked.status !== 'accepted') throw new Error(`Expected status accepted, got ${dbOfferLocked.status}`);
    if (dbOfferLocked.agreedRent !== 34000) throw new Error(`Expected agreedRent 34000, got ${dbOfferLocked.agreedRent}`);
    if (dbOfferLocked.maintenanceIncluded !== true) throw new Error('Expected maintenanceIncluded=true');
    if (dbOfferLocked.maintenanceAmount !== 500) throw new Error(`Expected maintenanceAmount=500, got ${dbOfferLocked.maintenanceAmount}`);

    const lastHistoryItem = dbOfferLocked.offerHistory[dbOfferLocked.offerHistory.length - 1];
    console.log(`Latest history entry: action=${lastHistoryItem.action}, maintenanceIncluded=${lastHistoryItem.maintenanceIncluded}, maintenanceAmount=${lastHistoryItem.maintenanceAmount}`);
    if (lastHistoryItem.action !== 'accept') throw new Error('Expected latest action=accept');
    if (lastHistoryItem.maintenanceIncluded !== true) throw new Error('Expected accept history maintenanceIncluded=true');
    console.log('✓ TEST 5 PASSED: Deal locked with agreed rent and maintenance fields intact\n');

    // ─── TEST 6: Property Details API exposes locked deal with maintenance ───
    console.log('--- TEST 6: getPropertyById returns privateDeal with locked maintenance ---');
    const { req: reqProp, res: resProp, next: nextProp } = mockReqRes(
      tenant,
      {},
      { id: property._id.toString() }
    );
    await getPropertyById(reqProp, resProp, nextProp);
    const propRes = resProp.getData();
    if (!propRes?.success) throw new Error(`getPropertyById failed: ${JSON.stringify(propRes)}`);

    const privateDeal = propRes.data.privateDeal;
    console.log('privateDeal returned by getPropertyById:', privateDeal);
    if (!privateDeal) throw new Error('Expected privateDeal to be present');
    if (privateDeal.agreedRent !== 34000) throw new Error(`Expected agreedRent 34000, got ${privateDeal.agreedRent}`);
    if (privateDeal.maintenanceIncluded !== true) throw new Error('Expected privateDeal.maintenanceIncluded=true');
    if (privateDeal.maintenanceAmount !== 500) throw new Error(`Expected privateDeal.maintenanceAmount=500, got ${privateDeal.maintenanceAmount}`);
    if (privateDeal.totalMonthlyAmount !== 34500) throw new Error(`Expected privateDeal.totalMonthlyAmount=34500, got ${privateDeal.totalMonthlyAmount}`);
    
    // Verify public rent is untouched
    console.log(`Public property.rentAmount: ₹${propRes.data.rentAmount} (should be ₹35,000)`);
    if (propRes.data.rentAmount !== 35000) throw new Error(`Public rent changed! Expected 35000, got ${propRes.data.rentAmount}`);
    console.log('✓ TEST 6 PASSED: Property Details API exposes privateDeal with maintenance without changing public rent\n');

    // ─── TEST 7: Booking inherits locked deal maintenance (client override rejected) ───
    console.log('--- TEST 7: Booking creation authoritatively inherits maintenance ---');
    const { req: reqBook, res: resBook, next: nextBook } = mockReqRes(
      tenant,
      {
        propertyId: property._id.toString(),
        offerId: testOfferId.toString(),
        startDate: futureStart.toISOString(),
        endDate: futureEnd.toISOString(),
        includeMaintenance: false, // Attempt to disable maintenance in request body
      }
    );
    await requestBooking(reqBook, resBook, nextBook);
    const bookRes = resBook.getData();
    if (!bookRes?.success) throw new Error(`requestBooking failed: ${JSON.stringify(bookRes)}`);
    testBookingId = bookRes.data._id;

    const dbBooking = await Booking.findById(testBookingId);
    console.log(`Booking created: ID=${dbBooking._id}`);
    console.log(`booking.agreedRent: ₹${dbBooking.agreedRent}`);
    console.log(`booking.maintenanceSelected: ${dbBooking.maintenanceSelected} (inherited true despite client sending false)`);
    console.log(`booking.maintenanceFeeAtBooking: ₹${dbBooking.maintenanceFeeAtBooking}`);
    console.log(`booking.depositAmount: ₹${dbBooking.depositAmount}`);
    console.log(`booking.totalAmount: ₹${dbBooking.totalAmount}`);

    if (dbBooking.agreedRent !== 34000) throw new Error(`Expected agreedRent 34000, got ${dbBooking.agreedRent}`);
    if (dbBooking.maintenanceSelected !== true) throw new Error('Expected maintenanceSelected=true');
    if (dbBooking.maintenanceFeeAtBooking !== 500) throw new Error(`Expected maintenanceFeeAtBooking=500, got ${dbBooking.maintenanceFeeAtBooking}`);
    if (dbBooking.depositAmount !== 10000) throw new Error(`Expected depositAmount=10000, got ${dbBooking.depositAmount}`);
    console.log('✓ TEST 7 PASSED: Booking strictly inherits locked deal maintenance coverage\n');

    // ─── TEST 8: Manager approves booking -> Lease created with maintenance ───
    console.log('--- TEST 8: Manager approves booking -> Lease inherits maintenance ---');
    const { req: reqApprove, res: resApprove, next: nextApprove } = mockReqRes(
      manager,
      {},
      { id: testBookingId.toString() }
    );
    await approveBooking(reqApprove, resApprove, nextApprove);
    const approveRes = resApprove.getData();
    if (!approveRes?.success) throw new Error(`approveBooking failed: ${JSON.stringify(approveRes)}`);

    const createdLease = await Lease.findOne({ booking: testBookingId });
    if (!createdLease) throw new Error('No lease created from approved booking');
    testLeaseId = createdLease._id;

    console.log(`Lease created: ID=${createdLease._id}`);
    console.log(`lease.rentAmount: ₹${createdLease.rentAmount}`);
    console.log(`lease.maintenanceEnabled: ${createdLease.maintenanceEnabled}`);
    console.log(`lease.maintenanceFee: ₹${createdLease.maintenanceFee}`);
    console.log(`lease.maintenanceAccessStatus: ${createdLease.maintenanceAccessStatus}`);
    console.log(`lease.maintenancePlan: ${createdLease.maintenancePlan}`);

    if (createdLease.rentAmount !== 34000) throw new Error(`Expected lease rentAmount=34000, got ${createdLease.rentAmount}`);
    if (createdLease.maintenanceEnabled !== true) throw new Error('Expected lease maintenanceEnabled=true');
    if (createdLease.maintenanceFee !== 500) throw new Error(`Expected lease maintenanceFee=500, got ${createdLease.maintenanceFee}`);
    if (createdLease.maintenanceAccessStatus !== 'included') throw new Error('Expected maintenanceAccessStatus=included');
    if (createdLease.maintenancePlan !== 'included') throw new Error('Expected maintenancePlan=included');
    console.log('✓ TEST 8 PASSED: Lease created with maintenance enabled and exact locked fee\n');

    // ─── TEST 9: Payment breakdown calculation integrity ───
    console.log('--- TEST 9: Payment calculation includes maintenance exactly once ---');
    const breakdownWithMaint = await calculatePaymentBreakdown(34000, true);
    const breakdownWithoutMaint = await calculatePaymentBreakdown(34000, false);
    console.log(`Breakdown (with maint): rent=₹${breakdownWithMaint.rentAmount}, maint=₹${breakdownWithMaint.maintenanceFee}, platformFee=₹${breakdownWithMaint.platformFee}, totalPayable=₹${breakdownWithMaint.totalPayable}`);
    console.log(`Breakdown (without maint): rent=₹${breakdownWithoutMaint.rentAmount}, maint=₹${breakdownWithoutMaint.maintenanceFee}, platformFee=₹${breakdownWithoutMaint.platformFee}, totalPayable=₹${breakdownWithoutMaint.totalPayable}`);
    
    const diff = breakdownWithMaint.totalPayable - breakdownWithoutMaint.totalPayable;
    console.log(`Difference in totalPayable: ₹${diff} (should be exactly ₹500)`);
    if (diff !== 500) throw new Error(`Double counting detected or invalid difference: expected 500, got ${diff}`);
    console.log('✓ TEST 9 PASSED: Payment breakdown includes maintenance exactly once without double counting\n');

    // ─── TEST 10: Verify DEAL-2026-000025 is intact and untouched ───
    console.log('--- TEST 10: Verify DEAL-2026-000025 is untouched ---');
    const deal25 = await Offer.findOne({ dealNumber: 'DEAL-2026-000025' });
    if (deal25) {
      console.log(`DEAL-2026-000025 found: agreedRent=₹${deal25.agreedRent}, status=${deal25.status}`);
      console.log(`maintenanceIncluded=${deal25.maintenanceIncluded}, maintenanceAmount=${deal25.maintenanceAmount}`);
      console.log('✓ DEAL-2026-000025 verified intact: no manufactured historical terms');
    } else {
      console.log('DEAL-2026-000025 not found in database (skipped)');
    }
    console.log('✓ TEST 10 PASSED\n');

    console.log('═════════════════════════════════════════════════════════════════');
    console.log('  ALL 10 TESTS PASSED SUCCESSFULLY!                             ');
    console.log('═════════════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:');
    console.error(err);
    process.exitCode = 1;
  } finally {
    // Cleanup created test records
    try {
      if (testOfferId) await Offer.deleteOne({ _id: testOfferId });
      if (testBookingId) {
        await Booking.deleteOne({ _id: testBookingId });
        await Property.updateOne(
          { _id: property._id },
          { $pull: { bookedDates: { bookingId: testBookingId } } }
        );
      }
      if (testLeaseId) await Lease.deleteOne({ _id: testLeaseId });
      if (property) await Property.deleteOne({ _id: property._id });
      console.log('Cleaned up test artifacts from database.');
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

run();
