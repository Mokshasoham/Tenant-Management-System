import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/errorHandling.js';
import { toNotificationDTO, toNotificationDTOList } from '../modules/lease-renewal/notifications/notificationMapper.js';

/**
 * GET /api/v1/notifications
 * Advanced filtered & searched activity timeline with offset and cursor pagination support
 */
export const getMyNotifications = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        cursor,
        search,
        category,
        priority,
        severity,
        isRead,
        unreadOnly,
        isArchived,
        startDate,
        endDate,
        propertyId
    } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    
    // Base query restricted to logged-in recipient
    const conditions = [
        { recipient: new mongoose.Types.ObjectId(req.user.userId) },
        { isDeleted: { $ne: true } }
    ];

    // Unread & Read Filters
    if (unreadOnly === 'true' || unreadOnly === true) {
        conditions.push({ $or: [{ isRead: false }, { read: false }] });
    } else if (isRead !== undefined) {
        const readBool = isRead === 'true' || isRead === true;
        if (readBool) {
            conditions.push({ $or: [{ isRead: true }, { read: true }] });
        } else {
            conditions.push({ $or: [{ isRead: false }, { read: false }] });
        }
    }

    // Category Filter
    if (category && category !== 'all') {
        conditions.push({ category });
    }
    // Priority Filter
    if (priority && priority !== 'all') {
        conditions.push({ priority });
    }
    // Severity Filter
    if (severity && severity !== 'all') {
        conditions.push({ severity });
    }
    // Archived Filter
    if (isArchived !== undefined) {
        conditions.push({ isArchived: isArchived === 'true' });
    } else {
        conditions.push({ isArchived: { $ne: true } });
    }

    // Property Filter
    if (propertyId) {
        conditions.push({
            $or: [
                { 'metadata.propertyId': propertyId },
                { entityId: propertyId }
            ]
        });
    }

    // Date Range Filter
    if (startDate || endDate) {
        const dateCond = {};
        if (startDate) dateCond.$gte = new Date(startDate);
        if (endDate) dateCond.$lte = new Date(endDate);
        conditions.push({ createdAt: dateCond });
    }

    // Search Filter
    if (search) {
        const searchRegex = new RegExp(search, 'i');
        conditions.push({
            $or: [
                { title: searchRegex },
                { message: searchRegex },
                { eventId: searchRegex },
                { sourceModule: searchRegex },
                { 'metadata.bookingNumber': searchRegex },
                { 'metadata.invoiceNumber': searchRegex },
                { 'metadata.leaseNumber': searchRegex },
                { 'metadata.reference': searchRegex },
                { 'metadata.propertyName': searchRegex },
                { 'metadata.tenantName': searchRegex }
            ]
        });
    }

    // Cursor Pagination (if provided)
    if (cursor) {
        conditions.push({ _id: { $lt: new mongoose.Types.ObjectId(cursor) } });
    }

    const query = { $and: conditions };

    const startTime = process.hrtime();
    const skip = cursor ? 0 : (parseInt(page) - 1) * parsedLimit;

    const [rawNotifications, total] = await Promise.all([
        Notification.find(query)
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(parsedLimit + 1), // fetch 1 extra to determine hasMore for cursor pagination
        Notification.countDocuments(query)
    ]);

    const hasMore = rawNotifications.length > parsedLimit;
    const notifications = hasMore ? rawNotifications.slice(0, parsedLimit) : rawNotifications;
    const nextCursor = hasMore && notifications.length > 0 ? notifications[notifications.length - 1]._id.toString() : null;

    const diff = process.hrtime(startTime);
    const executionMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(2);

    res.status(200).json({
        success: true,
        data: toNotificationDTOList(notifications),
        pagination: {
            page: parseInt(page),
            limit: parsedLimit,
            total,
            pages: Math.ceil(total / parsedLimit),
            hasMore,
            nextCursor,
            cursor: cursor || null
        },
        metrics: {
            executionMs: parseFloat(executionMs)
        }
    });
});

/**
 * GET /api/v1/notifications/unread-count
 * Returns fast unread notifications counter for navigation badge
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
    const recipientId = new mongoose.Types.ObjectId(req.user.userId);
    const { category } = req.query;
    const filter = {
        recipient: recipientId,
        isRead: false,
        read: false,
        isDeleted: { $ne: true },
        isArchived: { $ne: true }
    };

    if (category && category !== 'all') {
        filter.category = category;
    }

    const unreadCount = await Notification.countDocuments(filter);

    res.status(200).json({
        success: true,
        data: {
            unreadCount
        }
    });
});

/**
 * PATCH /api/v1/notifications/:id/read or PUT /api/v1/notifications/:id/read
 * Mark a single notification as read
 */
export const markRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, recipient: req.user.userId, isDeleted: { $ne: true } },
        { 
            $set: {
                isRead: true, 
                read: true, 
                readAt: new Date() 
            },
            $inc: { __v: 1 } // Optimistic concurrency increment
        },
        { new: true }
    );

    if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: toNotificationDTO(notification)
    });
});

/**
 * PATCH /api/v1/notifications/bulk-read
 * Batch mark selected notifications as read
 */
export const bulkRead = asyncHandler(async (req, res) => {
    const { notificationIds } = req.body;
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return res.status(400).json({ success: false, message: 'notificationIds array is required' });
    }

    const result = await Notification.updateMany(
        {
            _id: { $in: notificationIds.map(id => new mongoose.Types.ObjectId(id)) },
            recipient: req.user.userId,
            isDeleted: { $ne: true }
        },
        {
            $set: {
                isRead: true,
                read: true,
                readAt: new Date()
            },
            $inc: { __v: 1 }
        }
    );

    res.status(200).json({
        success: true,
        message: `Successfully marked ${result.modifiedCount} notifications as read`,
        data: {
            modifiedCount: result.modifiedCount
        }
    });
});

/**
 * PATCH /api/v1/notifications/read-all or PUT /api/v1/notifications/read-all
 * Mark all user notifications as read
 */
export const markAllRead = asyncHandler(async (req, res) => {
    const result = await Notification.updateMany(
        { recipient: req.user.userId, isRead: false, isDeleted: { $ne: true } },
        { 
            $set: {
                isRead: true, 
                read: true, 
                readAt: new Date() 
            },
            $inc: { __v: 1 }
        }
    );

    res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        data: {
            modifiedCount: result.modifiedCount
        }
    });
});

/**
 * DELETE /api/v1/notifications/:id
 * Soft-delete a notification from active view with audit trail
 */
export const deleteNotification = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, recipient: req.user.userId },
        { 
            $set: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: new mongoose.Types.ObjectId(req.user.userId)
            },
            $inc: { __v: 1 }
        },
        { new: true }
    );

    if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({
        success: true,
        message: 'Notification soft-deleted successfully (retained in audit log)',
        data: toNotificationDTO(notification)
    });
});

/**
 * POST /api/v1/notifications/bulk-delete
 * Soft-delete selected notifications with audit tracking
 */
export const bulkDelete = asyncHandler(async (req, res) => {
    const { notificationIds } = req.body;
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return res.status(400).json({ success: false, message: 'notificationIds array is required' });
    }

    const result = await Notification.updateMany(
        {
            _id: { $in: notificationIds.map(id => new mongoose.Types.ObjectId(id)) },
            recipient: req.user.userId
        },
        {
            $set: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: new mongoose.Types.ObjectId(req.user.userId)
            },
            $inc: { __v: 1 }
        }
    );

    res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.modifiedCount} notifications`,
        data: {
            modifiedCount: result.modifiedCount
        }
    });
});

/**
 * DELETE /api/v1/notifications/clear-read
 * Soft-delete all read notifications for the current user
 */
export const clearAllRead = asyncHandler(async (req, res) => {
    const result = await Notification.updateMany(
        {
            recipient: req.user.userId,
            isRead: true,
            isDeleted: { $ne: true }
        },
        {
            $set: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: new mongoose.Types.ObjectId(req.user.userId)
            },
            $inc: { __v: 1 }
        }
    );

    res.status(200).json({
        success: true,
        message: `Cleared ${result.modifiedCount} read notifications`,
        data: {
            modifiedCount: result.modifiedCount
        }
    });
});

/**
 * PUT /api/v1/notifications/:id/archive
 * Toggle archived status of a notification
 */
export const toggleArchive = asyncHandler(async (req, res) => {
    const notification = await Notification.findOne({
        _id: req.params.id,
        recipient: req.user.userId,
        isDeleted: { $ne: true }
    });

    if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isArchived = !notification.isArchived;
    await notification.save();

    res.status(200).json({
        success: true,
        message: `Notification ${notification.isArchived ? 'archived' : 'unarchived'} successfully`,
        data: toNotificationDTO(notification)
    });
});

/**
 * GET /api/v1/notifications/calendar
 * Fetch date-aggregated timeline agendas for Calendar views
 */
export const getCalendarAgenda = asyncHandler(async (req, res) => {
    const { start, end } = req.query;

    const query = {
        recipient: new mongoose.Types.ObjectId(req.user.userId),
        isDeleted: { $ne: true }
    };

    if (start || end) {
        query.createdAt = {};
        if (start) query.createdAt.$gte = new Date(start);
        if (end) query.createdAt.$lte = new Date(end);
    }

    const events = await Notification.find(query).sort({ createdAt: 1 });

    const grouped = {};
    events.forEach(evt => {
        const dateStr = new Date(evt.createdAt).toISOString().split('T')[0];
        if (!grouped[dateStr]) {
            grouped[dateStr] = [];
        }
        grouped[dateStr].push(toNotificationDTO(evt));
    });

    const data = Object.keys(grouped).map(date => ({
        date,
        events: grouped[date]
    }));

    res.status(200).json({
        success: true,
        data
    });
});

/**
 * GET /api/v1/notifications/stats
 * Return metrics and aggregates for dashboards
 */
export const getStats = asyncHandler(async (req, res) => {
    const recipientId = new mongoose.Types.ObjectId(req.user.userId);

    const [unreadCount, criticalCount, totalCount] = await Promise.all([
        Notification.countDocuments({ recipient: recipientId, isRead: false, read: false, isDeleted: false }),
        Notification.countDocuments({ recipient: recipientId, severity: 'critical', isRead: false, read: false, isDeleted: false }),
        Notification.countDocuments({ recipient: recipientId, isDeleted: false })
    ]);

    const categoryDist = await Notification.aggregate([
        { $match: { recipient: recipientId, isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const readCount = await Notification.countDocuments({ recipient: recipientId, isRead: true, isDeleted: false });
    const readRate = totalCount > 0 ? parseFloat(((readCount / totalCount) * 100).toFixed(2)) : 0;

    const readResponseTimes = await Notification.aggregate([
        { 
            $match: { 
                recipient: recipientId, 
                isRead: true, 
                readAt: { $ne: null } 
            } 
        },
        {
            $project: {
                durationMinutes: {
                    $divide: [
                        { $subtract: ['$readAt', '$createdAt'] },
                        1000 * 60
                    ]
                }
            }
        },
        {
            $group: {
                _id: null,
                avgResponseMinutes: { $avg: '$durationMinutes' }
            }
        }
    ]);

    const averageResponseTimeMin = readResponseTimes.length > 0
        ? parseFloat(readResponseTimes[0].avgResponseMinutes.toFixed(2))
        : 0;

    res.status(200).json({
        success: true,
        data: {
            unreadCount,
            criticalCount,
            totalCount,
            readRate,
            averageResponseTimeMin,
            categoryDistribution: categoryDist.map(c => ({ category: c._id, count: c.count }))
        }
    });
});
