import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import Notification from '../../src/models/Notification.js';
import {
    getMyNotifications,
    getUnreadCount,
    markRead,
    bulkRead,
    markAllRead,
    deleteNotification,
    bulkDelete,
    clearAllRead
} from '../../src/controllers/v1NotificationController.js';
import { toNotificationDTO, toNotificationDTOList } from '../../src/modules/lease-renewal/notifications/notificationMapper.js';

describe('Notification Subsystem - DTO Mapper & Controller Unit Tests', () => {
    let mockReq;
    let mockRes;
    const testUserId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        mockReq = {
            user: { userId: testUserId, role: 'manager' },
            query: {},
            params: {},
            body: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('toNotificationDTO & toNotificationDTOList', () => {
        test('correctly transforms raw mongo document into stable DTO', () => {
            const rawDoc = {
                _id: new mongoose.Types.ObjectId(),
                recipient: new mongoose.Types.ObjectId(),
                title: 'Campaign Renewal Notice',
                message: 'Your lease is expiring soon.',
                category: 'renewal',
                priority: 'high',
                severity: 'warning',
                isRead: false,
                readAt: null,
                actionUrl: '/manager/renewals/dashboard',
                metadata: { campaignId: 'cmp-123' },
                createdAt: new Date('2026-08-01T10:00:00Z'),
                updatedAt: new Date('2026-08-01T10:00:00Z'),
                __v: 1
            };

            const dto = toNotificationDTO(rawDoc);

            expect(dto).toBeDefined();
            expect(dto.id).toBe(rawDoc._id.toString());
            expect(dto.title).toBe('Campaign Renewal Notice');
            expect(dto.category).toBe('renewal');
            expect(dto.priority).toBe('high');
            expect(dto.isRead).toBe(false);
            expect(dto.actionUrl).toBe('/manager/renewals/dashboard');
            expect(dto.version).toBe(1);
        });

        test('returns empty array when list is empty or invalid', () => {
            expect(toNotificationDTOList(null)).toEqual([]);
            expect(toNotificationDTOList(undefined)).toEqual([]);
            expect(toNotificationDTOList([])).toEqual([]);
        });
    });

    describe('v1NotificationController Endpoints', () => {
        test('getUnreadCount returns unread count for user', async () => {
            jest.spyOn(Notification, 'countDocuments').mockResolvedValue(5);

            await getUnreadCount(mockReq, mockRes);

            expect(Notification.countDocuments).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: { unreadCount: 5 }
            });
        });

        test('markRead marks notification read and increments version', async () => {
            const mockId = new mongoose.Types.ObjectId().toString();
            mockReq.params = { id: mockId };

            const updatedDoc = {
                _id: mockId,
                recipient: testUserId,
                title: 'Test Notif',
                message: 'Test Message',
                isRead: true,
                readAt: new Date(),
                __v: 1
            };

            jest.spyOn(Notification, 'findOneAndUpdate').mockResolvedValue(updatedDoc);

            await markRead(mockReq, mockRes);

            expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ _id: mockId }),
                expect.objectContaining({
                    $set: expect.objectContaining({ isRead: true, read: true }),
                    $inc: { __v: 1 }
                }),
                { new: true }
            );
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Notification marked as read',
                    data: expect.objectContaining({ isRead: true })
                })
            );
        });

        test('bulkRead marks multiple notification IDs read', async () => {
            const id1 = new mongoose.Types.ObjectId().toString();
            const id2 = new mongoose.Types.ObjectId().toString();
            mockReq.body = { notificationIds: [id1, id2] };

            jest.spyOn(Notification, 'updateMany').mockResolvedValue({ modifiedCount: 2 });

            await bulkRead(mockReq, mockRes);

            expect(Notification.updateMany).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Successfully marked 2 notifications as read',
                data: { modifiedCount: 2 }
            });
        });

        test('deleteNotification performs soft-delete with audit fields', async () => {
            const mockId = new mongoose.Types.ObjectId().toString();
            mockReq.params = { id: mockId };

            const softDeletedDoc = {
                _id: mockId,
                recipient: testUserId,
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: testUserId,
                __v: 1
            };

            jest.spyOn(Notification, 'findOneAndUpdate').mockResolvedValue(softDeletedDoc);

            await deleteNotification(mockReq, mockRes);

            expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ _id: mockId }),
                expect.objectContaining({
                    $set: expect.objectContaining({ isDeleted: true })
                }),
                { new: true }
            );
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        test('bulkDelete performs soft-delete on array of IDs', async () => {
            const id1 = new mongoose.Types.ObjectId().toString();
            mockReq.body = { notificationIds: [id1] };

            jest.spyOn(Notification, 'updateMany').mockResolvedValue({ modifiedCount: 1 });

            await bulkDelete(mockReq, mockRes);

            expect(Notification.updateMany).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Successfully deleted 1 notifications',
                data: { modifiedCount: 1 }
            });
        });

        test('clearAllRead soft-deletes all read notifications for user', async () => {
            jest.spyOn(Notification, 'updateMany').mockResolvedValue({ modifiedCount: 4 });

            await clearAllRead(mockReq, mockRes);

            expect(Notification.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({ recipient: mockReq.user.userId, isRead: true }),
                expect.objectContaining({ $set: expect.objectContaining({ isDeleted: true }) })
            );
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Cleared 4 read notifications',
                data: { modifiedCount: 4 }
            });
        });
    });
});
