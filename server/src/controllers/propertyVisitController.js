import PropertyVisit from '../models/PropertyVisit.js';
import Property from '../models/Property.js';
import NotificationModel from '../models/Notification.js';
import EventService from '../services/eventService.js';
import Review from '../models/Review.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import { getAuthenticatedUserId, getManagerPropertyIds } from '../utils/managerHelper.js';
import {
    calculateSlotInstants,
    isSlotInFuture,
    isSlotExpired,
    DEFAULT_TIMEZONE
} from '../utils/visitTimeHelper.js';

// Backward-compatible Event proxy
const Notification = {
    create: async (data) => {
        try {
            return await EventService.publish({
                recipient: data.recipient,
                category: 'booking',
                event: 'visit_update',
                title: data.title,
                description: data.message,
                sourceModule: 'booking',
                entityType: data.relatedModel || 'PropertyVisit',
                entityId: data.relatedId,
                redirectUrl: data.link || '/dashboard',
                action: 'view',
                priority: 'medium',
                severity: 'information',
                metadata: {
                    relatedId: data.relatedId
                }
            });
        } catch (err) {
            logger.error('[Notification Wrapper] Failed: ' + err.message);
            return await NotificationModel.create(data);
        }
    },
    find: (...args) => NotificationModel.find(...args),
    findOne: (...args) => NotificationModel.findOne(...args),
    findOneAndUpdate: (...args) => NotificationModel.findOneAndUpdate(...args),
    updateMany: (...args) => NotificationModel.updateMany(...args),
    countDocuments: (...args) => NotificationModel.countDocuments(...args),
    findOneAndDelete: (...args) => NotificationModel.findOneAndDelete(...args)
};

/**
 * Helper to dynamically enrich a visit document/object with computed expiration flags
 * for legacy records and API consumers.
 */
export const enrichVisit = (visitDoc) => {
    const obj = visitDoc.toObject ? visitDoc.toObject({ virtuals: true }) : { ...visitDoc };
    const tz = obj.timezone || DEFAULT_TIMEZONE;

    // Populate slotStartTime & slotEndTime if missing on legacy records
    if (!obj.slotStartTime && obj.visitDate && obj.timeSlot) {
        const calculated = calculateSlotInstants({
            visitDate: obj.visitDate,
            timeSlot: obj.timeSlot,
            timezone: tz
        });
        if (calculated) {
            obj.slotStartTime = calculated.slotStartTime;
            obj.slotEndTime = calculated.slotEndTime;
        }
    }

    obj.isExpired = isSlotExpired({
        slotStartTime: obj.slotStartTime,
        visitDate: obj.visitDate,
        timeSlot: obj.timeSlot,
        timezone: tz
    });

    if (obj.status === 'reschedule_pending' && obj.rescheduledSlot) {
        if (!obj.rescheduledSlot.slotStartTime && obj.rescheduledSlot.visitDate && obj.rescheduledSlot.timeSlot) {
            const calculatedResched = calculateSlotInstants({
                visitDate: obj.rescheduledSlot.visitDate,
                timeSlot: obj.rescheduledSlot.timeSlot,
                timezone: tz
            });
            if (calculatedResched) {
                obj.rescheduledSlot.slotStartTime = calculatedResched.slotStartTime;
                obj.rescheduledSlot.slotEndTime = calculatedResched.slotEndTime;
            }
        }
        obj.isRescheduleExpired = isSlotExpired({
            slotStartTime: obj.rescheduledSlot?.slotStartTime,
            visitDate: obj.rescheduledSlot?.visitDate,
            timeSlot: obj.rescheduledSlot?.timeSlot,
            timezone: tz
        });
    }

    return obj;
};

// Tenant requests a property visit
export const requestVisit = asyncHandler(async (req, res) => {
    const { propertyId, visitDate, timeSlot, timezone = DEFAULT_TIMEZONE } = req.body;

    if (!propertyId) {
        throw new AppError('Property ID is required', 400);
    }
    if (!visitDate) {
        throw new AppError('Preferred visit date is required', 400);
    }
    if (!timeSlot) {
        throw new AppError('Preferred time slot is required', 400);
    }

    // Validate slot syntax and compute UTC instants
    const slotInstants = calculateSlotInstants({ visitDate, timeSlot, timezone });
    if (!slotInstants) {
        throw new AppError('Invalid visit date or time slot format. Please select a valid slot.', 400);
    }

    // Enforce future visit requirement
    if (!isSlotInFuture({ slotStartTime: slotInstants.slotStartTime })) {
        throw new AppError('Visit slot must be in the future. The selected date or time has already passed.', 400);
    }

    const property = await Property.findById(propertyId);
    if (!property) {
        throw new AppError('Property not found', 404);
    }

    // Check for existing active or upcoming visit by this tenant for this property
    const existingVisits = await PropertyVisit.find({
        property: propertyId,
        tenant: req.user.userId,
        status: { $in: ['pending', 'approved', 'reschedule_pending'] }
    });

    const hasActiveFutureVisit = existingVisits.some(v => {
        // If visit is reschedule_pending, check proposed slot or original slot
        if (v.status === 'reschedule_pending' && v.rescheduledSlot?.visitDate) {
            return isSlotInFuture({
                slotStartTime: v.rescheduledSlot.slotStartTime,
                visitDate: v.rescheduledSlot.visitDate,
                timeSlot: v.rescheduledSlot.timeSlot,
                timezone: v.timezone || timezone
            });
        }
        return isSlotInFuture({
            slotStartTime: v.slotStartTime,
            visitDate: v.visitDate,
            timeSlot: v.timeSlot,
            timezone: v.timezone || timezone
        });
    });

    if (hasActiveFutureVisit) {
        throw new AppError('You already have an active or pending visit request for this property', 400);
    }

    const visit = await PropertyVisit.create({
        property: propertyId,
        tenant: req.user.userId,
        manager: property.manager || property.owner,
        visitDate: new Date(visitDate),
        timeSlot,
        slotStartTime: slotInstants.slotStartTime,
        slotEndTime: slotInstants.slotEndTime,
        timezone: slotInstants.timezone,
        originalVisitDate: new Date(visitDate),
        originalTimeSlot: timeSlot,
        status: 'pending'
    });

    // Notify manager
    try {
        await Notification.create({
            recipient: property.manager || property.owner,
            type: 'booking',
            title: 'New Property Visit Request',
            message: `A tenant has requested to visit "${property.name}" on ${new Date(visitDate).toLocaleDateString()} at ${timeSlot}.`,
            relatedId: visit._id,
            relatedModel: 'Property'
        });
    } catch (err) {
        logger.error('Failed to notify manager of visit request:', err);
    }

    res.status(201).json({
        success: true,
        message: 'Property visit request submitted successfully',
        data: enrichVisit(visit)
    });
});

// Tenant gets their visit requests
export const getMyVisits = asyncHandler(async (req, res) => {
    const visits = await PropertyVisit.find({ tenant: req.user.userId })
        .populate('property', 'name address media')
        .populate('manager', 'firstName lastName email')
        .sort({ createdAt: -1 });

    const enriched = visits.map(enrichVisit);

    res.status(200).json({
        success: true,
        data: enriched
    });
});

// Manager gets visit requests
export const getManagerVisits = asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const propIds = await getManagerPropertyIds(userId);
    const visits = await PropertyVisit.find({
        $or: [
            { manager: userId },
            { property: { $in: propIds } }
        ]
    })
        .populate('property', 'name address media')
        .populate('tenant', 'firstName lastName email')
        .sort({ createdAt: -1 });

    const enriched = visits.map(enrichVisit);

    res.status(200).json({
        success: true,
        data: enriched
    });
});

// Manager updates visit status (approve, reject, mark completed)
export const updateVisitStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = getAuthenticatedUserId(req);
    const { status, visitDate, timeSlot, timezone = DEFAULT_TIMEZONE } = req.body;

    const visit = await PropertyVisit.findById(id).populate('property');
    if (!visit) {
        throw new AppError('Property visit not found', 404);
    }

    // Authorization guard
    if (req.user?.role === 'manager') {
        const propIds = await getManagerPropertyIds(userId);
        const isManager = visit.manager?.toString() === userId?.toString() ||
            propIds.map(String).includes(visit.property?._id?.toString());
        if (!isManager && req.user.role !== 'admin') {
            throw new AppError('Forbidden: Access denied to update this visit', 403);
        }
    }

    // Terminal states cannot be altered
    if (['completed', 'cancelled'].includes(visit.status)) {
        throw new AppError(`Cannot update a visit that has already been ${visit.status}`, 400);
    }

    // Specific Status Transition Rules
    if (status === 'approved') {
        // Idempotent approval
        if (visit.status === 'approved') {
            return res.status(200).json({
                success: true,
                message: 'Property visit is already approved',
                data: enrichVisit(visit)
            });
        }

        // Cannot directly approve if a reschedule proposal is pending tenant confirmation
        if (visit.status === 'reschedule_pending') {
            throw new AppError('Cannot approve visit while a reschedule proposal is pending tenant confirmation. Wait for tenant or propose another time.', 400);
        }

        // Reject if visit is already rejected
        if (visit.status === 'rejected') {
            throw new AppError('Cannot approve a visit request that was previously rejected. Please ask the tenant to submit a new request or propose a reschedule.', 400);
        }

        // Target slot validation: if manager passes updated visitDate/timeSlot, use that, else use existing
        const targetDate = visitDate || visit.visitDate;
        const targetSlot = timeSlot || visit.timeSlot;
        const targetTz = timezone || visit.timezone || DEFAULT_TIMEZONE;

        const calculated = calculateSlotInstants({
            visitDate: targetDate,
            timeSlot: targetSlot,
            timezone: targetTz
        });

        if (!calculated || !isSlotInFuture({ slotStartTime: calculated.slotStartTime })) {
            throw new AppError(
                'Cannot approve an expired visit request. The requested visit time has already passed. Please propose a new time slot instead.',
                400
            );
        }

        // Atomic transition to prevent race condition approvals
        const updated = await PropertyVisit.findOneAndUpdate(
            { _id: id, status: 'pending' },
            {
                $set: {
                    status: 'approved',
                    visitDate: new Date(targetDate),
                    timeSlot: targetSlot,
                    slotStartTime: calculated.slotStartTime,
                    slotEndTime: calculated.slotEndTime,
                    timezone: targetTz
                }
            },
            { new: true }
        ).populate('property');

        if (!updated) {
            // Re-fetch to return accurate state
            const current = await PropertyVisit.findById(id).populate('property');
            if (current.status === 'approved') {
                return res.status(200).json({
                    success: true,
                    message: 'Property visit is already approved',
                    data: enrichVisit(current)
                });
            }
            throw new AppError(`Cannot approve visit request in "${current.status}" state.`, 400);
        }

        // Notify tenant of approval
        try {
            await Notification.create({
                recipient: updated.tenant,
                type: 'booking',
                title: 'Property Visit Approved',
                message: `Your visit request for "${updated.property?.name}" has been scheduled for ${new Date(updated.visitDate).toLocaleDateString()} at ${updated.timeSlot}.`,
                relatedId: updated._id,
                relatedModel: 'Property'
            });
        } catch (err) {
            logger.error('Failed to notify tenant of visit approval:', err);
        }

        return res.status(200).json({
            success: true,
            message: 'Property visit approved and scheduled successfully',
            data: enrichVisit(updated)
        });
    }

    if (status === 'completed') {
        if (visit.status !== 'approved') {
            throw new AppError('Only approved scheduled visits can be marked as completed', 400);
        }

        // Slot must have arrived before it can be marked completed
        const slotHasStarted = !isSlotInFuture({
            slotStartTime: visit.slotStartTime,
            visitDate: visit.visitDate,
            timeSlot: visit.timeSlot,
            timezone: visit.timezone
        });

        if (!slotHasStarted) {
            throw new AppError('Cannot mark visit as completed before the scheduled visit slot has started', 400);
        }

        visit.status = 'completed';
        await visit.save();

        return res.status(200).json({
            success: true,
            message: 'Property visit status updated to completed',
            data: enrichVisit(visit)
        });
    }

    if (status === 'rejected') {
        visit.status = 'rejected';
        await visit.save();

        try {
            await Notification.create({
                recipient: visit.tenant,
                type: 'booking',
                title: 'Property Visit Request Rejected',
                message: `Your visit request for "${visit.property?.name}" has been declined by the property manager.`,
                relatedId: visit._id,
                relatedModel: 'Property'
            });
        } catch (err) {
            logger.error('Failed to notify tenant of visit rejection:', err);
        }

        return res.status(200).json({
            success: true,
            message: 'Property visit status updated to rejected',
            data: enrichVisit(visit)
        });
    }

    if (status === 'cancelled') {
        visit.status = 'cancelled';
        await visit.save();

        return res.status(200).json({
            success: true,
            message: 'Property visit status updated to cancelled',
            data: enrichVisit(visit)
        });
    }

    throw new AppError(`Invalid status update: ${status}`, 400);
});

// Manager proposes a new visit slot for rescheduling
export const proposeReschedule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = getAuthenticatedUserId(req);
    const { visitDate, timeSlot, note = '', timezone = DEFAULT_TIMEZONE } = req.body;

    if (!visitDate) {
        throw new AppError('Proposed visit date is required', 400);
    }
    if (!timeSlot) {
        throw new AppError('Proposed time slot is required', 400);
    }

    const proposedInstants = calculateSlotInstants({ visitDate, timeSlot, timezone });
    if (!proposedInstants) {
        throw new AppError('Invalid proposed date or time slot format', 400);
    }

    if (!isSlotInFuture({ slotStartTime: proposedInstants.slotStartTime })) {
        throw new AppError('Proposed reschedule slot must be strictly in the future', 400);
    }

    const visit = await PropertyVisit.findById(id).populate('property');
    if (!visit) {
        throw new AppError('Property visit not found', 404);
    }

    // Authorization
    if (req.user?.role === 'manager') {
        const propIds = await getManagerPropertyIds(userId);
        const isManager = visit.manager?.toString() === userId?.toString() ||
            propIds.map(String).includes(visit.property?._id?.toString());
        if (!isManager && req.user.role !== 'admin') {
            throw new AppError('Forbidden: Access denied to reschedule this visit', 403);
        }
    }

    // Cannot reschedule completed or cancelled visits
    if (['completed', 'cancelled'].includes(visit.status)) {
        throw new AppError(`Cannot reschedule a visit that has already been ${visit.status}`, 400);
    }

    // Preserve original slot on first reschedule proposal
    if (!visit.originalVisitDate) {
        visit.originalVisitDate = visit.visitDate;
        visit.originalTimeSlot = visit.timeSlot;
    }

    const proposedDateObj = new Date(visitDate);

    // Save reschedule proposal
    visit.rescheduledSlot = {
        visitDate: proposedDateObj,
        timeSlot,
        slotStartTime: proposedInstants.slotStartTime,
        slotEndTime: proposedInstants.slotEndTime,
        proposedBy: userId,
        proposedAt: new Date(),
        status: 'pending',
        note
    };

    visit.status = 'reschedule_pending';

    visit.rescheduleHistory.push({
        previousVisitDate: visit.visitDate,
        previousTimeSlot: visit.timeSlot,
        proposedVisitDate: proposedDateObj,
        proposedTimeSlot: timeSlot,
        action: 'proposed',
        actionBy: userId,
        actionAt: new Date(),
        note
    });

    await visit.save();

    // Notify tenant
    try {
        await Notification.create({
            recipient: visit.tenant,
            type: 'booking',
            title: 'Property Visit Reschedule Proposal',
            message: `The manager has proposed a new time for your visit to "${visit.property?.name}": ${proposedDateObj.toLocaleDateString()} at ${timeSlot}. Please review and confirm.`,
            relatedId: visit._id,
            relatedModel: 'Property'
        });
    } catch (err) {
        logger.error('Failed to notify tenant of reschedule proposal:', err);
    }

    res.status(200).json({
        success: true,
        message: 'Reschedule proposal sent to tenant for confirmation',
        data: enrichVisit(visit)
    });
});

// Tenant responds to reschedule proposal (accept or decline)
export const respondReschedule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { action, reason = '' } = req.body;
    const userId = getAuthenticatedUserId(req);

    if (!['accept', 'decline'].includes(action)) {
        throw new AppError('Action must be either "accept" or "decline"', 400);
    }

    const visit = await PropertyVisit.findById(id).populate('property');
    if (!visit) {
        throw new AppError('Property visit not found', 404);
    }

    // Only the tenant who requested the visit can respond
    if (visit.tenant.toString() !== userId?.toString()) {
        throw new AppError('Unauthorized: Only the tenant can respond to this reschedule proposal', 403);
    }

    if (visit.status !== 'reschedule_pending' || !visit.rescheduledSlot || visit.rescheduledSlot.status !== 'pending') {
        throw new AppError('No pending reschedule proposal found for this visit', 400);
    }

    if (action === 'accept') {
        // Ensure proposed slot is still in the future at the moment of tenant acceptance
        const proposedStart = visit.rescheduledSlot.slotStartTime;
        const proposedDate = visit.rescheduledSlot.visitDate;
        const proposedSlot = visit.rescheduledSlot.timeSlot;

        if (isSlotExpired({
            slotStartTime: proposedStart,
            visitDate: proposedDate,
            timeSlot: proposedSlot,
            timezone: visit.timezone
        })) {
            throw new AppError('The proposed visit slot has already passed and cannot be accepted. Please ask the manager for a new proposal.', 400);
        }

        // Apply new slot and transition to approved
        visit.visitDate = proposedDate;
        visit.timeSlot = proposedSlot;
        visit.slotStartTime = proposedStart;
        visit.slotEndTime = visit.rescheduledSlot.slotEndTime;
        visit.status = 'approved';
        visit.rescheduledSlot.status = 'accepted';

        visit.rescheduleHistory.push({
            previousVisitDate: visit.originalVisitDate,
            previousTimeSlot: visit.originalTimeSlot,
            proposedVisitDate: proposedDate,
            proposedTimeSlot: proposedSlot,
            action: 'accepted',
            actionBy: userId,
            actionAt: new Date(),
            note: reason || 'Accepted by tenant'
        });

        await visit.save();

        // Notify manager
        try {
            await Notification.create({
                recipient: visit.manager,
                type: 'booking',
                title: 'Visit Reschedule Accepted',
                message: `Tenant has accepted the rescheduled visit for "${visit.property?.name}" on ${new Date(visit.visitDate).toLocaleDateString()} at ${visit.timeSlot}.`,
                relatedId: visit._id,
                relatedModel: 'Property'
            });
        } catch (err) {
            logger.error('Failed to notify manager of reschedule acceptance:', err);
        }

        return res.status(200).json({
            success: true,
            message: 'Rescheduled visit confirmed and scheduled successfully',
            data: enrichVisit(visit)
        });
    }

    if (action === 'decline') {
        visit.status = 'cancelled';
        visit.rescheduledSlot.status = 'declined';

        visit.rescheduleHistory.push({
            previousVisitDate: visit.visitDate,
            previousTimeSlot: visit.timeSlot,
            proposedVisitDate: visit.rescheduledSlot.visitDate,
            proposedTimeSlot: visit.rescheduledSlot.timeSlot,
            action: 'declined',
            actionBy: userId,
            actionAt: new Date(),
            note: reason || 'Declined by tenant'
        });

        await visit.save();

        // Notify manager
        try {
            await Notification.create({
                recipient: visit.manager,
                type: 'booking',
                title: 'Visit Reschedule Declined',
                message: `Tenant declined the proposed visit reschedule for "${visit.property?.name}".${reason ? ` Reason: ${reason}` : ''}`,
                relatedId: visit._id,
                relatedModel: 'Property'
            });
        } catch (err) {
            logger.error('Failed to notify manager of reschedule decline:', err);
        }

        return res.status(200).json({
            success: true,
            message: 'Reschedule proposal declined. Visit request cancelled.',
            data: enrichVisit(visit)
        });
    }
});

// Tenant submits visit feedback (mandatory to complete the visit workflow)
export const submitVisitFeedback = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rating, propertyCondition, managerExperience, cleanliness, locationSatisfaction, comments, recommend } = req.body;

    const visit = await PropertyVisit.findById(id).populate('property');
    if (!visit) {
        throw new AppError('Property visit not found', 404);
    }

    if (visit.tenant.toString() !== req.user.userId) {
        throw new AppError('Unauthorized to submit feedback for this visit', 403);
    }

    visit.feedback = {
        rating,
        propertyCondition,
        managerExperience,
        cleanliness,
        locationSatisfaction,
        comments,
        recommend,
        submittedAt: new Date()
    };
    
    // Automatically set status to completed if feedback is submitted
    visit.status = 'completed';
    await visit.save();

    // Optionally publish a public review in MongoDB reviews collection
    try {
        await Review.create({
            property: visit.property._id,
            author: req.user.userId,
            rating,
            comment: comments,
            cleanliness,
            location: locationSatisfaction,
            value: propertyCondition,
            communication: managerExperience,
            verifiedStay: false
        });
    } catch (err) {
        logger.error('Failed to publish public review from visit feedback:', err);
    }

    // Notify manager
    try {
        await Notification.create({
            recipient: visit.manager,
            type: 'booking',
            title: 'New Property Visit Feedback',
            message: `Tenant has submitted feedback and rated their visit for "${visit.property.name}" with a ${rating}/5 star rating.`,
            relatedId: visit._id,
            relatedModel: 'Property'
        });
    } catch (err) {
        logger.error('Failed to notify manager of visit feedback:', err);
    }

    res.status(200).json({
        success: true,
        message: 'Feedback submitted successfully and visit workflow completed.',
        data: enrichVisit(visit)
    });
});

// Tenant decides "Not Interested" after visit
export const setNotInterested = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const visit = await PropertyVisit.findById(id).populate('property');
    if (!visit) {
        throw new AppError('Property visit not found', 404);
    }

    if (visit.tenant.toString() !== req.user.userId) {
        throw new AppError('Unauthorized', 403);
    }

    visit.notInterested = true;
    await visit.save();

    // Notify manager
    try {
        await Notification.create({
            recipient: visit.manager,
            type: 'system',
            title: 'Tenant Not Interested after Visit',
            message: `The tenant who visited "${visit.property.name}" has marked the property as "Not Interested".`,
            relatedId: visit._id,
            relatedModel: 'Property'
        });
    } catch (err) {
        logger.error('Failed to notify manager of Not Interested state:', err);
    }

    res.status(200).json({
        success: true,
        message: 'Status updated to not interested.',
        data: enrichVisit(visit)
    });
});
