import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

import Property from '../src/models/Property.js';
import PropertyVisit from '../src/models/PropertyVisit.js';
import Booking from '../src/models/Booking.js';
import Lease from '../src/models/Lease.js';
import Tenant from '../src/models/Tenant.js';
import User from '../src/models/User.js';

async function runNavigationAuthSuite() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('================================================================');
  console.log('   SECURE APPROVAL-GATED NAVIGATION AUTHENTICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, name) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
    }
  }

  // Find a tenant, manager, and property
  const tenant = await User.findOne({ role: 'tenant' });
  const manager = await User.findOne({ role: 'manager' });
  const prop = await Property.findOne({ isTest: { $ne: true }, isInternal: { $ne: true } });

  assert(Boolean(tenant), 'Tenant user identified');
  assert(Boolean(manager), 'Manager user identified');
  assert(Boolean(prop), 'Public property identified');

  const tenantId = tenant._id;
  const propId = prop._id;

  // Cleanup any test visits/bookings for this pair
  await PropertyVisit.deleteMany({ property: propId, tenant: tenantId });
  await Booking.deleteMany({ property: propId, user: tenantId });
  await Lease.deleteMany({ property: propId, tenant: tenantId });

  // Simulate endpoint evaluation function (same business logic as controller)
  async function evaluateNavigationAccess(userId, userRole) {
    const isManagerOrOwner =
      userRole === 'admin' ||
      userRole === 'manager' ||
      (prop.manager && String(prop.manager) === String(userId)) ||
      (prop.owner && String(prop.owner) === String(userId));

    let isAuthorized = isManagerOrOwner;
    let reason = isManagerOrOwner ? 'manager_access' : null;
    let approvedDate = null;
    let timeSlot = null;

    if (!isAuthorized) {
      const approvedVisit = await PropertyVisit.findOne({
        property: prop._id,
        tenant: userId,
        status: 'approved'
      }).sort({ updatedAt: -1 });

      if (approvedVisit) {
        isAuthorized = true;
        reason = 'visit_approved';
        approvedDate = approvedVisit.visitDate;
        timeSlot = approvedVisit.timeSlot;
      }
    }

    if (!isAuthorized) {
      const approvedBooking = await Booking.findOne({
        property: prop._id,
        user: userId,
        $or: [
          { status: { $in: ['approved', 'confirmed', 'active'] } },
          { paymentStatus: 'paid' }
        ]
      }).sort({ updatedAt: -1 });

      if (approvedBooking) {
        isAuthorized = true;
        reason = 'booking_approved';
        approvedDate = approvedBooking.startDate;
      }
    }

    if (!isAuthorized) {
      const tenantDoc = await Tenant.findOne({ user: userId });
      const tenantIds = [userId, tenantDoc?._id].filter(Boolean);

      const approvedLease = await Lease.findOne({
        property: prop._id,
        $or: [
          { tenant: { $in: tenantIds } },
          { user: { $in: tenantIds } }
        ],
        status: { $in: ['active', 'signed', 'pending_payment'] }
      }).sort({ updatedAt: -1 });

      if (approvedLease) {
        isAuthorized = true;
        reason = 'lease_active';
        approvedDate = approvedLease.startDate;
      }
    }

    if (!isAuthorized) {
      const [pendingVisit, pendingBooking, rejectedVisit, rejectedBooking] = await Promise.all([
        PropertyVisit.findOne({ property: prop._id, tenant: userId, status: 'pending' }).sort({ updatedAt: -1 }),
        Booking.findOne({ property: prop._id, user: userId, status: 'pending' }).sort({ updatedAt: -1 }),
        PropertyVisit.findOne({ property: prop._id, tenant: userId, status: 'rejected' }).sort({ updatedAt: -1 }),
        Booking.findOne({ property: prop._id, user: userId, status: 'rejected' }).sort({ updatedAt: -1 })
      ]);

      let lockStatus = 'locked';
      if (pendingVisit || pendingBooking) {
        lockStatus = 'pending_approval';
      } else if (rejectedVisit || rejectedBooking) {
        lockStatus = 'rejected';
      }

      return { authorized: false, status: lockStatus, destinationUrl: null };
    }

    let lat = prop.location?.lat;
    let lng = prop.location?.lng;
    const hasValidCoords = lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng));
    const fullAddress = [prop.address, prop.city, prop.state, prop.zipCode].filter(Boolean).join(', ');
    let destinationUrl = hasValidCoords ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;

    return { authorized: true, status: 'unlocked', reason, destinationUrl, approvedDate, timeSlot };
  }

  // TEST 1: Unrequested / Viewing tenant -> Locked
  const res1 = await evaluateNavigationAccess(tenantId, 'tenant');
  assert(res1.authorized === false && res1.status === 'locked' && res1.destinationUrl === null, '1. Tenant merely viewing property has navigation strictly locked');

  // TEST 2: Pending visit request -> Pending Approval
  const pendingVisit = await PropertyVisit.create({
    property: propId,
    tenant: tenantId,
    manager: manager._id,
    visitDate: new Date(Date.now() + 86400000),
    timeSlot: '10:00 AM - 11:00 AM',
    status: 'pending'
  });
  const res2 = await evaluateNavigationAccess(tenantId, 'tenant');
  assert(res2.authorized === false && res2.status === 'pending_approval' && res2.destinationUrl === null, '2. Pending visit request keeps navigation locked (Awaiting Approval)');

  // TEST 3: Rejected visit request -> Rejected
  pendingVisit.status = 'rejected';
  await pendingVisit.save();
  const res3 = await evaluateNavigationAccess(tenantId, 'tenant');
  assert(res3.authorized === false && res3.status === 'rejected' && res3.destinationUrl === null, '3. Rejected visit request keeps navigation locked (Restricted)');

  // TEST 4: Approved visit request -> Unlocked with coordinates
  pendingVisit.status = 'approved';
  await pendingVisit.save();
  const res4 = await evaluateNavigationAccess(tenantId, 'tenant');
  assert(res4.authorized === true && res4.status === 'unlocked' && res4.reason === 'visit_approved' && res4.destinationUrl.includes('google.com/maps'), '4. Approved visit request unlocks navigation and provides destination URL');

  // Cleanup visit
  await PropertyVisit.deleteOne({ _id: pendingVisit._id });

  // TEST 5: Pending booking -> Pending Approval
  const pendingBooking = await Booking.create({
    property: propId,
    user: tenantId,
    manager: manager._id,
    startDate: new Date(Date.now() + 86400000),
    endDate: new Date(Date.now() + 86400000 * 30),
    totalAmount: 15000,
    status: 'pending'
  });
  const res5 = await evaluateNavigationAccess(tenantId, 'tenant');
  assert(res5.authorized === false && res5.status === 'pending_approval', '5. Pending booking keeps navigation locked');

  // TEST 6: Approved booking -> Unlocked
  pendingBooking.status = 'approved';
  await pendingBooking.save();
  const res6 = await evaluateNavigationAccess(tenantId, 'tenant');
  assert(res6.authorized === true && res6.status === 'unlocked' && res6.reason === 'booking_approved' && Boolean(res6.destinationUrl), '6. Approved booking unlocks navigation');

  // TEST 7: Cancelled booking -> Locked again
  pendingBooking.status = 'cancelled';
  await pendingBooking.save();
  const res7 = await evaluateNavigationAccess(tenantId, 'tenant');
  assert(res7.authorized === false && res7.status === 'locked', '7. Cancelled booking revokes navigation access');

  // Cleanup booking
  await Booking.deleteOne({ _id: pendingBooking._id });

  // TEST 8: Manager access -> Always authorized
  const res8 = await evaluateNavigationAccess(manager._id, 'manager');
  assert(res8.authorized === true && res8.reason === 'manager_access', '8. Manager role has legitimate management access');

  console.log('\n================================================================');
  console.log(`   SUITE RESULT: ${passed} / ${total} TESTS PASSED`);
  console.log('================================================================\n');

  await mongoose.disconnect();
  process.exit(passed === total ? 0 : 1);
}

runNavigationAuthSuite();
