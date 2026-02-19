import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/errorHandling.js';

export const getMyNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
        Notification.find({ recipient: req.user.userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        Notification.countDocuments({ recipient: req.user.userId }),
    ]);

    res.status(200).json({
        success: true,
        data: notifications,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({
        recipient: req.user.userId,
        read: false,
    });
    res.status(200).json({ success: true, data: { count } });
});

export const markRead = asyncHandler(async (req, res) => {
    await Notification.findOneAndUpdate(
        { _id: req.params.id, recipient: req.user.userId },
        { read: true }
    );
    res.status(200).json({ success: true, message: 'Notification marked as read' });
});

export const markAllRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user.userId, read: false },
        { read: true }
    );
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

export const deleteNotification = asyncHandler(async (req, res) => {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user.userId });
    res.status(200).json({ success: true, message: 'Notification deleted' });
});
