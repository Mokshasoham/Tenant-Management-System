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
    } else if (user.role === 'technician') {
        filter.assignedTo = userId;
    }

    if (req.query.assignedTechnicianId) {
        filter.assignedTo = req.query.assignedTechnicianId;
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
    const { score, rating, feedback, comment, tags, wouldRecommend } = req.body;

    const finalScore = Number(rating || score);
    if (!finalScore || finalScore < 1 || finalScore > 5) {
        throw new AppError('Rating score must be between 1 and 5', 400);
    }

    const ratingData = {
        score: finalScore,
        rating: finalScore,
        feedback: comment || feedback || '',
        comment: comment || feedback || '',
        tags: Array.isArray(tags) ? tags : [],
        wouldRecommend: typeof wouldRecommend === 'boolean' ? wouldRecommend : true
    };

    const updated = await maintenanceService.addRating(id, ratingData, req.user);
    res.status(200).json({ success: true, message: 'Feedback submitted successfully', data: updated });
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

export const addInternalNote = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { text, attachmentUrl } = req.body;
    if (!text?.trim()) throw new AppError('Internal note text is required', 400);

    const request = await maintenanceService.addInternalNote(id, text, req.user, attachmentUrl);
    res.status(201).json({ success: true, message: 'Internal note added', data: request });
});

export const escalateTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason?.trim()) throw new AppError('Escalation reason is required', 400);

    const request = await maintenanceService.escalateTicket(id, reason, req.user);
    res.status(200).json({ success: true, message: 'Ticket escalated to emergency', data: request });
});

export const mergeTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { targetId } = req.body;
    if (!targetId) throw new AppError('Target ticket ID is required', 400);

    const request = await maintenanceService.mergeTicket(id, targetId, req.user);
    res.status(200).json({ success: true, message: 'Ticket merged successfully', data: request });
});

export const updateCosts = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const costData = req.body;

    const request = await maintenanceService.updateCostTracking(id, costData, req.user);
    res.status(200).json({ success: true, message: 'Cost tracking updated', data: request });
});

export const getAuditTrail = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const request = await maintenanceRepository.findById(id);
    if (!request) throw new AppError('Request not found', 404);

    res.status(200).json({
        success: true,
        data: request.auditTrail || []
    });
});

export const getRelatedTickets = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const request = await maintenanceRepository.findById(id);
    if (!request) throw new AppError('Request not found', 404);

    const filter = {
        _id: { $ne: id },
        $or: [
            { property: request.property?._id },
            { unit: request.unit },
            { requestedBy: request.requestedBy?._id }
        ]
    };

    const related = await maintenanceRepository.findWithFilters(filter, 0, 10);
    res.status(200).json({
        success: true,
        data: related
    });
});

export const updateChecklist = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const checklistData = req.body;

    const request = await maintenanceService.updateChecklist(id, checklistData, req.user);
    res.status(200).json({ success: true, message: 'Completion checklist updated', data: request });
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

export const uploadPhasePhotos = asyncHandler(async (req, res) => {
    const { id, phase } = req.params;
    if (!['before', 'during', 'after'].includes(phase)) {
        throw new AppError("Photo phase must be 'before', 'during', or 'after'", 400);
    }

    const Maintenance = (await import('../models/Maintenance.js')).default;
    const storageProvider = (await import('../platform/storage/storageProvider.js')).default;
    const FileStorage = (await import('../models/FileStorage.js')).default;

    const ticket = await Maintenance.findById(id);
    if (!ticket) throw new AppError('Maintenance ticket not found', 404);

    if (phase === 'after') {
        const hasBefore = (ticket.beforePhotos && ticket.beforePhotos.length > 0) || (ticket.attachments && ticket.attachments.length > 0);
        if (!hasBefore) {
            throw new AppError("Cannot upload 'after' photos without at least one 'before' photo", 400);
        }
    }

    const files = req.files || (req.file ? [req.file] : []);
    if (!files.length) throw new AppError('No files uploaded', 400);

    const uploadedRecords = [];
    for (const file of files) {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filename = `${phase}_${id}_${timestamp}_${safeName}`;
        const result = await storageProvider.upload(file.buffer, filename, file.mimetype, 'maintenance');

        // Store file buffer into MongoDB FileStorage collection for permanent fallback serving
        try {
            await FileStorage.findOneAndUpdate(
                { filename },
                {
                    filename,
                    category: 'maintenance',
                    mimeType: file.mimetype,
                    size: file.size,
                    data: file.buffer,
                    uploadedAt: new Date()
                },
                { upsert: true, new: true }
            );
        } catch (dbErr) {
            console.warn('[uploadPhasePhotos] FileStorage DB backup warning:', dbErr.message);
        }

        const record = {
            url: result.url,
            filename: file.originalname,
            mimeType: file.mimetype,
            fileSizeBytes: file.size,
            uploadedAt: new Date()
        };
        uploadedRecords.push(record);
    }

    if (!ticket.beforePhotos) ticket.beforePhotos = [];
    if (!ticket.duringPhotos) ticket.duringPhotos = [];
    if (!ticket.afterPhotos) ticket.afterPhotos = [];

    const fieldName = `${phase}Photos`;
    ticket[fieldName].push(...uploadedRecords);
    if (!ticket.images) ticket.images = [];
    ticket.images.push(...uploadedRecords.map(r => r.url));

    if (!ticket.fieldChecklist) ticket.fieldChecklist = {};
    ticket.fieldChecklist.photosTaken = { done: true, at: new Date() };

    await ticket.save();

    res.status(200).json({
        success: true,
        message: `${phase.toUpperCase()} photos uploaded successfully`,
        data: ticket
    });
});

export const deletePhasePhoto = asyncHandler(async (req, res) => {
    const { id, phase } = req.params;
    const { photoUrl } = req.body;
    if (!['before', 'during', 'after'].includes(phase)) {
        throw new AppError("Photo phase must be 'before', 'during', or 'after'", 400);
    }
    if (!photoUrl) throw new AppError('Photo URL is required for deletion', 400);

    const Maintenance = (await import('../models/Maintenance.js')).default;
    const ticket = await Maintenance.findById(id);
    if (!ticket) throw new AppError('Maintenance ticket not found', 404);

    const fieldName = `${phase}Photos`;
    if (Array.isArray(ticket[fieldName])) {
        ticket[fieldName] = ticket[fieldName].filter(p => {
            const pUrl = typeof p === 'string' ? p : p.url;
            return pUrl !== photoUrl && !pUrl?.endsWith(photoUrl) && !photoUrl?.endsWith(pUrl);
        });
    }

    if (Array.isArray(ticket.images)) {
        ticket.images = ticket.images.filter(img => img !== photoUrl && !img?.endsWith(photoUrl) && !photoUrl?.endsWith(img));
    }

    await ticket.save();

    res.status(200).json({
        success: true,
        message: `${phase.toUpperCase()} photo deleted successfully`,
        data: ticket
    });
});

export const overrideCheckInGps = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason?.trim()) throw new AppError('Override reason is required', 400);

    const managerId = req.user.userId || req.user._id || req.user.id;
    const Maintenance = (await import('../models/Maintenance.js')).default;

    const ticket = await Maintenance.findById(id);
    if (!ticket) throw new AppError('Ticket not found', 404);

    if (!ticket.checkIn) {
        ticket.checkIn = { time: new Date() };
    }

    const previousStatus = ticket.checkIn.gpsVerificationStatus || 'GPS_UNAVAILABLE';
    ticket.checkIn.isGpsVerified = true;
    ticket.checkIn.gpsVerificationStatus = 'MANUAL_OVERRIDE';
    ticket.checkIn.manualOverrideBy = managerId;
    ticket.checkIn.manualOverrideReason = reason;
    ticket.checkIn.manualOverrideAt = new Date();

    ticket.auditTrail.push({
        field: 'checkIn.gpsVerificationStatus',
        oldValue: previousStatus,
        newValue: `MANUAL_OVERRIDE (Reason: ${reason})`,
        changedBy: managerId,
        changedAt: new Date()
    });

    await ticket.save();

    res.status(200).json({
        success: true,
        message: 'GPS check-in overridden successfully by manager',
        data: ticket
    });
});

export const saveSignature = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { technicianSignature, tenantSignature, gpsAtSigning, deviceId, tenantName, technicianName } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const Maintenance = (await import('../models/Maintenance.js')).default;
    const ticket = await Maintenance.findById(id);
    if (!ticket) throw new AppError('Ticket not found', 404);

    if (!ticket.signature) ticket.signature = {};

    const extractDataUrl = (sig) => {
        if (!sig) return null;
        if (typeof sig === 'string') return sig;
        if (typeof sig === 'object' && sig.dataUrl) return sig.dataUrl;
        return null;
    };

    const techUrl = extractDataUrl(technicianSignature);
    if (techUrl) {
        ticket.signature.technicianSignature = {
            dataUrl: techUrl,
            signedAt: (typeof technicianSignature === 'object' && technicianSignature?.signedAt) ? new Date(technicianSignature.signedAt) : new Date()
        };
    }

    const tenantUrl = extractDataUrl(tenantSignature);
    if (tenantUrl) {
        ticket.signature.tenantSignature = {
            dataUrl: tenantUrl,
            signedBy: (typeof tenantSignature === 'object' && tenantSignature?.signedBy) || tenantName || 'Tenant',
            signedAt: (typeof tenantSignature === 'object' && tenantSignature?.signedAt) ? new Date(tenantSignature.signedAt) : new Date()
        };
    }

    if (gpsAtSigning && typeof gpsAtSigning === 'object' && (gpsAtSigning.latitude || gpsAtSigning.longitude)) {
        ticket.signature.gpsAtSigning = {
            latitude: Number(gpsAtSigning.latitude || 0),
            longitude: Number(gpsAtSigning.longitude || 0),
            accuracy: Number(gpsAtSigning.accuracy || 0)
        };
    }

    ticket.signature.deviceId = deviceId || req.headers['x-device-id'] || ticket.signature.deviceId || 'web';
    ticket.signature.ipAddress = ipAddress;

    if (!ticket.fieldChecklist) ticket.fieldChecklist = {};
    ticket.fieldChecklist.signatureCollected = { done: true, at: new Date() };

    await ticket.save();

    res.status(200).json({
        success: true,
        message: 'Legal-grade digital signature captured successfully',
        data: ticket
    });
});

export const uploadVoiceNote = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { durationSeconds = 0, transcript = '' } = req.body;

    const Maintenance = (await import('../models/Maintenance.js')).default;
    const storageProvider = (await import('../platform/storage/storageProvider.js')).default;

    const ticket = await Maintenance.findById(id);
    if (!ticket) throw new AppError('Ticket not found', 404);

    const file = req.file || (req.files && req.files[0]);
    if (!file) throw new AppError('No audio file uploaded', 400);

    const timestamp = Date.now();
    const filename = `voicenote_${id}_${timestamp}.webm`;
    const result = await storageProvider.upload(file.buffer, filename, file.mimetype || 'audio/webm', 'maintenance');

    const voiceNoteRecord = {
        url: result.url,
        filename: file.originalname || filename,
        mimeType: file.mimetype || 'audio/webm',
        fileSizeBytes: file.size,
        durationSeconds: Number(durationSeconds),
        transcript: transcript.trim(),
        uploadedAt: new Date()
    };

    if (!ticket.voiceNotes) ticket.voiceNotes = [];
    ticket.voiceNotes.push(voiceNoteRecord);

    if (!ticket.fieldChecklist) ticket.fieldChecklist = {};
    if (transcript) ticket.fieldChecklist.notesAdded = { done: true, at: new Date() };

    await ticket.save();

    res.status(200).json({
        success: true,
        message: 'Voice note uploaded with transcript',
        data: ticket
    });
});

export const assignTechnician = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { technicianId, scheduledDate, scheduledTimeSlot } = req.body;

    const Maintenance = (await import('../models/Maintenance.js')).default;
    const User = (await import('../models/User.js')).default;

    const ticket = await Maintenance.findById(id);
    if (!ticket) throw new AppError('Ticket not found', 404);

    if (technicianId) {
        const tech = await User.findById(technicianId);
        if (!tech) throw new AppError('Technician user not found', 404);
        ticket.assignedTo = technicianId;
        ticket.status = 'technician_assigned';
    }

    if (scheduledDate) ticket.scheduledDate = scheduledDate;
    if (scheduledTimeSlot) ticket.requestedTimeSlot = scheduledTimeSlot;

    ticket.auditTrail.push({
        field: 'assignedTo',
        oldValue: ticket.assignedTo ? String(ticket.assignedTo) : 'Unassigned',
        newValue: String(technicianId),
        changedBy: req.user.userId || req.user._id,
        changedAt: new Date()
    });

    await ticket.save();
    const updated = await Maintenance.findById(id).populate('assignedTo', 'firstName lastName email phone').populate('property');

    res.status(200).json({
        success: true,
        message: 'Technician assigned successfully',
        data: updated
    });
});

export const searchTechnicianData = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const userId = req.user.userId || req.user._id || req.user.id;

    if (!q || !q.trim()) {
        return res.status(200).json({
            success: true,
            jobs: [],
            properties: [],
            schedule: [],
            units: []
        });
    }

    const regex = new RegExp(q.trim(), 'i');
    const Maintenance = (await import('../models/Maintenance.js')).default;
    const Property = (await import('../models/Property.js')).default;

    const requests = await Maintenance.find({
        $and: [
            { $or: [{ assignedTo: userId }, { requestedBy: userId }] },
            {
                $or: [
                    { title: regex },
                    { description: regex },
                    { category: regex },
                    { priority: regex },
                    { status: regex },
                    { ticketNumber: regex }
                ]
            }
        ]
    }).populate('property', 'name city address').limit(15);

    const propertyIds = [...new Set(requests.map(r => r.property?._id).filter(Boolean))];
    const properties = await Property.find({
        $or: [
            { _id: { $in: propertyIds } },
            { name: regex },
            { city: regex },
            { address: regex }
        ]
    }).limit(10);

    const jobs = requests.map(r => ({
        _id: r._id,
        title: r.title,
        ticketNumber: r.ticketNumber || String(r._id).slice(-6),
        priority: r.priority,
        status: r.status,
        category: r.category,
        propertyName: r.property?.name || 'Assigned Property',
        unit: r.unit || 'N/A',
        createdAt: r.createdAt
    }));

    const schedule = requests
        .filter(r => r.requestedVisitDate || r.scheduledDate)
        .map(r => ({
            _id: r._id,
            title: r.title,
            scheduledDate: r.requestedVisitDate || r.scheduledDate,
            propertyName: r.property?.name || 'Assigned Property',
            unit: r.unit || 'N/A',
            priority: r.priority
        }));

    const units = requests
        .filter(r => r.unit && regex.test(r.unit))
        .map(r => ({
            unitNumber: r.unit,
            propertyName: r.property?.name || 'Property',
            requestId: r._id,
            title: r.title
        }));

    res.status(200).json({
        success: true,
        jobs,
        properties: properties.map(p => ({ _id: p._id, name: p.name, city: p.city, address: p.address })),
        schedule,
        units
    });
});





