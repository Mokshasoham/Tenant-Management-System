/**
 * server/scripts/test_maintenance_workflow.mjs
 *
 * Automated verification for:
 * 1. Unique Ticket Code generation (TMS-MNT-YYYYMMDD-XXXXXX)
 * 2. Per-Ticket QR Code Data URL generation with TMS_MAINTENANCE prefix
 * 3. Multi-Lease Association & Isolation (e.g. "moksha's apartment" vs "house")
 * 4. Assigned Technician QR scanning & lookup
 * 5. Rejection of unauthorized / unrelated technicians (403 Forbidden)
 * 6. Technician Work Completion Submission & Immediate Resolution (status -> RESOLVED)
 * 7. Audit Trail Logging & Timestamps
 * 8. Double-Resolution Prevention Guard (400 Bad Request)
 * 9. Multi-lease ticket isolation (QR resolves exact lease/property)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Maintenance from '../src/models/Maintenance.js';
import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import Lease from '../src/models/Lease.js';
import * as maintenanceTicketService from '../src/services/maintenanceTicketService.js';
import maintenanceServiceInstance from '../src/services/maintenanceService.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tenant-management-system';

async function runTests() {
  console.log('=== [START] TECHNICIAN MAINTENANCE QR & RESOLUTION WORKFLOW TESTS ===\n');

  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB');

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name}`);
      failed++;
    }
  }

  try {
    // 1. Test Ticket Code Format
    const ticketCode = await maintenanceTicketService.generateUniqueTicketCode();
    const regexPattern = /^TMS-MNT-\d{8}-[A-Z0-9]{6}$/;
    assert(regexPattern.test(ticketCode), `Ticket Code matches format TMS-MNT-YYYYMMDD-XXXXXX: ${ticketCode}`);

    // 2. Test QR Code Data Generation
    const qrData = await maintenanceTicketService.generateQrData(ticketCode);
    assert(Boolean(qrData.qrToken && qrData.qrToken.length >= 16), 'QR Token generated with secure entropy');
    assert(qrData.qrCodeDataUrl.startsWith('data:image/png;base64,'), 'QR Code Data URL is valid Base64 PNG image');

    // 3. Multi-Lease Setup: "moksha's apartment" and "house"
    const mockTenant = await User.findOne({ email: 'moksha_tenant@test.com' }).lean() || await User.create({
      firstName: 'Moksha',
      lastName: 'Tenant',
      email: 'moksha_tenant@test.com',
      password: 'Password123!',
      role: 'tenant'
    });

    const assignedTech = await User.findOne({ email: 'assigned_tech@test.com' }).lean() || await User.create({
      firstName: 'Alex',
      lastName: 'Rivera',
      email: 'assigned_tech@test.com',
      password: 'Password123!',
      role: 'technician'
    });

    const unrelatedTech = await User.findOne({ email: 'unrelated_tech@test.com' }).lean() || await User.create({
      firstName: 'Unauthorized',
      lastName: 'Tech',
      email: 'unrelated_tech@test.com',
      password: 'Password123!',
      role: 'technician'
    });

    const propertyApartment = await Property.findOne({ name: "moksha's apartment" }).lean() || await Property.create({
      name: "moksha's apartment",
      address: '742 Evergreen Terrace, Apt 4B',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62704',
      rentAmount: 1800,
      monthlyRent: 1800,
      type: 'apartment',
      owner: mockTenant._id
    });

    const propertyHouse = await Property.findOne({ name: "house" }).lean() || await Property.create({
      name: "house",
      address: '100 Sunset Ranch Rd',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62704',
      rentAmount: 3200,
      monthlyRent: 3200,
      type: 'house',
      owner: mockTenant._id
    });

    const leaseApartment = await Lease.findOne({ property: propertyApartment._id }).lean() || await Lease.create({
      leaseNumber: `LS-APT-${Date.now()}`,
      tenant: mockTenant._id,
      property: propertyApartment._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      rentAmount: 1800,
      status: 'active',
      createdBy: mockTenant._id
    });

    const leaseHouse = await Lease.findOne({ property: propertyHouse._id }).lean() || await Lease.create({
      leaseNumber: `LS-HSE-${Date.now()}`,
      tenant: mockTenant._id,
      property: propertyHouse._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      rentAmount: 3200,
      status: 'active',
      createdBy: mockTenant._id
    });

    // 4. Create Ticket 1 for "moksha's apartment"
    console.log("\n--- Testing Request 1 Creation for 'moksha's apartment' ---");
    const ticketApartment = await maintenanceServiceInstance.createRequest({
      title: 'AC unit cooling coil replacement',
      category: 'hvac',
      priority: 'high',
      description: 'HVAC in mokshas apartment blowing warm air.',
      lease: leaseApartment._id,
      property: propertyApartment._id,
      unit: '4B'
    }, {
      userId: mockTenant._id,
      role: 'tenant',
      name: 'Moksha Tenant'
    });

    ticketApartment.assignedTo = assignedTech._id;
    await ticketApartment.save();

    assert(Boolean(ticketApartment.ticketCode), `Ticket 1 generated ticketCode: ${ticketApartment.ticketCode}`);
    assert(ticketApartment.lease.toString() === leaseApartment._id.toString(), "Ticket 1 isolated to 'moksha's apartment' lease");
    assert(ticketApartment.property.toString() === propertyApartment._id.toString(), "Ticket 1 isolated to 'moksha's apartment' property");

    // 5. Create Ticket 2 for "house"
    console.log("\n--- Testing Request 2 Creation for 'house' ---");
    const ticketHouse = await maintenanceServiceInstance.createRequest({
      title: 'Main water valve leak repair',
      category: 'plumbing',
      priority: 'medium',
      description: 'Leak near irrigation valve at the house.',
      lease: leaseHouse._id,
      property: propertyHouse._id,
      unit: 'Main'
    }, {
      userId: mockTenant._id,
      role: 'tenant',
      name: 'Moksha Tenant'
    });

    assert(ticketHouse.lease.toString() === leaseHouse._id.toString(), "Ticket 2 isolated to 'house' lease");
    assert(ticketHouse.property.toString() === propertyHouse._id.toString(), "Ticket 2 isolated to 'house' property");

    // 6. Test Technician QR Scanning
    console.log("\n--- Testing Technician QR Scanning for 'moksha's apartment' ---");
    const qrLookupString = `TMS_MAINTENANCE:${ticketApartment.ticketCode}:${ticketApartment.qrToken}`;
    
    // Assigned technician scans the QR
    const scanResult = await maintenanceTicketService.verifyTicketByCode(qrLookupString, {
      userId: assignedTech._id,
      role: 'technician',
      name: 'Alex Rivera'
    });

    assert(scanResult.ticket._id.toString() === ticketApartment._id.toString(), "QR scanner loaded exact 'moksha's apartment' ticket");
    assert(scanResult.ticket.property.name === "moksha's apartment", "Verified property name is 'moksha's apartment'");
    assert(scanResult.canResolve === true, 'Assigned technician granted canResolve = true');

    // 7. Test Security: Unrelated technician scanning is rejected (403 Forbidden)
    console.log('\n--- Testing Unauthorized Technician Rejection ---');
    let unauthorizedBlocked = false;
    try {
      await maintenanceTicketService.verifyTicketByCode(qrLookupString, {
        userId: unrelatedTech._id,
        role: 'technician',
        name: 'Unauthorized Tech'
      });
    } catch (err) {
      unauthorizedBlocked = true;
      assert(err.statusCode === 403, 'Unauthorized technician lookup blocked with 403 Forbidden');
    }
    assert(unauthorizedBlocked, 'Unrelated technician strictly prevented from accessing assigned ticket');

    // 8. Test Technician Work Completion & Direct Resolution
    console.log('\n--- Testing Technician Work Completion & Immediate Resolution ---');
    const completionPayload = {
      workPerformed: 'Replaced AC evaporator coil and charged R410A refrigerant to 120 PSI.',
      partsUsed: '1x 2.5 Ton Evaporator Coil, 3 lbs R410A Refrigerant, Copper fitting kit',
      completionNotes: 'System tested at 68°F supply air temperature. Airflow nominal, zero leaks.'
    };

    const resolvedTicket = await maintenanceTicketService.submitTechnicianCompletion(
      ticketApartment._id,
      completionPayload,
      {
        userId: assignedTech._id,
        role: 'technician',
        name: 'Alex Rivera'
      }
    );

    assert(resolvedTicket.status === 'resolved', 'Ticket status updated immediately to RESOLVED upon technician completion');
    assert(resolvedTicket.completionStatus === 'resolved', 'completionStatus set to resolved');
    assert(resolvedTicket.completionDetails.workPerformed === completionPayload.workPerformed, 'Work performed recorded accurately');
    assert(resolvedTicket.completionDetails.partsUsed === completionPayload.partsUsed, 'Parts used recorded accurately');
    assert(Boolean(resolvedTicket.resolvedAt), 'resolvedAt timestamp recorded');
    assert(resolvedTicket.resolvedBy.toString() === assignedTech._id.toString(), 'resolvedBy correctly links to technician user ID');
    assert(Boolean(resolvedTicket.technicianCompletedAt), 'technicianCompletedAt timestamp recorded');
    assert(resolvedTicket.auditLog.some(a => a.action === 'WORK_COMPLETED_AND_RESOLVED'), 'Audit log contains WORK_COMPLETED_AND_RESOLVED action');

    // 9. Test Tenant Maintenance Queries reflect RESOLVED status
    console.log('\n--- Testing Tenant View Reflects RESOLVED Status ---');
    const tenantTicketLookup = await Maintenance.findById(ticketApartment._id)
      .populate('property', 'name')
      .populate('lease', 'leaseNumber');

    assert(tenantTicketLookup.status === 'resolved', "Tenant query confirms 'moksha's apartment' ticket is RESOLVED");
    assert(tenantTicketLookup.property.name === "moksha's apartment", "Associated property remains 'moksha's apartment'");

    // 10. Test Multi-Lease Isolation: 'house' ticket remains unaffected in its initial state
    const houseTicketLookup = await Maintenance.findById(ticketHouse._id);
    assert(houseTicketLookup.status === 'open', "'house' ticket remains in OPEN status (no cross-talk)");

    // 11. Test Double-Resolution Guard
    console.log('\n--- Testing Double-Resolution Prevention Guard ---');
    let doubleResolveBlocked = false;
    try {
      await maintenanceTicketService.submitTechnicianCompletion(
        ticketApartment._id,
        { workPerformed: 'Trying to resolve again' },
        { userId: assignedTech._id, role: 'technician' }
      );
    } catch (err) {
      doubleResolveBlocked = true;
      assert(err.message.includes('already resolved'), 'Duplicate completion submission rejected');
    }
    assert(doubleResolveBlocked, 'Already-resolved ticket cannot be resolved again');

    // Clean up test tickets
    await Maintenance.deleteMany({ _id: { $in: [ticketApartment._id, ticketHouse._id] } });
    console.log('\n✓ Cleaned up test records');

  } catch (err) {
    console.error('Unhandled error during test:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    console.log('\n=== TEST RESULTS SUMMARY ===');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    if (failed === 0) {
      console.log('🎉 ALL TECHNICIAN MAINTENANCE QR & RESOLUTION WORKFLOW TESTS PASSED!');
    }
  }
}

runTests();

