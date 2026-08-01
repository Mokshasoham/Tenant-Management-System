import Maintenance from '../models/Maintenance.js';
import EventService from '../services/eventService.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';

// Helper to create a notification
async function notify(recipientId, type, title, message, relatedId, relatedModel) {
    try {
        let eventName = 'update';
        if (type === 'maintenance_created') eventName = 'created';
        else if (type === 'maintenance_resolved') eventName = 'resolved';

        let severity = 'information';
        if (type === 'maintenance_resolved') severity = 'success';

        await EventService.publish({
            recipient: recipientId,
            category: 'maintenance',
            event: eventName,
            title,
            description: message,
            sourceModule: 'maintenance',
            entityType: 'Maintenance',
            entityId: relatedId,
            redirectUrl: `/maintenance`,
            action: 'view',
            priority: 'medium',
            severity,
            metadata: {
                maintenanceId: relatedId
            }
        });
    } catch (e) {
        logger.error('Failed to create notification:', e);
    }
}

export const getAllRequests = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, priority, category } = req.query;
    const user = req.user;
    const filter = {};

    // Role-based visibility
    if (user.role === 'tenant') {
        filter.requestedBy = user.userId;
    }
    // manager and admin see everything (manager could be filtered by property in future)

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
        Maintenance.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('requestedBy', 'firstName lastName email role')
            .populate('assignedTo', 'firstName lastName')
            .populate('property', 'name address'),
        Maintenance.countDocuments(filter),
    ]);

    res.status(200).json({
        success: true,
        data: requests,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
});

export const getRequestById = asyncHandler(async (req, res) => {
    const request = await Maintenance.findById(req.params.id)
        .populate('requestedBy', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName')
        .populate('property', 'name address')
        .populate('notes.addedBy', 'firstName lastName role');

    if (!request) throw new AppError('Maintenance request not found', 404);

    res.status(200).json({ success: true, data: request });
});

export const createRequest = asyncHandler(async (req, res) => {
    const { title, description, category, priority, unit, scheduledDate, scheduledSlot } = req.body;

    const request = await Maintenance.create({
        title,
        description,
        category,
        priority,
        unit,
        requestedBy: req.user.userId,
        status: 'open',
        scheduledDate,
        scheduledSlot,
    });

    logger.info(`Maintenance request created: ${request._id} by ${req.user.userId}`);

    // Notify all managers/admins
    const managers = await User.find({ role: { $in: ['manager', 'admin'] }, isActive: true }, '_id');
    for (const m of managers) {
        if (m._id.toString() !== req.user.userId) {
            await notify(
                m._id,
                'maintenance_created',
                'New Maintenance Request',
                `"${title}" — ${priority} priority, category: ${category}`,
                request._id,
                'Maintenance'
            );
        }
    }

    res.status(201).json({ success: true, message: 'Maintenance request submitted', data: request });
});

export const updateRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, priority, assignedTo, estimatedCost, actualCost, scheduledDate, scheduledSlot } = req.body;

    const request = await Maintenance.findById(id);
    if (!request) throw new AppError('Request not found', 404);

    const prev = request.status;

    if (status) request.status = status;
    if (priority) request.priority = priority;
    if (assignedTo) request.assignedTo = assignedTo;
    if (estimatedCost !== undefined) request.estimatedCost = estimatedCost;
    if (actualCost !== undefined) request.actualCost = actualCost;
    if (scheduledDate !== undefined) request.scheduledDate = scheduledDate;
    if (scheduledSlot !== undefined) request.scheduledSlot = scheduledSlot;
    if (status === 'resolved') request.resolvedAt = new Date();

    await request.save();

    // Notify tenant when status changes
    if (status && status !== prev && request.requestedBy) {
        const typeMap = {
            in_progress: 'maintenance_update',
            resolved: 'maintenance_resolved',
        };
        await notify(
            request.requestedBy,
            typeMap[status] || 'maintenance_update',
            `Maintenance ${status === 'resolved' ? 'Resolved' : 'Updated'}`,
            `Your request "${request.title}" is now ${status.replace('_', ' ')}.`,
            request._id,
            'Maintenance'
        );
    }

    logger.info(`Maintenance ${id} updated to ${status}`);
    res.status(200).json({ success: true, message: 'Request updated', data: request });
});

export const addNote = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;

    if (!text?.trim()) throw new AppError('Note text is required', 400);

    const request = await Maintenance.findByIdAndUpdate(
        id,
        { $push: { notes: { text, addedBy: req.user.userId } } },
        { new: true }
    ).populate('notes.addedBy', 'firstName lastName role');

    if (!request) throw new AppError('Request not found', 404);

    res.status(200).json({ success: true, message: 'Note added', data: request });
});

export const deleteRequest = asyncHandler(async (req, res) => {
    const request = await Maintenance.findByIdAndDelete(req.params.id);
    if (!request) throw new AppError('Request not found', 404);
    res.status(200).json({ success: true, message: 'Request deleted' });
});

export const getStats = asyncHandler(async (req, res) => {
    const filter = req.user.role === 'tenant' ? { requestedBy: req.user.userId } : {};

    const [open, in_progress, resolved, total] = await Promise.all([
        Maintenance.countDocuments({ ...filter, status: 'open' }),
        Maintenance.countDocuments({ ...filter, status: 'in_progress' }),
        Maintenance.countDocuments({ ...filter, status: 'resolved' }),
        Maintenance.countDocuments(filter),
    ]);

    const byPriority = await Maintenance.aggregate([
        { $match: { ...filter, status: { $in: ['open', 'in_progress'] } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    res.status(200).json({
        success: true,
        data: { open, in_progress, resolved, total, byPriority },
    });
});
