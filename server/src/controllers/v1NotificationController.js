import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/errorHandling.js';

/**
 * GET /api/v1/notifications
 * Advanced filtered & searched activity timeline
 */
export const getMyNotifications = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        search,
        category,
        priority,
        severity,
        isRead,
        isArchived,
        startDate,
        endDate,
        propertyId
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Always restrict to the logged-in recipient
    const query = {
        recipient: new mongoose.Types.ObjectId(req.user.userId),
        isDeleted: { $ne: true } // Exclude soft-deleted items from timeline
    };

    // Filters
    if (category && category !== 'all') {
        query.category = category;
    }
    if (priority && priority !== 'all') {
        query.priority = priority;
    }
    if (severity && severity !== 'all') {
        query.severity = severity;
    }
    if (isRead !== undefined) {
        query.isRead = isRead === 'true';
    }
    if (isArchived !== undefined) {
        query.isArchived = isArchived === 'true';
    } else {
        // By default, do not show archived items unless requested
        query.isArchived = { $ne: true };
    }

    // Property Filter
    if (propertyId) {
        query.$or = [
            { 'metadata.propertyId': propertyId },
            { entityId: propertyId }
        ];
    }

    // Date Range Filter
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Search query
    if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
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
        ];
    }

    // Benchmark time performance
    const startTime = process.hrtime();

    const [notifications, total] = await Promise.all([
        Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        Notification.countDocuments(query)
    ]);

    const diff = process.hrtime(startTime);
    const executionMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(2);

    res.status(200).json({
        success: true,
        data: notifications,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        },
        metrics: {
            executionMs: parseFloat(executionMs)
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
        recipient: req.user.userId
    });

    if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isArchived = !notification.isArchived;
    await notification.save();

    res.status(200).json({
        success: true,
        message: `Notification ${notification.isArchived ? 'archived' : 'unarchived'} successfully`,
        data: notification
    });
});

/**
 * PUT /api/v1/notifications/:id/read
 * Mark a notification as read and record timestamp
 */
export const markRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, recipient: req.user.userId },
        { 
            isRead: true, 
            read: true, 
            readAt: new Date() 
        },
        { new: true }
    );

    if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: notification
    });
});

/**
 * PUT /api/v1/notifications/read-all
 * Mark all user notifications as read
 */
export const markAllRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user.userId, isRead: false },
        { 
            isRead: true, 
            read: true, 
            readAt: new Date() 
        }
    );

    res.status(200).json({
        success: true,
        message: 'All notifications marked as read'
    });
});

/**
 * DELETE /api/v1/notifications/:id
 * Soft-delete a notification from active view
 */
export const deleteNotification = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, recipient: req.user.userId },
        { isDeleted: true },
        { new: true }
    );

    if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({
        success: true,
        message: 'Notification soft-deleted successfully (retained in historical event logs)'
    });
});

/**
 * GET /api/v1/notifications/calendar
 * Fetch date-aggregated timeline agendas for Calendar views
 */
export const getCalendarAgenda = asyncHandler(async (req, res) => {
    const { start, end } = req.query;

    const query = {
        recipient: new mongoose.Types.ObjectId(req.user.userId)
    };

    if (start || end) {
        query.createdAt = {};
        if (start) query.createdAt.$gte = new Date(start);
        if (end) query.createdAt.$lte = new Date(end);
    }

    const events = await Notification.find(query).sort({ createdAt: 1 });

    // Group events by date (YYYY-MM-DD)
    const grouped = {};
    events.forEach(evt => {
        const dateStr = new Date(evt.createdAt).toISOString().split('T')[0];
        if (!grouped[dateStr]) {
            grouped[dateStr] = [];
        }
        grouped[dateStr].push(evt);
    });

    // Format output as list of objects
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
        Notification.countDocuments({ recipient: recipientId, isRead: false, isDeleted: false }),
        Notification.countDocuments({ recipient: recipientId, severity: 'critical', isRead: false, isDeleted: false }),
        Notification.countDocuments({ recipient: recipientId, isDeleted: false })
    ]);

    // Calculate Category Distribution
    const categoryDist = await Notification.aggregate([
        { $match: { recipient: recipientId, isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Calculate Read rate
    const readCount = await Notification.countDocuments({ recipient: recipientId, isRead: true, isDeleted: false });
    const readRate = totalCount > 0 ? parseFloat(((readCount / totalCount) * 100).toFixed(2)) : 0;

    // Calculate average read response time (in minutes)
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
