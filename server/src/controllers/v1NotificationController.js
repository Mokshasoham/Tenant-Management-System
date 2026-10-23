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
        if (startDate) {
            const parsedStart = new Date(startDate);
            if (!isNaN(parsedStart.getTime())) dateCond.$gte = parsedStart;
        }
        if (endDate) {
            const parsedEnd = new Date(endDate);
            if (!isNaN(parsedEnd.getTime())) dateCond.$lte = parsedEnd;
        }
        if (Object.keys(dateCond).length > 0) {
            conditions.push({ createdAt: dateCond });
        }
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
        $or: [{ isRead: false }, { read: false }],
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
 * Helper to normalize timezone or offset into a format supported by MongoDB $dateToString
 * Supports IANA timezones (e.g. "Asia/Kolkata", "America/New_York") or offsets (e.g. "+05:30", "-04:00")
 */
function resolveMongoTimezone(timezone, timezoneOffset) {
    if (typeof timezone === 'string' && timezone.trim()) {
        const trimmed = timezone.trim();
        return trimmed;
    }
    if (timezoneOffset !== undefined && timezoneOffset !== null) {
        const offsetMin = parseInt(timezoneOffset, 10);
        if (!isNaN(offsetMin)) {
            // JavaScript getTimezoneOffset(): positive if UTC is ahead of local time, negative if local time is ahead
            // MongoDB / ISO offset is opposite sign: UTC+5:30 means local is +5h30m relative to UTC
            const sign = offsetMin <= 0 ? '+' : '-';
            const abs = Math.abs(offsetMin);
            const hours = String(Math.floor(abs / 60)).padStart(2, '0');
            const mins = String(abs % 60).padStart(2, '0');
            return `${sign}${hours}:${mins}`;
        }
    }
    return 'UTC';
}

/**
 * Format a Date object into 'YYYY-MM-DD' in a specified timezone (for safe fallback grouping)
 */
function formatDateInTimezone(date, timezone) {
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone === 'UTC' || !timezone ? 'UTC' : timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        return formatter.format(date); // 'YYYY-MM-DD' in en-CA locale
    } catch {
        return date.toISOString().split('T')[0];
    }
}

/**
 * GET /api/v1/notifications/calendar-summary
 * High-performance aggregation providing notification counts, unread status, and priority indicators
 * per date for a given calendar range (month or interval), respecting the user's timezone.
 */
export const getCalendarSummary = asyncHandler(async (req, res) => {
    const {
        startDate,
        endDate,
        start,
        end,
        timezone,
        timezoneOffset,
        category,
        priority,
        unreadOnly
    } = req.query;

    const actualStart = startDate || start;
    const actualEnd = endDate || end;

    const recipientId = new mongoose.Types.ObjectId(req.user.userId);
    const resolvedTz = resolveMongoTimezone(timezone, timezoneOffset);

    const matchConditions = {
        recipient: recipientId,
        isDeleted: { $ne: true },
        isArchived: { $ne: true }
    };

    if (actualStart || actualEnd) {
        matchConditions.createdAt = {};
        if (actualStart) {
            const pStart = new Date(actualStart);
            if (!isNaN(pStart.getTime())) matchConditions.createdAt.$gte = pStart;
        }
        if (actualEnd) {
            const pEnd = new Date(actualEnd);
            if (!isNaN(pEnd.getTime())) matchConditions.createdAt.$lte = pEnd;
        }
        if (Object.keys(matchConditions.createdAt).length === 0) {
            delete matchConditions.createdAt;
        }
    }

    if (category && category !== 'all') {
        matchConditions.category = category;
    }
    if (priority && priority !== 'all') {
        matchConditions.priority = priority;
    }
    if (unreadOnly === 'true' || unreadOnly === true) {
        matchConditions.$or = [{ isRead: false }, { read: false }];
    }

    const summaryMap = {};

    try {
        // High-performance MongoDB aggregation
        const aggregationPipeline = [
            { $match: matchConditions },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            date: '$createdAt',
                            format: '%Y-%m-%d',
                            timezone: resolvedTz
                        }
                    },
                    count: { $sum: 1 },
                    unreadCount: {
                        $sum: {
                            $cond: [{ $or: [{ $eq: ['$isRead', false] }, { $eq: ['$read', false] }] }, 1, 0]
                        }
                    },
                    criticalCount: {
                        $sum: {
                            $cond: [{ $in: ['$priority', ['critical', 'high']] }, 1, 0]
                        }
                    },
                    categories: { $addToSet: '$category' }
                }
            },
            { $sort: { _id: 1 } }
        ];

        const results = await Notification.aggregate(aggregationPipeline);

        results.forEach(row => {
            if (row._id) {
                summaryMap[row._id] = {
                    date: row._id,
                    count: row.count,
                    unreadCount: row.unreadCount,
                    criticalCount: row.criticalCount,
                    categories: row.categories || []
                };
            }
        });
    } catch (aggErr) {
        // Fallback for cases where MongoDB timezone database does not recognize an exotic IANA string:
        // Query matching documents and group safely in JS using Intl.DateTimeFormat
        console.warn('[getCalendarSummary] Mongo aggregate error, falling back to JS grouping:', aggErr.message);
        const docs = await Notification.find(matchConditions, {
            createdAt: 1,
            isRead: 1,
            read: 1,
            priority: 1,
            category: 1
        }).lean();

        docs.forEach(doc => {
            const dateKey = formatDateInTimezone(new Date(doc.createdAt), resolvedTz);
            if (!summaryMap[dateKey]) {
                summaryMap[dateKey] = {
                    date: dateKey,
                    count: 0,
                    unreadCount: 0,
                    criticalCount: 0,
                    categories: []
                };
            }
            summaryMap[dateKey].count += 1;
            if (doc.isRead === false || doc.read === false) {
                summaryMap[dateKey].unreadCount += 1;
            }
            if (['critical', 'high'].includes(doc.priority)) {
                summaryMap[dateKey].criticalCount += 1;
            }
            if (doc.category && !summaryMap[dateKey].categories.includes(doc.category)) {
                summaryMap[dateKey].categories.push(doc.category);
            }
        });
    }

    res.status(200).json({
        success: true,
        data: {
            summary: summaryMap,
            timezone: resolvedTz,
            range: {
                startDate: actualStart || null,
                endDate: actualEnd || null
            }
        }
    });
});

/**
 * GET /api/v1/notifications/calendar
 * Fetch date-aggregated timeline agendas for Calendar views
 */
export const getCalendarAgenda = asyncHandler(async (req, res) => {
    const { start, end, startDate, endDate, timezone, timezoneOffset } = req.query;

    const actualStart = startDate || start;
    const actualEnd = endDate || end;

    const query = {
        recipient: new mongoose.Types.ObjectId(req.user.userId),
        isDeleted: { $ne: true },
        isArchived: { $ne: true }
    };

    if (actualStart || actualEnd) {
        query.createdAt = {};
        if (actualStart) {
            const pStart = new Date(actualStart);
            if (!isNaN(pStart.getTime())) query.createdAt.$gte = pStart;
        }
        if (actualEnd) {
            const pEnd = new Date(actualEnd);
            if (!isNaN(pEnd.getTime())) query.createdAt.$lte = pEnd;
        }
        if (Object.keys(query.createdAt).length === 0) {
            delete query.createdAt;
        }
    }

    const resolvedTz = resolveMongoTimezone(timezone, timezoneOffset);
    const events = await Notification.find(query).sort({ createdAt: 1 });

    const grouped = {};
    events.forEach(evt => {
        const dateStr = formatDateInTimezone(new Date(evt.createdAt), resolvedTz);
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
        data,
        timezone: resolvedTz
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
