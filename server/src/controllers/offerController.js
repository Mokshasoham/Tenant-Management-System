import Offer from '../models/Offer.js';
import Property from '../models/Property.js';
import NotificationModel from '../models/Notification.js';
import EventService from '../services/eventService.js';
import logger from '../utils/logger.js';

// Backward-compatible Event proxy
const Notification = {
    create: async (data) => {
        try {
            return await EventService.publish({
                recipient: data.recipient,
                category: 'booking',
                event: 'offer_update',
                title: data.title,
                description: data.message,
                sourceModule: 'booking',
                entityType: data.relatedModel || 'Offer',
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
import { AppError, asyncHandler } from '../utils/errorHandling.js';

// POST /api/offers — tenant sends rent offer to manager
export const createOffer = asyncHandler(async (req, res) => {
    const { propertyId, offeredRent, message, startDate, endDate } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found', 404);

    const managerId = property.manager || property.owner;

    // Expire any existing pending offer from this user for this property
    await Offer.updateMany(
        { property: propertyId, fromUser: req.user.userId, status: 'pending' },
        { status: 'expired' }
    );

    const offer = await Offer.create({
        property: propertyId,
        fromUser: req.user.userId,
        toUser: managerId,
        originalRent: property.rentAmount,
        offeredRent,
        message,
        startDate,
        endDate,
    });

    // Notify manager
    await Notification.create({
        recipient: managerId,
        sender: req.user.userId,
        title: 'New Rent Negotiation Offer',
        message: `A tenant has offered ₹${offeredRent.toLocaleString('en-IN')} for ${property.name} (original: ₹${property.rentAmount.toLocaleString('en-IN')}).`,
        type: 'booking',
        link: `/properties/${propertyId}`,
    });

    res.status(201).json({ success: true, data: offer });
});

// GET /api/offers/property/:propertyId — get offers for a property (manager)
export const getPropertyOffers = asyncHandler(async (req, res) => {
    const offers = await Offer.find({ property: req.params.propertyId })
        .populate('fromUser', 'firstName lastName email')
        .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: offers });
});

// GET /api/offers/my — get my sent offers (tenant)
export const getMyOffers = asyncHandler(async (req, res) => {
    const offers = await Offer.find({ fromUser: req.user.userId })
        .populate('property', 'name address images rentAmount')
        .populate('toUser', 'firstName lastName')
        .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: offers });
});

// PUT /api/offers/:id/respond — manager accepts, rejects, or counters
export const respondToOffer = asyncHandler(async (req, res) => {
    const { action, counterRent, counterMessage } = req.body;
    const offer = await Offer.findById(req.params.id).populate('property');
    if (!offer) throw new AppError('Offer not found', 404);

    const isManager = offer.toUser.toString() === req.user.userId;
    if (!isManager && req.user.role !== 'admin') throw new AppError('Not authorized', 403);

    if (action === 'accept') {
        offer.status = 'accepted';
    } else if (action === 'reject') {
        offer.status = 'rejected';
    } else if (action === 'counter') {
        if (!counterRent) throw new AppError('Counter rent is required', 400);
        offer.status = 'countered';
        offer.counterOffer = { rent: counterRent, message: counterMessage, createdAt: new Date() };
    } else {
        throw new AppError('Invalid action', 400);
    }

    await offer.save();

    // Notify tenant
    const msgs = {
        accept: `Your rent offer of ₹${offer.offeredRent.toLocaleString('en-IN')} for ${offer.property?.name} has been accepted!`,
        reject: `Your rent offer for ${offer.property?.name} was declined.`,
        counter: `Manager countered with ₹${counterRent?.toLocaleString('en-IN')} for ${offer.property?.name}.`,
    };
    await Notification.create({
        recipient: offer.fromUser,
        sender: req.user.userId,
        title: `Offer ${action === 'counter' ? 'Countered' : action === 'accept' ? 'Accepted' : 'Rejected'}`,
        message: msgs[action],
        type: action === 'accept' ? 'success' : action === 'counter' ? 'booking' : 'alert',
        link: `/properties/${offer.property?._id}`,
    });

    res.status(200).json({ success: true, data: offer });
});
