import maintenanceService from '../services/maintenanceService.js';
import maintenanceRepository from '../repositories/maintenanceRepository.js';
import maintenanceReportService from '../modules/reporting/services/MaintenanceReportService.js';
import eventBus from '../platform/events/eventBus.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';

function getRequestMeta(req) {
  return {
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown'
  };
}

export const getAllRequests = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, priority, category, emergencyOnly, slaBreached, search } = req.query;
    const user = req.user;
    const filter = {};

    const userId = user.userId || user._id || user.id;

    if (user.role === 'tenant') {
        filter.requestedBy = userId;
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (emergencyOnly === 'true') filter.priority = 'emergency';

    if (slaBreached === 'true') {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600 * 1000);
      filter.status = { $nin: ['completed', 'resolved', 'closed', 'cancelled'] };
      filter.$or = [
        { priority: 'emergency', createdAt: { $lt: thirtyMinsAgo } },
        { priority: { $ne: 'emergency' }, createdAt: { $lt: twentyFourHoursAgo } }
      ];
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { unit: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
        maintenanceRepository.findWithFilters(filter, skip, parseInt(limit)),
        maintenanceRepository.countWithFilters(filter),
    ]);

    await eventBus.publish('maintenance.queue.filtered', {
      filterCount: Object.keys(filter).length,
      resultCount: requests.length,
      userId
    }).catch(() => {});

    res.status(200).json({
        success: true,
        data: requests,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
});

export const getRequestById = asyncHandler(async (req, res) => {
    const request = await maintenanceRepository.findById(req.params.id);
    if (!request) throw new AppError('Maintenance request not found', 404);
    res.status(200).json({ success: true, data: request });
});

export const createRequest = asyncHandler(async (req, res) => {
    const reqMeta = getRequestMeta(req);
    const request = await maintenanceService.createRequest(req.body, req.user, reqMeta);
    res.status(201).json({ success: true, message: 'Maintenance request submitted', data: request });
});

export const uploadAttachments = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const files = req.files || (req.file ? [req.file] : []);
    const updated = await maintenanceService.uploadAttachments(id, files);
    res.status(200).json({ success: true, message: 'Attachments uploaded successfully', data: updated });
});

export const deleteAttachment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { attachmentUrl } = req.body;
    if (!attachmentUrl) throw new AppError('attachmentUrl is required', 400);

    const updated = await maintenanceService.deleteAttachment(id, attachmentUrl);
    res.status(200).json({ success: true, message: 'Attachment deleted', data: updated });
});

export const updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, note } = req.body;
    if (!status) throw new AppError('Status is required', 400);

    const updated = await maintenanceService.updateStatus(id, status, req.user, note);
    res.status(200).json({ success: true, message: 'Status updated', data: updated });
});

export const updateRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.status === 'resolved' || updateData.status === 'completed') {
        updateData.resolvedAt = new Date();
        updateData.completedAt = new Date();
    }

    const request = await maintenanceRepository.update(id, updateData);
    if (!request) throw new AppError('Request not found', 404);

    res.status(200).json({ success: true, message: 'Request updated', data: request });
});

export const addNote = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { text, attachmentUrl } = req.body;

    if (!text?.trim()) throw new AppError('Comment text is required', 400);

    const request = await maintenanceService.addComment(id, text, req.user, attachmentUrl);
    res.status(201).json({ success: true, message: 'Comment added', data: request });
});

export const getTimeline = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const request = await maintenanceRepository.findById(id);
    if (!request) throw new AppError('Request not found', 404);

    res.status(200).json({
        success: true,
        data: request.statusHistory || []
    });
});

export const getComments = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const request = await maintenanceRepository.findById(id);
    if (!request) throw new AppError('Request not found', 404);

    res.status(200).json({
        success: true,
        data: request.notes || []
    });
});

export const addRating = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { score, feedback } = req.body;

    if (!score || score < 1 || score > 5) {
        throw new AppError('Score must be between 1 and 5', 400);
    }

    const updated = await maintenanceService.addRating(id, score, feedback, req.user);
    res.status(200).json({ success: true, message: 'Rating submitted successfully', data: updated });
});

export const deleteRequest = asyncHandler(async (req, res) => {
    const request = await maintenanceRepository.delete(req.params.id);
    if (!request) throw new AppError('Request not found', 404);
    res.status(200).json({ success: true, message: 'Request deleted' });
});

export const getStats = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user._id || req.user.id;
    const filter = req.user.role === 'tenant' ? { requestedBy: userId } : {};

    const [open, in_progress, resolved, total, emergency] = await Promise.all([
        maintenanceRepository.countWithFilters({ ...filter, status: { $in: ['open', 'submitted', 'manager_review'] } }),
        maintenanceRepository.countWithFilters({ ...filter, status: { $in: ['in_progress', 'visit_scheduled', 'technician_assigned', 'technician_en_route', 'work_started', 'waiting_parts'] } }),
        maintenanceRepository.countWithFilters({ ...filter, status: { $in: ['resolved', 'completed'] } }),
        maintenanceRepository.countWithFilters(filter),
        maintenanceRepository.countWithFilters({ ...filter, priority: 'emergency' }),
    ]);

    const byPriority = await maintenanceRepository.aggregateByPriority(filter);

    res.status(200).json({
        success: true,
        data: {
          open,
          in_progress,
          resolved,
          completed: resolved,
          total,
          emergency,
          avgResolutionTimeHours: 18.5,
          avgResponseTimeMins: 25,
          byPriority
        },
    });
});

export const getManagerDashboard = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user._id || req.user.id;
    
    await eventBus.publish('manager.dashboard.viewed', { userId, timestamp: new Date().toISOString() }).catch(() => {});
    await eventBus.publish('maintenance.dashboard.loaded', { userId, timestamp: new Date().toISOString() }).catch(() => {});

    const metrics = await maintenanceReportService.getManagerDashboardMetrics(req.query);

    res.status(200).json({
        success: true,
        data: metrics
    });
});

