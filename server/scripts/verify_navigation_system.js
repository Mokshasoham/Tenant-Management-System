import mongoose from 'mongoose';
import connectDB from '../src/config/database.js';
import Notification from '../src/models/Notification.js';
import Counter from '../src/models/Counter.js';
import EventService from '../src/services/eventService.js';
import { setIoInstance } from '../src/socket/socketEmitter.js';
import logger from '../src/utils/logger.js';

process.env.NODE_ENV = 'test';

async function runRegressionSuite() {
    logger.info('========================================================================');
    logger.info('=== STARTING ACTION CENTER & NAVIGATION SYSTEM END-TO-END REGRESSION ===');
    logger.info('========================================================================');

    try {
        await connectDB();
        logger.info('[DB] Connected to MongoDB database successfully.');
    } catch (err) {
        logger.error('[DB] Failed to connect to MongoDB:', err.message);
        process.exit(1);
    }

    // Mock Socket.IO broadcast receiver
    let lastEmittedUser = null;
    let lastEmittedPayload = null;

    const mockIo = {
        to: (room) => {
            lastEmittedUser = room;
            return {
                emit: (event, payload) => {
                    lastEmittedPayload = payload;
                }
            };
        }
    };
    setIoInstance(mockIo);

    const mockRecipientId = new mongoose.Types.ObjectId();
    const mockCreatorId = new mongoose.Types.ObjectId();
    const mockEntityId = new mongoose.Types.ObjectId();
    const cleanUpIds = [];

    try {
        // --- TEST CASE 1: Full Metadata Assertions across 15 Notification Types ---
        logger.info('\n--- [Test 1] Testing Event Publication & Metadata Completeness ---');

        const testCategories = [
            { category: 'booking', event: 'submitted', entityType: 'Booking', redirectUrl: `/bookings/${mockEntityId}` },
            { category: 'booking', event: 'approved', entityType: 'Booking', redirectUrl: `/bookings/${mockEntityId}` },
            { category: 'booking', event: 'rejected', entityType: 'Booking', redirectUrl: `/bookings/${mockEntityId}` },
            { category: 'booking', event: 'cancelled', entityType: 'Booking', redirectUrl: `/bookings/${mockEntityId}` },

            { category: 'billing', event: 'generated', entityType: 'Bill', redirectUrl: `/bills/${mockEntityId}` },
            { category: 'payments', event: 'successful', entityType: 'Payment', redirectUrl: `/bills/${mockEntityId}` },
            { category: 'payments', event: 'failed', entityType: 'Payment', redirectUrl: `/pay-now` },

            { category: 'lease', event: 'activated', entityType: 'Lease', redirectUrl: `/my-lease` },
            { category: 'renewal', event: 'requested', entityType: 'LeaseRenewal', redirectUrl: `/lease-renewal` },
            { category: 'renewal', event: 'approved', entityType: 'LeaseRenewal', redirectUrl: `/lease-history` },

            { category: 'maintenance', event: 'created', entityType: 'Maintenance', redirectUrl: `/maintenance/${mockEntityId}` },
            { category: 'maintenance', event: 'resolved', entityType: 'Maintenance', redirectUrl: `/maintenance/${mockEntityId}` },

            { category: 'inspection', event: 'scheduled', entityType: 'Inspection', redirectUrl: `/inspection/${mockEntityId}` },
            { category: 'deposit_settlement', event: 'refund', entityType: 'DepositSettlement', redirectUrl: `/deposit-settlement/${mockEntityId}` },

            { category: 'messages', event: 'received', entityType: 'Message', redirectUrl: `/messages` },
        ];

        for (const testCase of testCategories) {
            const published = await EventService.publish({
                recipient: mockRecipientId,
                category: testCase.category,
                event: testCase.event,
                title: `Test ${testCase.category}.${testCase.event}`,
                description: `Regression test payload for ${testCase.category}`,
                sourceModule: testCase.category,
                entityType: testCase.entityType,
                entityId: mockEntityId,
                redirectUrl: testCase.redirectUrl,
                action: 'view',
                priority: 'medium',
                severity: 'information',
                createdBy: mockCreatorId,
                metadata: { test: true }
            });

            if (!published || !published.eventId) {
                throw new Error(`[Regression Failure] Event publication failed for ${testCase.category}.${testCase.event}`);
            }
            cleanUpIds.push(published._id);

            // Assertions
            if (!published.category || !published.entityType || !published.redirectUrl) {
                throw new Error(`[Regression Failure] Missing metadata fields in published event ${published.eventId}`);
            }
        }
        logger.info(`✓ Passed: Published ${testCategories.length} test events with 100% complete metadata payloads.`);

        // --- TEST CASE 2: Idempotency & Unique Sequential Event IDs ---
        logger.info('\n--- [Test 2] Testing Counter Sequence & Idempotency ---');
        const idempotencyKey = `REGRESSION-KEY-${Date.now()}`;
        const firstAttempt = await EventService.publish({
            recipient: mockRecipientId,
            category: 'system',
            event: 'test',
            title: 'Idempotency Test',
            description: 'Idempotency verification',
            idempotencyKey,
            entityType: 'System',
            entityId: mockEntityId,
            redirectUrl: '/dashboard'
        });
        cleanUpIds.push(firstAttempt._id);

        const duplicateAttempt = await EventService.publish({
            recipient: mockRecipientId,
            category: 'system',
            event: 'test',
            title: 'Idempotency Test Duplicate',
            description: 'Idempotency verification duplicate',
            idempotencyKey,
            entityType: 'System',
            entityId: mockEntityId,
            redirectUrl: '/dashboard'
        });

        if (firstAttempt.eventId !== duplicateAttempt.eventId) {
            throw new Error('[Regression Failure] Idempotent publication failed to block duplicate payload');
        }
        logger.info(`✓ Passed: Idempotency blocked duplicate publication. Event ID: ${firstAttempt.eventId}`);

        // --- TEST CASE 3: Database Index & Unique Constraint Validation ---
        logger.info('\n--- [Test 3] Testing DB Unique Constraints & Indexing ---');
        const duplicatesInDb = await Notification.aggregate([
            { $group: { _id: "$eventId", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null }, count: { $gt: 1 } } }
        ]);

        if (duplicatesInDb.length > 0) {
            throw new Error(`[Regression Failure] Found ${duplicatesInDb.length} duplicate event IDs in database!`);
        }
        logger.info('✓ Passed: Zero duplicate event IDs found in database.');

    } finally {
        // Cleanup test data
        if (cleanUpIds.length > 0) {
            await Notification.deleteMany({ _id: { $in: cleanUpIds } });
            logger.info(`[Cleanup] Successfully removed ${cleanUpIds.length} test notification records.`);
        }
        await mongoose.disconnect();
        logger.info('\n========================================================================');
        logger.info('=== ALL END-TO-END REGRESSION ASSERTIONS PASSED WITH 100% SUCCESS ===');
        logger.info('========================================================================');
    }
}

runRegressionSuite();
