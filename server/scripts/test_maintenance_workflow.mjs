/**
 * server/scripts/test_maintenance_workflow.mjs
 *
 * Automated verification for:
 * 1. Unique Ticket Code generation (TMS-MNT-YYYYMMDD-XXXXXX)
 * 2. Per-Ticket QR Code Data URL generation
 * 3. Multi-Lease Association & Isolation
 * 4. Technician Work Completion Submission (work performed, parts, notes)
 * 5. Status Transition to awaiting_tenant_confirmation
 * 6. QR/ID-based Ticket Lookup & Verification
 * 7. Tenant / Authorized User Resolution Confirmation (status -> resolved)
 * 8. Double-Resolution Prevention Guard
 * 9. Comprehensive Audit Trail Logging
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
  console.log('=== [START] MAINTENANCE TICKET & RESOLUTION WORKFLOW TESTS ===\n');

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

    // 3. Test Creation of Tenant, Property, Lease & Multi-Lease Isolation
    const mockTenantUser = await User.findOne({ role: 'tenant' }).lean() || await User.create({
      firstName: 'Test',
      lastName: 'Tenant',
      email: `tenant_${Date.now()}@test.com`,
      password: 'Password123!',
      role: 'tenant'
    });

    const mockTechUser = await User.findOne({ role: 'technician' }).lean() || await User.create({
      firstName: 'Service',
      lastName: 'Tech',
      email: `tech_${Date.now()}@test.com`,
      password: 'Password123!',
      role: 'technician'
    });

    const mockProperty = await Property.findOne().lean() || await Property.create({
      name: 'Emerald Towers Unit 4B',
      address: '100 Sunset Blvd',
      city: 'Metropolis',
      state: 'CA',
      zipCode: '90001',
      monthlyRent: 2500
    });

    const mockLease = await Lease.findOne({ tenant: mockTenantUser._id }).lean() || await Lease.create({
      leaseNumber: `LS-${Date.now()}`,
      tenant: mockTenantUser._id,
      property: mockProperty._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      rentAmount: 2500,
      status: 'active',
      createdBy: mockTenantUser._id
    });

    console.log('\n--- Testing Request Creation with Multi-Lease Isolation ---');
    const createdTicket = await maintenanceServiceInstance.createRequest({
      title: 'Water Heater Temperature Sensor Replacement',
      category: 'plumbing',
      priority: 'high',
      description: 'Water heater temperature fluctuates rapidly.',
      lease: mockLease._id,
      property: mockProperty._id,
      unit: '4B'
    }, {
      userId: mockTenantUser._id,
      role: 'tenant',
      name: `${mockTenantUser.firstName} ${mockTenantUser.lastName}`
    });

    assert(Boolean(createdTicket.ticketCode), `Ticket created with unique ticketCode: ${createdTicket.ticketCode}`);
    assert(Boolean(createdTicket.qrCodeDataUrl), 'Ticket has embedded QR Code Data URL');
    assert(createdTicket.status === 'open', 'Ticket status initialized to "open"');
    assert(createdTicket.lease?.toString() === mockLease._id.toString(), 'Ticket correctly isolated and linked to Lease ID');
    assert(createdTicket.property?.toString() === mockProperty._id.toString(), 'Ticket correctly linked to Property ID');
    assert(createdTicket.auditLog.length >= 1, 'Ticket initialized with audit log entry');
    assert(createdTicket.auditLog[0].action === 'REQUEST_CREATED', 'Audit log first entry is REQUEST_CREATED');

    // 4. Test Technician Assignment & Work Completion Submission
    console.log('\n--- Testing Technician Work Completion Submission ---');
    createdTicket.assignedTo = mockTechUser._id;
    await createdTicket.save();

    const completionPayload = {
      workPerformed: 'Replaced digital thermostat and heating element in water heater.',
      partsUsed: '1x 240V Thermostat, 1x 4500W Heating Element',
      completionNotes: 'Calibrated to 120°F. Operational test passed successfully with zero error codes.'
    };

    const completedTicket = await maintenanceTicketService.submitTechnicianCompletion(
      createdTicket._id,
      completionPayload,
      {
        userId: mockTechUser._id,
        role: 'technician',
        name: `${mockTechUser.firstName} ${mockTechUser.lastName}`
      }
    );

    assert(completedTicket.status === 'awaiting_tenant_confirmation', 'Status transitioned to awaiting_tenant_confirmation');
    assert(completedTicket.completionStatus === 'completed_by_technician', 'completionStatus set to completed_by_technician');
    assert(completedTicket.completionDetails.workPerformed === completionPayload.workPerformed, 'Work performed recorded accurately');
    assert(completedTicket.completionDetails.partsUsed === completionPayload.partsUsed, 'Parts used recorded accurately');
    assert(Boolean(completedTicket.technicianCompletedAt), 'technicianCompletedAt timestamp saved');
    assert(completedTicket.auditLog.some(a => a.action === 'WORK_COMPLETED'), 'Audit trail records WORK_COMPLETED event');

    // 5. Test QR / Ticket ID Lookup & Verification
    console.log('\n--- Testing Verification by Ticket Code & QR ---');
    const lookupByCode = await maintenanceTicketService.verifyTicketByCode(createdTicket.ticketCode, {
      userId: mockTenantUser._id,
      role: 'tenant',
      name: `${mockTenantUser.firstName} ${mockTenantUser.lastName}`
    });

    assert(lookupByCode.ticket._id.toString() === createdTicket._id.toString(), 'Verified ticket successfully by ticketCode');
    assert(lookupByCode.canResolve === true, 'Authorized tenant recognized with canResolve = true');
    assert(lookupByCode.isAwaitingConfirmation === true, 'isAwaitingConfirmation flag is true');

    const lookupByQr = await maintenanceTicketService.verifyTicketByCode(createdTicket.qrToken, {
      userId: mockTenantUser._id,
      role: 'tenant'
    });
    assert(lookupByQr.ticket._id.toString() === createdTicket._id.toString(), 'Verified ticket successfully by QR token');

    // 6. Test Tenant Resolution & Feedback Rating
    console.log('\n--- Testing Tenant Resolution Confirmation ---');
    const resolvedTicket = await maintenanceTicketService.resolveMaintenanceTicket(
      createdTicket.ticketCode,
      {
        resolutionMethod: 'qr',
        rating: 5,
        comment: 'Great and fast repair by technician!'
      },
      {
        userId: mockTenantUser._id,
        role: 'tenant',
        name: `${mockTenantUser.firstName} ${mockTenantUser.lastName}`
      }
    );

    assert(resolvedTicket.status === 'resolved', 'Ticket status updated to "resolved"');
    assert(Boolean(resolvedTicket.resolvedAt), 'resolvedAt timestamp recorded');
    assert(resolvedTicket.resolvedBy?.toString() === mockTenantUser._id.toString(), 'resolvedBy correctly links to tenant user ID');
    assert(resolvedTicket.resolutionMethod === 'qr', 'resolutionMethod correctly saved as "qr"');
    assert(resolvedTicket.rating?.score === 5, 'Rating score 5 saved');
    assert(resolvedTicket.auditLog.some(a => a.action === 'TICKET_RESOLVED'), 'Audit log contains TICKET_RESOLVED action');

    // 7. Test Double-Resolution Prevention Guard
    console.log('\n--- Testing Double-Resolution Guard ---');
    let doubleResolveBlocked = false;
    try {
      await maintenanceTicketService.resolveMaintenanceTicket(
        createdTicket._id,
        { resolutionMethod: 'ticket_id' },
        { userId: mockTenantUser._id, role: 'tenant' }
      );
    } catch (err) {
      doubleResolveBlocked = true;
      assert(err.message.includes('already resolved'), 'Double resolution rejected with informative error message');
    }
    assert(doubleResolveBlocked, 'Double resolution strictly prevented');

    // Clean up test ticket
    await Maintenance.findByIdAndDelete(createdTicket._id);
    console.log('✓ Cleaned up test ticket');

  } catch (err) {
    console.error('Unhandled error during test:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    console.log('\n=== TEST RESULTS SUMMARY ===');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    if (failed === 0) {
      console.log('🎉 ALL MAINTENANCE WORKFLOW ACCEPTANCE TESTS PASSED!');
    }
  }
}

runTests();
