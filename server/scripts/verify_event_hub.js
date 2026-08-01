import mongoose from 'mongoose';
import connectDB from '../src/config/database.js';
import Notification from '../src/models/Notification.js';
import Counter from '../src/models/Counter.js';
import EventService from '../src/services/eventService.js';
import { setIoInstance } from '../src/socket/socketEmitter.js';
import logger from '../src/utils/logger.js';

// Setup basic environment variables if needed
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret';
process.env.NODE_ENV = 'test';

async function run() {
    logger.info('--- Starting EventService & Action Center Schema Verification ---');
    
    // Connect to database
    try {
        await connectDB();
        logger.info('Connected to MongoDB database successfully.');
    } catch (err) {
        logger.error('Failed to connect to MongoDB:', err.message);
        process.exit(1);
    }

    // Mock Socket.IO server to verify broadcast emissions
    let broadcastedUser = null;
    let broadcastedEvent = null;
    let broadcastedData = null;

    const mockIo = {
        to: (room) => {
            broadcastedUser = room;
            return {
                emit: (event, payload) => {
                    broadcastedEvent = event;
                    broadcastedData = payload;
                }
            };
        }
    };
    
    // Inject Mock Socket.io
    setIoInstance(mockIo);

    // Create a mock recipient user ID and creator ID
    const mockRecipientId = new mongoose.Types.ObjectId();
    const mockCreatorId = new mongoose.Types.ObjectId();
    const mockBookingId = new mongoose.Types.ObjectId();

    // Prepare clean-up references
    const cleanUpIds = [];

    try {
        // Test 1: Publish standardized business event
        logger.info('Test 1: Simulating Booking Submission Event...');
        const event1 = await EventService.publish({
            recipient: mockRecipientId,
            category: 'booking',
            event: 'submitted',
            title: 'Booking Submitted',
            description: 'A new booking has been submitted for Ocean Pearl Residency.',
            sourceModule: 'booking',
            entityType: 'Booking',
            entityId: mockBookingId,
            redirectUrl: `/bookings/${mockBookingId}`,
            action: 'view',
            priority: 'medium',
            severity: 'information',
            createdBy: mockCreatorId,
            metadata: {
                bookingNumber: 'BKG-2026-049',
                propertyName: 'Ocean Pearl Residency'
            }
        });

        if (!event1 || !event1.eventId) {
            throw new Error('Event failed to publish or was not returned');
        }
        
        cleanUpIds.push(event1._id);
        logger.info(`Test 1 Passed: Event published successfully. Unique ID assigned: ${event1.eventId}`);
        logger.info(`  - Category: ${event1.category}, Event: ${event1.event}`);
        logger.info(`  - Severity: ${event1.severity}, Priority: ${event1.priority}`);
        logger.info(`  - Entity Type: ${event1.entityType}, Entity ID: ${event1.entityId}`);

        // Verify broadcast occurred
        if (broadcastedUser?.toString() !== mockRecipientId.toString() || broadcastedEvent !== 'new_event') {
            throw new Error('Socket.IO real-time broadcast was not triggered correctly');
        }
        logger.info('Test 1 (Socket) Passed: Real-time broadcast successfully triggered.');

        // Test 2: Sequential ID Increment verification
        logger.info('Test 2: Publishing second sequential event...');
        const event2 = await EventService.publish({
            recipient: mockRecipientId,
            category: 'booking',
            event: 'approved',
            title: 'Booking Approved',
            description: 'Your booking has been approved by the property manager.',
            sourceModule: 'booking',
            entityType: 'Booking',
            entityId: mockBookingId,
            redirectUrl: `/bookings/${mockBookingId}`,
            action: 'pay',
            priority: 'high',
            severity: 'success',
            createdBy: mockCreatorId,
            metadata: {
                bookingNumber: 'BKG-2026-049',
                propertyName: 'Ocean Pearl Residency'
            }
        });

        cleanUpIds.push(event2._id);
        logger.info(`Test 2 Passed: Second event published successfully. Unique ID assigned: ${event2.eventId}`);
        
        // Assert eventId sequence
        const num1 = parseInt(event1.eventId.split('-')[2]);
        const num2 = parseInt(event2.eventId.split('-')[2]);
        if (num2 !== num1 + 1) {
            throw new Error(`Event sequence is not incremented correctly: ${event1.eventId} -> ${event2.eventId}`);
        }
        logger.info(`Sequence verified: ${event1.eventId} -> ${event2.eventId}`);

        // Test 3: Idempotency Publishing verification
        logger.info('Test 3: Testing event publishing idempotency with retry triggers...');
        const idempotencyKey = `bkg-approved-${mockBookingId}`;
        
        const event3a = await EventService.publish({
            recipient: mockRecipientId,
            category: 'booking',
            event: 'approved',
            title: 'Booking Approved (Try A)',
            description: 'First attempt at booking approved.',
            idempotencyKey,
            sourceModule: 'booking',
            entityType: 'Booking',
            entityId: mockBookingId,
            redirectUrl: `/bookings/${mockBookingId}`
        });
        cleanUpIds.push(event3a._id);

        const event3b = await EventService.publish({
            recipient: mockRecipientId,
            category: 'booking',
            event: 'approved',
            title: 'Booking Approved (Try B)',
            description: 'Duplicate retry attempt at booking approved.',
            idempotencyKey,
            sourceModule: 'booking',
            entityType: 'Booking',
            entityId: mockBookingId,
            redirectUrl: `/bookings/${mockBookingId}`
        });

        if (event3a._id.toString() !== event3b._id.toString()) {
            throw new Error('Idempotent publishing failed to identify and block duplicate request');
        }
        logger.info('Test 3 Passed: Idempotent publishing blocked duplicate payload. Event ID remained: ' + event3a.eventId);

        // Test 4: Expiration & Retention validation
        logger.info('Test 4: Verifying event retention and soft-deletions...');
        const expiresAt = new Date(Date.now() + 86400 * 1000); // 24 hours from now
        const event4 = await EventService.publish({
            recipient: mockRecipientId,
            category: 'payments',
            event: 'pending',
            title: 'Rent Payment Due',
            description: 'Actionable payment reminder expiring tomorrow.',
            expiresAt,
            sourceModule: 'payments',
            entityType: 'Payment',
            entityId: new mongoose.Types.ObjectId(),
            redirectUrl: '/bills'
        });
        cleanUpIds.push(event4._id);

        // Simulate user inbox soft-deletion
        const { deleteNotification } = await import('../src/controllers/v1NotificationController.js');
        const req = {
            user: { userId: mockRecipientId.toString() },
            params: { id: event4._id.toString() }
        };
        let responseStatus = null;
        let responseJson = null;
        await new Promise((resolve, reject) => {
            const next = (err) => {
                if (err) reject(err);
                else resolve();
            };
            const mockRes = {
                status: (code) => {
                    responseStatus = code;
                    return {
                        json: (data) => {
                            responseJson = data;
                            resolve();
                        }
                    };
                }
            };
            deleteNotification(req, mockRes, next);
        });
        
        if (responseStatus !== 200 || !responseJson || !responseJson.success) {
            throw new Error('Notification soft deletion endpoint returned error: ' + JSON.stringify(responseJson) + ' Status: ' + responseStatus);
        }

        // Verify permanent database retention
        const dbDoc = await Notification.findById(event4._id);
        if (!dbDoc || !dbDoc.isDeleted) {
            throw new Error('Soft-deleted notification was permanently removed or isDeleted flag not set');
        }
        logger.info('Test 4 Passed: Notification soft-deleted correctly in inbox but remains permanently stored in DB.');

    } finally {
        // Clean up database documents
        logger.info('Cleaning up database context...');
        if (cleanUpIds.length > 0) {
            await Notification.deleteMany({ _id: { $in: cleanUpIds } });
        }
        // Clean counter
        const year = new Date().getFullYear();
        await Counter.findByIdAndDelete(`event-${year}`);
        logger.info('Database cleanup complete.');
    }

    logger.info('--- All EventService & Action Center Schema Tests Passed Successfully! ---');
    process.exit(0);
}

run();
