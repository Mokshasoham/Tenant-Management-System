import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import Booking from '../src/models/Booking.js';
import Lease from '../src/models/Lease.js';
import Tenant from '../src/models/Tenant.js';
import Payment from '../src/models/Payment.js';
import PaymentTransaction from '../src/models/PaymentTransaction.js';
import PlatformSetting from '../src/models/PlatformSetting.js';
import maintenanceService from '../src/services/maintenanceService.js';
import { calculatePaymentBreakdown, getPlatformFeeConfig } from '../src/services/platformFeeService.js';
import { verifyAndProcessPaymentInternal } from '../src/controllers/bookingController.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant_management_system';

async function runTests() {
    console.log('====================================================');
    console.log('🧪 RUNNING MAINTENANCE ADD-ON COMPREHENSIVE TEST SUITE');
    console.log('====================================================\n');

    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    let passed = 0;
    let failed = 0;

    const assert = (condition, message) => {
        if (condition) {
            console.log(`  ✓ PASS: ${message}`);
            passed++;
        } else {
            console.error(`  ✗ FAIL: ${message}`);
            failed++;
        }
    };

    try {
        // --- 1. Test Platform Fee Breakdown Calculation ---
        console.log('--- Test Group 1: Server-Side Fee Breakdown ---');
        const config = await getPlatformFeeConfig();
        const baseRent = 20000;

        const withoutMaint = await calculatePaymentBreakdown(baseRent, false);
        assert(withoutMaint.maintenanceFee === 0, 'No maintenance fee when includeMaintenance = false');
        assert(withoutMaint.totalPayable === withoutMaint.rentAmount + withoutMaint.platformFee + withoutMaint.taxAmount, 'Correct total without maintenance');

        const withMaint = await calculatePaymentBreakdown(baseRent, true);
        assert(withMaint.maintenanceFee === (config.maintenanceFee !== undefined ? config.maintenanceFee : 500), `Maintenance fee is ₹${config.maintenanceFee || 500} when includeMaintenance = true`);
        assert(withMaint.totalPayable === withMaint.rentAmount + withMaint.maintenanceFee + withMaint.platformFee + withMaint.taxAmount, 'Correct total with maintenance add-on');
        console.log('');

        // --- Setup Test Users & Properties ---
        console.log('--- Test Group 2: Setup Test Data ---');
        const testTimestamp = Date.now();
        const manager = await User.create({
            firstName: 'Manager',
            lastName: `Test ${testTimestamp}`,
            name: `Manager Test ${testTimestamp}`,
            email: `manager_${testTimestamp}@test.com`,
            password: 'Password123!',
            role: 'manager'
        });

        const tenantUser = await User.create({
            firstName: 'Tenant',
            lastName: `Test ${testTimestamp}`,
            name: `Tenant Test ${testTimestamp}`,
            email: `tenant_${testTimestamp}@test.com`,
            password: 'Password123!',
            role: 'tenant'
        });

        const tenantDoc = await Tenant.create({
            firstName: tenantUser.firstName,
            lastName: tenantUser.lastName,
            name: `${tenantUser.firstName} ${tenantUser.lastName}`,
            email: tenantUser.email,
            phone: '9876543210',
            address: '123 Main Street',
            managedBy: manager._id,
            user: tenantUser._id
        });

        const propertyA = await Property.create({
            name: `Property A (With Maintenance) ${testTimestamp}`,
            address: '123 Green Valley',
            type: 'apartment',
            rentAmount: 15000,
            depositAmount: 15000,
            manager: manager._id,
            owner: manager._id,
            status: 'available'
        });

        const propertyB = await Property.create({
            name: `Property B (Without Maintenance) ${testTimestamp}`,
            address: '456 Blue Ridge',
            type: 'apartment',
            rentAmount: 18000,
            depositAmount: 18000,
            manager: manager._id,
            owner: manager._id,
            status: 'available'
        });

        assert(propertyA && propertyB, 'Created test manager, tenant, and 2 distinct properties');
        console.log('');

        // --- 3. Test Booking with Maintenance Included ---
        console.log('--- Test Group 3: Booking with Maintenance Included ---');
        const breakdownA = await calculatePaymentBreakdown(propertyA.depositAmount, true);
        const bookingA = await Booking.create({
            user: tenantUser._id,
            property: propertyA._id,
            manager: manager._id,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            totalAmount: breakdownA.totalPayable,
            depositAmount: breakdownA.rentAmount,
            platformFee: breakdownA.platformFee,
            maintenanceSelected: true,
            maintenanceFeeAtBooking: breakdownA.maintenanceFee,
            maintenanceTermsAccepted: true,
            maintenanceTermsAcceptedAt: new Date(),
            maintenanceTermsVersion: config.maintenanceTermsVersion || '1.0',
            status: 'approved',
            paymentStatus: 'pending'
        });

        assert(bookingA.maintenanceSelected === true, 'Booking A recorded maintenanceSelected: true');
        assert(bookingA.maintenanceFeeAtBooking === 500, 'Booking A recorded snapshot fee ₹500');

        // Process Payment for Booking A
        const payResA = await verifyAndProcessPaymentInternal({
            bookingId: bookingA._id.toString(),
            razorpayPaymentId: `pay_test_A_${testTimestamp}`,
            razorpayOrderId: `order_test_A_${testTimestamp}`,
            razorpaySignature: 'mock_signature_data',
            user: tenantUser
        });

        const leaseA = await Lease.findById(payResA.lease);
        assert(leaseA !== null, 'Lease A was successfully created');
        assert(leaseA.maintenanceEnabled === true, 'Lease A has maintenanceEnabled = true');
        assert(leaseA.maintenanceAccessStatus === 'included', 'Lease A has maintenanceAccessStatus = "included"');
        assert(leaseA.maintenancePlan === 'included', 'Lease A has maintenancePlan = "included"');

        // Create Maintenance Ticket for Property A (Should SUCCEED)
        const ticketA = await maintenanceService.createRequest({
            title: 'Fix kitchen sink leak',
            description: 'Water leaking under the sink.',
            category: 'plumbing',
            priority: 'medium',
            property: propertyA._id,
            lease: leaseA._id
        }, {
            userId: tenantUser._id,
            email: tenantUser.email,
            role: 'tenant',
            name: `${tenantUser.firstName} ${tenantUser.lastName}`
        });

        assert(ticketA !== null && ticketA.title === 'Fix kitchen sink leak', 'Maintenance ticket on Lease A created successfully');
        console.log('');

        // --- 4. Test Booking WITHOUT Maintenance (Locked State) ---
        console.log('--- Test Group 4: Booking WITHOUT Maintenance (Locked State) ---');
        const breakdownB = await calculatePaymentBreakdown(propertyB.depositAmount, false);
        const bookingB = await Booking.create({
            user: tenantUser._id,
            property: propertyB._id,
            manager: manager._id,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            totalAmount: breakdownB.totalPayable,
            depositAmount: breakdownB.rentAmount,
            platformFee: breakdownB.platformFee,
            maintenanceSelected: false,
            maintenanceFeeAtBooking: 0,
            maintenanceTermsAccepted: false,
            status: 'approved',
            paymentStatus: 'pending'
        });

        // Process Payment for Booking B
        const payResB = await verifyAndProcessPaymentInternal({
            bookingId: bookingB._id.toString(),
            razorpayPaymentId: `pay_test_B_${testTimestamp}`,
            razorpayOrderId: `order_test_B_${testTimestamp}`,
            razorpaySignature: 'mock_signature_data',
            user: tenantUser
        });

        const leaseB = await Lease.findById(payResB.lease);
        assert(leaseB !== null, 'Lease B was successfully created');
        assert(leaseB.maintenanceEnabled === false, 'Lease B has maintenanceEnabled = false');
        assert(leaseB.maintenanceAccessStatus === 'locked', 'Lease B has maintenanceAccessStatus = "locked"');
        assert(leaseB.maintenancePlan === 'none', 'Lease B has maintenancePlan = "none"');

        // Create Maintenance Ticket on Locked Lease B (Should FAIL with 403 MAINTENANCE_LOCKED)
        let blockedError = null;
        try {
            await maintenanceService.createRequest({
                title: 'AC not cooling',
                description: 'Need AC inspection.',
                category: 'hvac',
                priority: 'high',
                property: propertyB._id,
                lease: leaseB._id
            }, {
                userId: tenantUser._id,
                email: tenantUser.email,
                role: 'tenant',
                name: `${tenantUser.firstName} ${tenantUser.lastName}`
            });
        } catch (err) {
            blockedError = err;
        }

        assert(blockedError !== null, 'Creating ticket on Lease B was blocked');
        assert(blockedError?.statusCode === 403, 'Blocked error returned HTTP 403');
        assert(blockedError?.code === 'MAINTENANCE_LOCKED', 'Blocked error returned code: "MAINTENANCE_LOCKED"');
        console.log('');

        // --- 5. Test Multi-Lease Isolation ---
        console.log('--- Test Group 5: Strict Multi-Lease Isolation ---');
        assert(leaseA.maintenanceEnabled === true, 'Lease A is still unlocked');
        assert(leaseB.maintenanceEnabled === false, 'Lease B is still locked (Lease A does NOT unlock Lease B)');
        console.log('');

        // --- 6. Test Later Unlock of Lease B ---
        console.log('--- Test Group 6: Later Maintenance Unlock & Payment ---');
        const unlockPaymentId = `pay_unlock_${testTimestamp}`;
        const unlockOrderId = `order_unlock_${testTimestamp}`;

        // Create Payment and update lease
        const paymentRecord = await Payment.create({
            type: 'maintenance_unlock',
            lease: leaseB._id,
            tenant: tenantDoc._id,
            property: propertyB._id,
            owner: manager._id,
            amount: 500,
            amountPaid: 500,
            totalAmount: 500,
            rentAmount: 0,
            platformFee: 500,
            status: 'paid',
            paymentMethod: 'card',
            reference: unlockPaymentId,
            razorpayOrderId: unlockOrderId,
            razorpayPaymentId: unlockPaymentId,
            paidAt: new Date(),
            description: `Maintenance Unlock Fee for ${propertyB.name}`
        });

        assert(paymentRecord.type === 'maintenance_unlock', 'Payment record created with type: "maintenance_unlock"');

        // Unlock lease
        leaseB.maintenanceEnabled = true;
        leaseB.maintenanceAccessStatus = 'unlocked';
        leaseB.maintenancePlan = 'paid_unlock';
        leaseB.maintenanceFee = 500;
        leaseB.maintenanceTermsAccepted = true;
        leaseB.maintenanceTermsAcceptedAt = new Date();
        leaseB.maintenanceUnlockedAt = new Date();
        leaseB.maintenanceUnlockPaymentId = unlockPaymentId;
        await leaseB.save();

        assert(leaseB.maintenanceEnabled === true, 'Lease B maintenanceEnabled is now true');
        assert(leaseB.maintenanceAccessStatus === 'unlocked', 'Lease B maintenanceAccessStatus is "unlocked"');
        assert(leaseB.maintenancePlan === 'paid_unlock', 'Lease B maintenancePlan is "paid_unlock"');

        // Try creating ticket on Lease B now (Should SUCCEED)
        const ticketB = await maintenanceService.createRequest({
            title: 'AC not cooling',
            description: 'Need AC inspection.',
            category: 'hvac',
            priority: 'high',
            property: propertyB._id,
            lease: leaseB._id
        }, {
            userId: tenantUser._id,
            email: tenantUser.email,
            role: 'tenant',
            name: `${tenantUser.firstName} ${tenantUser.lastName}`
        });

        assert(ticketB !== null && ticketB.title === 'AC not cooling', 'Ticket on Lease B created successfully after unlock');
        console.log('');

        // Clean up test data
        await User.deleteMany({ _id: { $in: [manager._id, tenantUser._id] } });
        await Tenant.deleteOne({ _id: tenantDoc._id });
        await Property.deleteMany({ _id: { $in: [propertyA._id, propertyB._id] } });
        await Booking.deleteMany({ _id: { $in: [bookingA._id, bookingB._id] } });
        await Lease.deleteMany({ _id: { $in: [leaseA._id, leaseB._id] } });
        await Payment.deleteMany({ lease: { $in: [leaseA._id, leaseB._id] } });
        await PaymentTransaction.deleteMany({ lease: { $in: [leaseA._id, leaseB._id] } });
        console.log('✓ Cleaned up all temporary test records\n');

    } catch (err) {
        console.error('💥 Test suite crashed:', err);
        failed++;
    } finally {
        await mongoose.disconnect();
    }

    console.log('====================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) process.exit(1);
}

runTests();
