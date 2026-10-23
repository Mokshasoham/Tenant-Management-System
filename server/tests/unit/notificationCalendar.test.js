import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import Notification from '../../src/models/Notification.js';
import {
    getMyNotifications,
    getCalendarSummary,
    getCalendarAgenda
} from '../../src/controllers/v1NotificationController.js';
import * as legacyNotificationController from '../../src/controllers/notificationController.js';
import {
    formatDateKey,
    parseDateKey,
    getLocalDayBoundaries,
    getMonthGrid,
    formatFriendlyDate
} from '../../../client/src/modules/lease-renewal/notifications/utils/calendarDateUtils.js';

describe('Notification Calendar & Date-Wise Filtering Subsystem', () => {
    let mockReq;
    let mockRes;
    const testUserId = new mongoose.Types.ObjectId().toString();
    const otherUserId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        mockReq = {
            user: { userId: testUserId, role: 'tenant' },
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

    describe('Client calendarDateUtils Unit Tests', () => {
        test('formatDateKey formats date into YYYY-MM-DD correctly', () => {
            const date = new Date(2026, 9, 23); // Oct 23, 2026
            expect(formatDateKey(date)).toBe('2026-10-23');
        });

        test('parseDateKey reconstructs midnight date from key', () => {
            const date = parseDateKey('2026-10-23');
            expect(date.getFullYear()).toBe(2026);
            expect(date.getMonth()).toBe(9); // 0-indexed October
            expect(date.getDate()).toBe(23);
            expect(date.getHours()).toBe(0);
            expect(date.getMinutes()).toBe(0);
        });

        test('getLocalDayBoundaries returns valid ISO UTC start and end bounds', () => {
            const boundaries = getLocalDayBoundaries('2026-10-23');
            expect(boundaries.dateKey).toBe('2026-10-23');
            expect(boundaries.startDate).toBeDefined();
            expect(boundaries.endDate).toBeDefined();

            const startObj = new Date(boundaries.startDate);
            const endObj = new Date(boundaries.endDate);

            // Time difference should be exactly 86399999 ms (23h 59m 59s 999ms)
            expect(endObj.getTime() - startObj.getTime()).toBe(86399999);
        });

        test('getMonthGrid constructs Monday-first grid with leading and trailing days', () => {
            // October 2026: 1st is Thursday, 31st is Saturday
            const grid = getMonthGrid(2026, 9);
            expect(grid.year).toBe(2026);
            expect(grid.monthIndex).toBe(9);
            expect(grid.monthName).toBe('October');
            expect(grid.days.length % 7).toBe(0); // Multiple of 7 for full weeks

            // First cell should be Monday Sep 28
            const firstCell = grid.days[0];
            expect(firstCell.dayNumber).toBe(28);
            expect(firstCell.isCurrentMonth).toBe(false);
            expect(firstCell.isLeading).toBe(true);

            // Oct 1 should be current month
            const oct1 = grid.days.find(d => d.dateKey === '2026-10-01');
            expect(oct1).toBeDefined();
            expect(oct1.isCurrentMonth).toBe(true);
            expect(oct1.dayNumber).toBe(1);

            // Last cell should be Sunday Nov 1
            const lastCell = grid.days[grid.days.length - 1];
            expect(lastCell.dayNumber).toBe(1);
            expect(lastCell.isCurrentMonth).toBe(false);
            expect(lastCell.isTrailing).toBe(true);
        });

        test('formatFriendlyDate renders human-readable date', () => {
            const friendly = formatFriendlyDate('2026-10-23');
            expect(friendly).toContain('October');
            expect(friendly).toContain('2026');
            expect(friendly).toContain('23');
        });
    });

    describe('v1NotificationController.getCalendarSummary', () => {
        test('aggregates daily notification count, unread count, and critical indicators via MongoDB aggregation', async () => {
            mockReq.query = {
                startDate: '2026-10-01T00:00:00.000Z',
                endDate: '2026-10-31T23:59:59.999Z',
                timezone: 'Asia/Kolkata'
            };

            const mockAggResults = [
                {
                    _id: '2026-10-22',
                    count: 3,
                    unreadCount: 1,
                    criticalCount: 0,
                    categories: ['booking', 'lease']
                },
                {
                    _id: '2026-10-23',
                    count: 5,
                    unreadCount: 2,
                    criticalCount: 1,
                    categories: ['renewal', 'payments']
                }
            ];

            const aggSpy = jest.spyOn(Notification, 'aggregate').mockResolvedValue(mockAggResults);

            await getCalendarSummary(mockReq, mockRes);

            expect(aggSpy).toHaveBeenCalled();
            const pipeline = aggSpy.mock.calls[0][0];

            // Verify security & recipient isolation in $match
            const matchStage = pipeline.find(stage => stage.$match)?.$match;
            expect(matchStage).toBeDefined();
            expect(matchStage.recipient.toString()).toBe(testUserId);
            expect(matchStage.isDeleted).toEqual({ $ne: true });
            expect(matchStage.isArchived).toEqual({ $ne: true });
            expect(matchStage.createdAt.$gte).toEqual(new Date('2026-10-01T00:00:00.000Z'));
            expect(matchStage.createdAt.$lte).toEqual(new Date('2026-10-31T23:59:59.999Z'));

            // Verify $group uses $dateToString with timezone
            const groupStage = pipeline.find(stage => stage.$group)?.$group;
            expect(groupStage._id.$dateToString.timezone).toBe('Asia/Kolkata');

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    summary: {
                        '2026-10-22': {
                            date: '2026-10-22',
                            count: 3,
                            unreadCount: 1,
                            criticalCount: 0,
                            categories: ['booking', 'lease']
                        },
                        '2026-10-23': {
                            date: '2026-10-23',
                            count: 5,
                            unreadCount: 2,
                            criticalCount: 1,
                            categories: ['renewal', 'payments']
                        }
                    },
                    timezone: 'Asia/Kolkata'
                })
            }));
        });

        test('converts client timezoneOffset into ISO offset (+HH:MM) when timezone name is omitted', async () => {
            mockReq.query = {
                startDate: '2026-10-01T00:00:00.000Z',
                endDate: '2026-10-31T23:59:59.999Z',
                timezoneOffset: '-330' // IST: local is ahead of UTC by 5h30m -> '+05:30'
            };

            const aggSpy = jest.spyOn(Notification, 'aggregate').mockResolvedValue([]);

            await getCalendarSummary(mockReq, mockRes);

            expect(aggSpy).toHaveBeenCalled();
            const pipeline = aggSpy.mock.calls[0][0];
            const groupStage = pipeline.find(stage => stage.$group)?.$group;
            expect(groupStage._id.$dateToString.timezone).toBe('+05:30');
        });

        test('gracefully falls back to JS grouping if MongoDB aggregation throws unknown timezone error', async () => {
            mockReq.query = {
                startDate: '2026-10-23T00:00:00.000Z',
                endDate: '2026-10-23T23:59:59.999Z',
                timezone: 'Invalid/Zone_Name'
            };

            jest.spyOn(Notification, 'aggregate').mockRejectedValue(new Error('unrecognized timezone identifier'));

            const mockDocs = [
                {
                    createdAt: new Date('2026-10-23T10:00:00.000Z'),
                    isRead: false,
                    read: false,
                    priority: 'critical',
                    category: 'booking'
                },
                {
                    createdAt: new Date('2026-10-23T14:00:00.000Z'),
                    isRead: true,
                    read: true,
                    priority: 'medium',
                    category: 'lease'
                }
            ];

            jest.spyOn(Notification, 'find').mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockDocs)
            });

            await getCalendarSummary(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    summary: expect.objectContaining({
                        '2026-10-23': expect.objectContaining({
                            count: 2,
                            unreadCount: 1,
                            criticalCount: 1,
                            categories: expect.arrayContaining(['booking', 'lease'])
                        })
                    })
                })
            }));
        });

        test('applies optional filters (category, priority, unreadOnly) to summary aggregation', async () => {
            mockReq.query = {
                category: 'renewal',
                priority: 'high',
                unreadOnly: 'true'
            };

            const aggSpy = jest.spyOn(Notification, 'aggregate').mockResolvedValue([]);

            await getCalendarSummary(mockReq, mockRes);

            const pipeline = aggSpy.mock.calls[0][0];
            const matchStage = pipeline.find(stage => stage.$match)?.$match;

            expect(matchStage.category).toBe('renewal');
            expect(matchStage.priority).toBe('high');
            expect(matchStage.$or).toEqual([{ isRead: false }, { read: false }]);
        });
    });

    describe('v1NotificationController.getCalendarAgenda', () => {
        test('fetches notifications within date bounds and groups by local date', async () => {
            mockReq.query = {
                startDate: '2026-10-23T00:00:00.000Z',
                endDate: '2026-10-23T23:59:59.999Z',
                timezone: 'UTC'
            };

            const mockNotifications = [
                {
                    _id: new mongoose.Types.ObjectId(),
                    recipient: testUserId,
                    title: 'Oct 23 Agenda Item',
                    message: 'Event detail',
                    category: 'renewal',
                    priority: 'high',
                    severity: 'warning',
                    isRead: false,
                    readAt: null,
                    createdAt: new Date('2026-10-23T08:00:00.000Z'),
                    updatedAt: new Date('2026-10-23T08:00:00.000Z'),
                    __v: 1
                }
            ];

            jest.spyOn(Notification, 'find').mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockNotifications)
            });

            await getCalendarAgenda(mockReq, mockRes);

            expect(Notification.find).toHaveBeenCalledWith(expect.objectContaining({
                recipient: new mongoose.Types.ObjectId(testUserId),
                isDeleted: { $ne: true },
                isArchived: { $ne: true },
                createdAt: {
                    $gte: new Date('2026-10-23T00:00:00.000Z'),
                    $lte: new Date('2026-10-23T23:59:59.999Z')
                }
            }));

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: [
                    {
                        date: '2026-10-23',
                        events: expect.arrayContaining([
                            expect.objectContaining({
                                title: 'Oct 23 Agenda Item',
                                category: 'renewal'
                            })
                        ])
                    }
                ]
            }));
        });
    });

    describe('v1NotificationController.getMyNotifications with Date Filtering', () => {
        test('filters by startDate and endDate ISO strings for single-day querying', async () => {
            mockReq.query = {
                startDate: '2026-10-23T00:00:00.000Z',
                endDate: '2026-10-23T23:59:59.999Z',
                page: '1',
                limit: '20'
            };

            const mockFind = {
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([])
            };
            jest.spyOn(Notification, 'find').mockReturnValue(mockFind);
            jest.spyOn(Notification, 'countDocuments').mockResolvedValue(0);

            await getMyNotifications(mockReq, mockRes);

            expect(Notification.find).toHaveBeenCalled();
            const calledQuery = Notification.find.mock.calls[0][0];

            expect(calledQuery.$and).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    recipient: new mongoose.Types.ObjectId(testUserId)
                }),
                expect.objectContaining({
                    createdAt: {
                        $gte: new Date('2026-10-23T00:00:00.000Z'),
                        $lte: new Date('2026-10-23T23:59:59.999Z')
                    }
                })
            ]));

            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        test('safely ignores invalid/malformed date query params without crashing', async () => {
            mockReq.query = {
                startDate: 'not-a-valid-date',
                endDate: 'also-invalid'
            };

            const mockFind = {
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([])
            };
            jest.spyOn(Notification, 'find').mockReturnValue(mockFind);
            jest.spyOn(Notification, 'countDocuments').mockResolvedValue(0);

            await getMyNotifications(mockReq, mockRes);

            expect(Notification.find).toHaveBeenCalled();
            const calledQuery = Notification.find.mock.calls[0][0];

            // Should NOT have createdAt with NaN dates
            const dateClause = calledQuery.$and.find(c => c.createdAt);
            expect(dateClause).toBeUndefined();

            expect(mockRes.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Legacy notificationController Compatibility', () => {
        test('legacy getMyNotifications also supports startDate and endDate query', async () => {
            mockReq.query = {
                startDate: '2026-10-23T00:00:00.000Z',
                endDate: '2026-10-23T23:59:59.999Z'
            };

            const mockFind = {
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([])
            };
            jest.spyOn(Notification, 'find').mockReturnValue(mockFind);
            jest.spyOn(Notification, 'countDocuments').mockResolvedValue(0);

            await legacyNotificationController.getMyNotifications(mockReq, mockRes);

            expect(Notification.find).toHaveBeenCalledWith(expect.objectContaining({
                recipient: testUserId,
                isDeleted: { $ne: true },
                createdAt: {
                    $gte: new Date('2026-10-23T00:00:00.000Z'),
                    $lte: new Date('2026-10-23T23:59:59.999Z')
                }
            }));
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        test('legacy controller re-exports getCalendarSummary and getCalendarAgenda', () => {
            expect(typeof legacyNotificationController.getCalendarSummary).toBe('function');
            expect(typeof legacyNotificationController.getCalendarAgenda).toBe('function');
        });
    });
});
