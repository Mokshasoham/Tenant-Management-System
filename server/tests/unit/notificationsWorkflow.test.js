import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import EventService from '../../src/services/eventService.js';
import NotificationModel from '../../src/models/Notification.js';
import PropertyVisit from '../../src/models/PropertyVisit.js';
import Property from '../../src/models/Property.js';
import Review from '../../src/models/Review.js';
import {
    requestVisit,
    updateVisitStatus,
    proposeReschedule,
    respondReschedule,
    submitVisitFeedback,
    setNotInterested
} from '../../src/controllers/propertyVisitController.js';
import {
    getMyNotifications,
    getUnreadCount,
    markRead,
    markAllRead,
    deleteNotification
} from '../../src/controllers/notificationController.js';
import { getUnreadCount as getV1UnreadCount } from '../../src/controllers/v1NotificationController.js';
import * as socketEmitter from '../../src/socket/socketEmitter.js';
import Counter from '../../src/models/Counter.js';

describe('TMS Property Visit Notification & Event Dispatch Pipeline', () => {
    const mockPropId = new mongoose.Types.ObjectId();
    const mockManagerId = new mongoose.Types.ObjectId();
    const mockTenantId = new mongoose.Types.ObjectId();
    const mockVisitId = new mongoose.Types.ObjectId();

    const mockProperty = {
        _id: mockPropId,
        name: 'Grand Horizon Heights',
        manager: mockManagerId,
        owner: mockManagerId,
        timezone: 'Asia/Kolkata'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Property, 'findById').mockResolvedValue(mockProperty);
        jest.spyOn(Property, 'find').mockReturnValue({
            select: jest.fn().mockResolvedValue([{ _id: mockPropId }]),
            distinct: jest.fn().mockResolvedValue([mockPropId.toString()])
        });
        jest.spyOn(Review, 'create').mockResolvedValue({});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('1. Visit Request Notification Flow', () => {
        it('should dispatch visit_requested event with distinct idempotency key to assigned manager', async () => {
            const req = {
                body: {
                    propertyId: mockPropId.toString(),
                    visitDate: '2026-11-20',
                    timeSlot: '11:00 AM - 12:00 PM'
                },
                user: { userId: mockTenantId.toString() }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            const createdVisit = {
                _id: mockVisitId,
                property: mockPropId,
                tenant: mockTenantId,
                manager: mockManagerId,
                visitDate: new Date('2026-11-20'),
                timeSlot: '11:00 AM - 12:00 PM',
                status: 'pending'
            };

            jest.spyOn(PropertyVisit, 'find').mockResolvedValue([]);
            jest.spyOn(PropertyVisit, 'create').mockResolvedValue(createdVisit);

            const publishSpy = jest.spyOn(EventService, 'publish').mockResolvedValue({
                eventId: 'EVT-2026-000001',
                idempotencyKey: `booking-propertyvisit-${mockVisitId}-visit_requested`
            });

            await requestVisit(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(publishSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipient: mockManagerId.toString(),
                    category: 'booking',
                    event: 'visit_requested',
                    action: 'requested',
                    entityType: 'PropertyVisit',
                    entityId: mockVisitId,
                    idempotencyKey: `booking-propertyvisit-${mockVisitId}-visit_requested`
                })
            );
        });

        it('should resolve manager ID correctly when manager is populated as an object', async () => {
            const populatedProp = {
                ...mockProperty,
                manager: { _id: mockManagerId, name: 'Alice Manager' }
            };
            jest.spyOn(Property, 'findById').mockResolvedValue(populatedProp);

            const req = {
                body: {
                    propertyId: mockPropId.toString(),
                    visitDate: '2026-11-20',
                    timeSlot: '11:00 AM - 12:00 PM'
                },
                user: { userId: mockTenantId.toString() }
            };

            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            jest.spyOn(PropertyVisit, 'find').mockResolvedValue([]);
            jest.spyOn(PropertyVisit, 'create').mockResolvedValue({
                _id: mockVisitId,
                property: mockPropId,
                tenant: mockTenantId,
                status: 'pending'
            });

            const publishSpy = jest.spyOn(EventService, 'publish').mockResolvedValue({});

            await requestVisit(req, res);

            expect(publishSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipient: mockManagerId.toString()
                })
            );
        });
    });

    describe('2. Visit Approval & Rejection Flow', () => {
        it('should dispatch visit_approved event with unique key and not collide with visit_requested', async () => {
            const req = {
                params: { id: mockVisitId.toString() },
                body: { status: 'approved' },
                user: { userId: mockManagerId.toString(), role: 'manager' }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            const visitDoc = {
                _id: mockVisitId,
                property: mockProperty,
                tenant: mockTenantId,
                manager: mockManagerId,
                visitDate: new Date('2026-11-20'),
                timeSlot: '11:00 AM - 12:00 PM',
                status: 'pending'
            };

            const updatedDoc = {
                ...visitDoc,
                status: 'approved'
            };

            jest.spyOn(PropertyVisit, 'findById').mockReturnValue({
                populate: jest.fn().mockResolvedValue(visitDoc)
            });
            jest.spyOn(PropertyVisit, 'findOneAndUpdate').mockReturnValue({
                populate: jest.fn().mockResolvedValue(updatedDoc)
            });

            const publishSpy = jest.spyOn(EventService, 'publish').mockResolvedValue({
                eventId: 'EVT-2026-000002',
                idempotencyKey: `booking-propertyvisit-${mockVisitId}-visit_approved`
            });

            await updateVisitStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(publishSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipient: mockTenantId.toString(),
                    category: 'booking',
                    event: 'visit_approved',
                    action: 'approved',
                    entityType: 'PropertyVisit',
                    entityId: mockVisitId,
                    idempotencyKey: `booking-propertyvisit-${mockVisitId}-visit_approved`
                })
            );
        });

        it('should dispatch visit_rejected event to tenant upon manager rejection', async () => {
            const req = {
                params: { id: mockVisitId.toString() },
                body: { status: 'rejected' },
                user: { userId: mockManagerId.toString(), role: 'manager' }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            const visitDoc = {
                _id: mockVisitId,
                property: mockProperty,
                tenant: mockTenantId,
                manager: mockManagerId,
                visitDate: new Date('2026-11-20'),
                timeSlot: '11:00 AM - 12:00 PM',
                status: 'pending',
                save: jest.fn().mockResolvedValue(true)
            };

            jest.spyOn(PropertyVisit, 'findById').mockReturnValue({
                populate: jest.fn().mockResolvedValue(visitDoc)
            });

            const publishSpy = jest.spyOn(EventService, 'publish').mockResolvedValue({
                eventId: 'EVT-2026-000003',
                idempotencyKey: `booking-propertyvisit-${mockVisitId}-visit_rejected`
            });

            await updateVisitStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(publishSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipient: mockTenantId.toString(),
                    category: 'booking',
                    event: 'visit_rejected',
                    action: 'rejected',
                    entityType: 'PropertyVisit',
                    entityId: mockVisitId,
                    idempotencyKey: `booking-propertyvisit-${mockVisitId}-visit_rejected`
                })
            );
        });
    });

    describe('3. Reschedule Proposal & Response Flow', () => {
        it('should dispatch visit_reschedule_proposed event to tenant', async () => {
            const req = {
                params: { id: mockVisitId.toString() },
                body: {
                    visitDate: '2026-11-22',
                    timeSlot: '02:00 PM - 03:00 PM',
                    note: 'Earlier slot available'
                },
                user: { userId: mockManagerId.toString(), role: 'manager' }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            const visitDoc = {
                _id: mockVisitId,
                property: mockProperty,
                tenant: mockTenantId,
                manager: mockManagerId,
                visitDate: new Date('2026-11-20'),
                timeSlot: '11:00 AM - 12:00 PM',
                status: 'pending',
                rescheduleHistory: [],
                save: jest.fn().mockResolvedValue(true)
            };

            jest.spyOn(PropertyVisit, 'findById').mockReturnValue({
                populate: jest.fn().mockResolvedValue(visitDoc)
            });

            const publishSpy = jest.spyOn(EventService, 'publish').mockResolvedValue({
                eventId: 'EVT-2026-000004',
                idempotencyKey: `booking-propertyvisit-${mockVisitId}-visit_reschedule_proposed-1`
            });

            await proposeReschedule(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(publishSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipient: mockTenantId.toString(),
                    category: 'booking',
                    event: 'visit_reschedule_proposed',
                    action: 'reschedule_proposed',
                    entityType: 'PropertyVisit',
                    entityId: mockVisitId,
                    idempotencyKey: `booking-propertyvisit-${mockVisitId}-visit_reschedule_proposed-1`
                })
            );
        });

        it('should dispatch visit_reschedule_accepted event to manager when tenant accepts', async () => {
            const req = {
                params: { id: mockVisitId.toString() },
                body: { action: 'accept' },
                user: { userId: mockTenantId.toString() }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            const visitDoc = {
                _id: mockVisitId,
                property: mockProperty,
                tenant: mockTenantId,
                manager: mockManagerId,
                status: 'reschedule_pending',
                rescheduledSlot: {
                    visitDate: new Date('2026-11-22'),
                    timeSlot: '02:00 PM - 03:00 PM',
                    slotStartTime: new Date('2026-11-22T08:30:00.000Z'),
                    slotEndTime: new Date('2026-11-22T09:30:00.000Z'),
                    status: 'pending'
                },
                rescheduleHistory: [{ action: 'proposed' }],
                save: jest.fn().mockResolvedValue(true)
            };

            jest.spyOn(PropertyVisit, 'findById').mockReturnValue({
                populate: jest.fn().mockResolvedValue(visitDoc)
            });

            const publishSpy = jest.spyOn(EventService, 'publish').mockResolvedValue({
                eventId: 'EVT-2026-000005',
                idempotencyKey: `booking-propertyvisit-${mockVisitId}-visit_reschedule_accepted-2`
            });

            await respondReschedule(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(publishSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipient: mockManagerId.toString(),
                    category: 'booking',
                    event: 'visit_reschedule_accepted',
                    action: 'reschedule_accepted',
                    entityType: 'PropertyVisit',
                    entityId: mockVisitId,
                    idempotencyKey: `booking-propertyvisit-${mockVisitId}-visit_reschedule_accepted-2`
                })
            );
        });

        it('should dispatch visit_reschedule_declined event to manager when tenant declines', async () => {
            const req = {
                params: { id: mockVisitId.toString() },
                body: { action: 'decline', reason: 'Not convenient' },
                user: { userId: mockTenantId.toString() }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            const visitDoc = {
                _id: mockVisitId,
                property: mockProperty,
                tenant: mockTenantId,
                manager: mockManagerId,
                status: 'reschedule_pending',
                rescheduledSlot: {
                    visitDate: new Date('2026-11-22'),
                    timeSlot: '02:00 PM - 03:00 PM',
                    status: 'pending'
                },
                rescheduleHistory: [{ action: 'proposed' }],
                save: jest.fn().mockResolvedValue(true)
            };

            jest.spyOn(PropertyVisit, 'findById').mockReturnValue({
                populate: jest.fn().mockResolvedValue(visitDoc)
            });

            const publishSpy = jest.spyOn(EventService, 'publish').mockResolvedValue({
                eventId: 'EVT-2026-000006',
                idempotencyKey: `booking-propertyvisit-${mockVisitId}-visit_reschedule_declined-2`
            });

            await respondReschedule(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(publishSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipient: mockManagerId.toString(),
                    category: 'booking',
                    event: 'visit_reschedule_declined',
                    action: 'reschedule_declined',
                    entityType: 'PropertyVisit',
                    entityId: mockVisitId,
                    idempotencyKey: `booking-propertyvisit-${mockVisitId}-visit_reschedule_declined-2`
                })
            );
        });
    });

    describe('4. Visit Feedback & Not Interested Flow', () => {
        it('should dispatch visit_feedback_submitted to manager when tenant rates visit', async () => {
            const req = {
                params: { id: mockVisitId.toString() },
                body: { rating: 5, comments: 'Great tour!' },
                user: { userId: mockTenantId.toString() }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            const visitDoc = {
                _id: mockVisitId,
                property: mockProperty,
                tenant: mockTenantId,
                manager: mockManagerId,
                save: jest.fn().mockResolvedValue(true)
            };

            jest.spyOn(PropertyVisit, 'findById').mockReturnValue({
                populate: jest.fn().mockResolvedValue(visitDoc)
            });

            const publishSpy = jest.spyOn(EventService, 'publish').mockResolvedValue({});

            await submitVisitFeedback(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(publishSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipient: mockManagerId.toString(),
                    category: 'booking',
                    event: 'visit_feedback_submitted',
                    action: 'feedback_submitted',
                    entityType: 'PropertyVisit',
                    entityId: mockVisitId,
                    idempotencyKey: `booking-propertyvisit-${mockVisitId}-visit_feedback_submitted`
                })
            );
        });

        it('should dispatch visit_not_interested to manager when tenant marks not interested', async () => {
            const req = {
                params: { id: mockVisitId.toString() },
                user: { userId: mockTenantId.toString() }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            const visitDoc = {
                _id: mockVisitId,
                property: mockProperty,
                tenant: mockTenantId,
                manager: mockManagerId,
                save: jest.fn().mockResolvedValue(true)
            };

            jest.spyOn(PropertyVisit, 'findById').mockReturnValue({
                populate: jest.fn().mockResolvedValue(visitDoc)
            });

            const publishSpy = jest.spyOn(EventService, 'publish').mockResolvedValue({});

            await setNotInterested(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(publishSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipient: mockManagerId.toString(),
                    event: 'visit_not_interested',
                    action: 'not_interested',
                    entityType: 'PropertyVisit',
                    entityId: mockVisitId,
                    idempotencyKey: `booking-propertyvisit-${mockVisitId}-visit_not_interested`
                })
            );
        });
    });

    describe('5. Notification Controller Consistency & Soft Deletion', () => {
        it('getUnreadCount accurately includes unread notifications and excludes deleted ones', async () => {
            const req = { user: { userId: mockTenantId.toString() } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            const countSpy = jest.spyOn(NotificationModel, 'countDocuments').mockResolvedValue(3);

            await getUnreadCount(req, res);

            expect(countSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipient: mockTenantId.toString(),
                    isDeleted: { $ne: true },
                    $or: [{ read: false }, { isRead: false }]
                })
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { count: 3 } });
        });

        it('markRead synchronizes both read and isRead flags with timestamp', async () => {
            const mockNotifId = new mongoose.Types.ObjectId().toString();
            const req = {
                params: { id: mockNotifId },
                user: { userId: mockTenantId.toString() }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            const updateSpy = jest.spyOn(NotificationModel, 'findOneAndUpdate').mockResolvedValue({ _id: mockNotifId });

            await markRead(req, res);

            expect(updateSpy).toHaveBeenCalledWith(
                expect.objectContaining({ _id: mockNotifId, recipient: mockTenantId.toString() }),
                expect.objectContaining({
                    $set: expect.objectContaining({
                        read: true,
                        isRead: true,
                        readAt: expect.any(Date)
                    })
                })
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('deleteNotification performs a safe soft-delete with audit metadata', async () => {
            const mockNotifId = new mongoose.Types.ObjectId().toString();
            const req = {
                params: { id: mockNotifId },
                user: { userId: mockTenantId.toString() }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            const updateSpy = jest.spyOn(NotificationModel, 'findOneAndUpdate').mockResolvedValue({ _id: mockNotifId });

            await deleteNotification(req, res);

            expect(updateSpy).toHaveBeenCalledWith(
                expect.objectContaining({ _id: mockNotifId, recipient: mockTenantId.toString() }),
                expect.objectContaining({
                    $set: expect.objectContaining({
                        isDeleted: true,
                        deletedAt: expect.any(Date),
                        deletedBy: mockTenantId.toString()
                    })
                })
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('6. Socket Emitter Realtime Dispatch Channels', () => {
        it('SocketEmitterConsumer dispatches new_event, visit_update, and notification_created', async () => {
            const emitMock = jest.fn();
            const toMock = jest.fn().mockReturnValue({ emit: emitMock });
            const mockIo = { to: toMock };

            socketEmitter.setIoInstance(mockIo);

            // Trigger SocketEmitterConsumer directly via EventService consumer
            const socketConsumer = EventService.consumers.find(c => c.name === 'SocketEmitterConsumer');
            expect(socketConsumer).toBeDefined();

            const testEvent = {
                eventId: 'EVT-2026-999999',
                recipient: mockTenantId.toString(),
                category: 'booking',
                event: 'visit_approved',
                title: 'Property Visit Approved'
            };

            await socketConsumer.consume(testEvent);

            // Should emit to 'new_event'
            expect(toMock).toHaveBeenCalledWith(mockTenantId.toString());
            expect(emitMock).toHaveBeenCalledWith('new_event', testEvent);
            // Should emit to 'visit_update'
            expect(emitMock).toHaveBeenCalledWith('visit_update', testEvent);
            // Should emit to 'lease_lifecycle_update'
            expect(emitMock).toHaveBeenCalledWith(
                'lease_lifecycle_update',
                expect.objectContaining({ type: 'visit_update' })
            );
            // Should emit to general notification channels
            expect(emitMock).toHaveBeenCalledWith('notification_created', testEvent);
            expect(emitMock).toHaveBeenCalledWith('new_notification', testEvent);
        });
    });

    describe('7. EventService Idempotency & Transition Distinctness', () => {
        it('should suppress duplicates when exact same idempotency key is republished', async () => {
            const idempotencyKey = `booking-propertyvisit-${mockVisitId}-visit_requested`;
            const existingNotif = {
                _id: new mongoose.Types.ObjectId(),
                eventId: 'EVT-2026-000010',
                idempotencyKey
            };

            const findOneSpy = jest.spyOn(NotificationModel, 'findOne').mockReturnValue({
                session: jest.fn().mockResolvedValue(existingNotif)
            });

            const res = await EventService.publish({
                recipient: mockManagerId.toString(),
                category: 'booking',
                event: 'visit_requested',
                idempotencyKey
            });

            expect(res).toBe(existingNotif);
            expect(findOneSpy).toHaveBeenCalledWith({ idempotencyKey });
        });

        it('should publish cleanly when transition changes from requested to approved', async () => {
            const requestedKey = `booking-propertyvisit-${mockVisitId}-visit_requested`;
            const approvedKey = `booking-propertyvisit-${mockVisitId}-visit_approved`;

            // findOne returns null for the new transition key
            jest.spyOn(NotificationModel, 'findOne').mockReturnValue({
                session: jest.fn().mockResolvedValue(null)
            });
            jest.spyOn(Counter, 'findByIdAndUpdate').mockResolvedValue({ seq: 101 });
            jest.spyOn(NotificationModel.prototype, 'save').mockResolvedValue(true);

            const res = await EventService.publish({
                recipient: mockTenantId.toString(),
                category: 'booking',
                event: 'visit_approved',
                idempotencyKey: approvedKey
            });

            expect(res).toBeDefined();
            expect(res.eventId).toBe('EVT-2026-000101');
        });
    });

    describe('8. V1 Notification Controller Unread Counter Verification', () => {
        it('getV1UnreadCount accurately applies $or condition for read/isRead and excludes deleted', async () => {
            const req = {
                user: { userId: mockTenantId.toString() },
                query: {}
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            const countSpy = jest.spyOn(NotificationModel, 'countDocuments').mockResolvedValue(7);

            await getV1UnreadCount(req, res);

            expect(countSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipient: expect.any(mongoose.Types.ObjectId),
                    $or: [{ isRead: false }, { read: false }],
                    isDeleted: { $ne: true },
                    isArchived: { $ne: true }
                })
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { unreadCount: 7 }
            });
        });
    });
});
