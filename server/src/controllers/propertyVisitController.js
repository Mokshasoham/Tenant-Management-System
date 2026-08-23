import PropertyVisit from '../models/PropertyVisit.js';
import Property from '../models/Property.js';
import NotificationModel from '../models/Notification.js';
import EventService from '../services/eventService.js';
import Review from '../models/Review.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';

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

// Tenant requests a property visit
export const requestVisit = asyncHandler(async (req, res) => {
    const { propertyId, visitDate, timeSlot } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) {
        throw new AppError('Property not found', 404);
    }

    // Check for existing pending/approved visit by this tenant for this property
    const existing = await PropertyVisit.findOne({
        property: propertyId,
        tenant: req.user.userId,
        status: { $in: ['pending', 'approved'] }
    });

    if (existing) {
        throw new AppError('You already have a scheduled or pending visit request for this property', 400);
    }

    const visit = await PropertyVisit.create({
        property: propertyId,
        tenant: req.user.userId,
        manager: property.manager || property.owner,
        visitDate: new Date(visitDate),
        timeSlot,
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
        data: visit
    });
});

// Tenant gets their visit requests
export const getMyVisits = asyncHandler(async (req, res) => {
    const visits = await PropertyVisit.find({ tenant: req.user.userId })
        .populate('property', 'name address media')
        .populate('manager', 'firstName lastName email')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: visits
    });
});

import { getAuthenticatedUserId, getManagerPropertyIds } from '../utils/managerHelper.js';

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

    res.status(200).json({
        success: true,
        data: visits
    });
});

// Manager updates visit status (approve, reject, reschedule, mark completed)
export const updateVisitStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = getAuthenticatedUserId(req);
    const { status, visitDate, timeSlot } = req.body;

    const visit = await PropertyVisit.findById(id).populate('property');
    if (!visit) {
        throw new AppError('Property visit not found', 404);
    }

    if (req.user?.role === 'manager') {
        const propIds = await getManagerPropertyIds(userId);
        const isManager = visit.manager?.toString() === userId?.toString() || propIds.map(String).includes(visit.property?._id?.toString());
        if (!isManager && req.user.role !== 'admin') {
            throw new AppError('Forbidden: Access denied to update this visit', 403);
        }
    }

    if (status) visit.status = status;
    if (visitDate) visit.visitDate = new Date(visitDate);
    if (timeSlot) visit.timeSlot = timeSlot;

    await visit.save();

    // Notify tenant
    try {
        let msg = `Your visit request for "${visit.property.name}" has been ${visit.status}.`;
        if (status === 'approved' && visitDate) {
            msg = `Your visit request for "${visit.property.name}" has been scheduled for ${new Date(visit.visitDate).toLocaleDateString()} at ${visit.timeSlot}.`;
        }
        await Notification.create({
            recipient: visit.tenant,
            type: 'booking',
            title: `Property Visit Update: ${visit.status.toUpperCase()}`,
            message: msg,
            relatedId: visit._id,
            relatedModel: 'Property'
        });
    } catch (err) {
        logger.error('Failed to notify tenant of visit status update:', err);
    }

    res.status(200).json({
        success: true,
        message: `Property visit status updated to ${visit.status}`,
        data: visit
    });
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
        data: visit
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
        data: visit
    });
});
