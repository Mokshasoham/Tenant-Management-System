import maintenanceService from '../services/maintenanceService.js';
import maintenanceRepository from '../repositories/maintenanceRepository.js';
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
    const { page = 1, limit = 20, status, priority, category } = req.query;
    const user = req.user;
    const filter = {};

    const userId = user.userId || user._id || user.id;

    if (user.role === 'tenant') {
        filter.requestedBy = userId;
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
        maintenanceRepository.findWithFilters(filter, skip, parseInt(limit)),
        maintenanceRepository.countWithFilters(filter),
    ]);

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

export const updateRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.status === 'resolved') {
        updateData.resolvedAt = new Date();
    }

    const request = await maintenanceRepository.update(id, updateData);
    if (!request) throw new AppError('Request not found', 404);

    res.status(200).json({ success: true, message: 'Request updated', data: request });
});

export const addNote = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user.userId || req.user._id || req.user.id;

    if (!text?.trim()) throw new AppError('Note text is required', 400);

    const request = await maintenanceRepository.update(
        id,
        { $push: { notes: { text, addedBy: userId } } }
    );

    if (!request) throw new AppError('Request not found', 404);

    res.status(200).json({ success: true, message: 'Note added', data: request });
});

export const deleteRequest = asyncHandler(async (req, res) => {
    const request = await maintenanceRepository.delete(req.params.id);
    if (!request) throw new AppError('Request not found', 404);
    res.status(200).json({ success: true, message: 'Request deleted' });
});

export const getStats = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user._id || req.user.id;
    const filter = req.user.role === 'tenant' ? { requestedBy: userId } : {};

    const [open, in_progress, resolved, total] = await Promise.all([
        maintenanceRepository.countWithFilters({ ...filter, status: 'open' }),
        maintenanceRepository.countWithFilters({ ...filter, status: 'in_progress' }),
        maintenanceRepository.countWithFilters({ ...filter, status: 'resolved' }),
        maintenanceRepository.countWithFilters(filter),
    ]);

    const byPriority = await maintenanceRepository.aggregateByPriority(filter);

    res.status(200).json({
        success: true,
        data: { open, in_progress, resolved, total, byPriority },
    });
});
