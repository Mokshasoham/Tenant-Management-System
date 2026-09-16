import Offer from '../models/Offer.js';
import Property from '../models/Property.js';
import PropertyVisit from '../models/PropertyVisit.js';
import User from '../models/User.js';
import NotificationModel from '../models/Notification.js';
import EventService from '../services/eventService.js';
import logger from '../utils/logger.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import { generateSequenceNumber } from '../platform/sequence/sequenceService.js';
import { NotificationService } from '../services/NotificationService.js';

import { calculateLeaseDuration, formatDateRange } from '../utils/dateDurationHelper.js';

// Centralized notification dispatcher helper for negotiation events
const sendNegotiationNotification = async ({ recipient, sender, title, message, propertyId, offerId, action = 'view', isRecipientTenant = false }) => {
    const targetUrl = isRecipientTenant ? '/my-negotiations' : '/negotiations';
    try {
        await NotificationService.notify({
            recipient,
            sender,
            title,
            message,
            category: 'booking',
            sourceModule: 'booking',
            entityType: 'Offer',
            entityId: offerId,
            actionUrl: targetUrl,
            link: targetUrl,
            priority: 'high',
            severity: 'information',
            metadata: {
                propertyId,
                offerId,
                action
            }
        });
    } catch (err) {
        logger.warn('[Negotiation Notification] Fallback: ' + err.message);
        try {
            await NotificationModel.create({
                recipient,
                sender,
                title,
                message,
                type: 'booking',
                link: targetUrl
            });
        } catch (e) {
            logger.error('[Negotiation Notification] Failed completely: ' + e.message);
        }
    }
};

/**
 * Normalizes offer state at read-time without mutating the database document.
 * Computes explicit turn indicator, roles, round availability, and safely maps history.
 */
export const enrichOfferWithState = (offerDoc, reqUserId) => {
    if (!offerDoc) return offerDoc;
    const offer = offerDoc.toObject ? offerDoc.toObject() : { ...offerDoc };

    const fromUserId = offer.fromUser?._id ? String(offer.fromUser._id) : String(offer.fromUser || '');
    const toUserId = offer.toUser?._id ? String(offer.toUser._id) : String(offer.toUser || '');
    const currentOfferedById = offer.currentOfferedBy?._id ? String(offer.currentOfferedBy._id) : String(offer.currentOfferedBy || '');

    // Determine role of the party who made the current/latest offer
    let currentOfferedByRole = 'tenant';
    if (currentOfferedById && toUserId && currentOfferedById === toUserId) {
        currentOfferedByRole = 'manager';
    } else if (currentOfferedById && fromUserId && currentOfferedById === fromUserId) {
        currentOfferedByRole = 'tenant';
    } else if (offer.offerHistory && offer.offerHistory.length > 0) {
        const lastHist = offer.offerHistory[offer.offerHistory.length - 1];
        currentOfferedByRole = lastHist.senderRole || lastHist.offeredBy || 'tenant';
    }

    // Determine whose turn it is to act
    let currentTurn = 'none';
    if (['pending', 'countered'].includes(offer.status)) {
        if (offer.status === 'pending') {
            currentTurn = 'manager';
        } else if (offer.status === 'countered') {
            currentTurn = currentOfferedByRole === 'manager' ? 'tenant' : 'manager';
        }
    }

    const currentRounds = Number(offer.roundCount) || 1;
    const maxRounds = Number(offer.maxRounds) || 5;
    const roundsRemaining = Math.max(0, maxRounds - currentRounds);
    const isOfferDateExpired = Boolean(offer.expiresAt) && new Date() > new Date(offer.expiresAt);
    const isBookingRejected = Boolean(offer.booking && (offer.booking.status === 'rejected' || offer.bookingStatus === 'rejected'));
    const isExpired = offer.status === 'expired' || isBookingRejected || (isOfferDateExpired && !['rejected', 'cancelled'].includes(offer.status));
    const isAccepted = offer.status === 'accepted' && !isExpired && !isBookingRejected;

    const canTenantRespond = !isExpired && !isAccepted && ['pending', 'countered'].includes(offer.status) && currentTurn === 'tenant';
    const canTenantCounter = canTenantRespond && currentRounds < maxRounds;
    const canTenantAccept = canTenantRespond;

    const canManagerRespond = !isExpired && !isAccepted && ['pending', 'countered'].includes(offer.status) && currentTurn === 'manager';
    const canManagerCounter = canManagerRespond && currentRounds < maxRounds;
    const canManagerAccept = canManagerRespond;

    const activeStart = offer.agreedStartDate || offer.startDate || offer.moveInDate;
    const activeEnd = offer.agreedEndDate || offer.endDate;
    const duration = calculateLeaseDuration(activeStart, activeEnd);
    const durationText = duration?.text || offer.leasePeriod || '12 months';
    const durationDays = duration?.days || null;

    // Normalizing history items safely for read-time presentation
    const normalizedHistory = (offer.offerHistory || []).map((h, idx) => {
        const hObj = h.toObject ? h.toObject() : { ...h };
        const amount = Number(hObj.proposedAmount ?? hObj.amount ?? offer.currentOffer ?? offer.offeredRent ?? 0);
        const timestamp = hObj.timestamp || hObj.offeredAt || hObj.createdAt || offer.createdAt || new Date();
        const role = hObj.senderRole || hObj.offeredBy || (idx === 0 ? 'tenant' : (idx % 2 === 1 ? 'manager' : 'tenant'));
        const message = hObj.message || hObj.note || '';
        const roundNum = Number(hObj.roundNumber) || (idx + 1);

        const hStart = hObj.startDate || (idx === 0 ? (offer.startDate || offer.moveInDate) : offer.startDate);
        const hEnd = hObj.endDate || (idx === 0 ? offer.endDate : offer.endDate);
        const hDur = calculateLeaseDuration(hStart, hEnd);

        return {
            ...hObj,
            roundNumber: roundNum,
            proposedAmount: amount,
            amount: amount,
            senderRole: role,
            offeredBy: role,
            message: message,
            note: message,
            timestamp: timestamp,
            offeredAt: timestamp,
            startDate: hStart,
            endDate: hEnd,
            durationDays: hDur?.days || null,
            durationText: hDur?.text || hObj.leasePeriod || durationText,
            leasePeriod: hDur?.text || hObj.leasePeriod || offer.leasePeriod || '12 months',
            action: hObj.action || (idx === 0 ? 'offer' : 'counter')
        };
    });

    return {
        ...offer,
        startDate: offer.startDate,
        endDate: offer.endDate,
        agreedStartDate: offer.agreedStartDate,
        agreedEndDate: offer.agreedEndDate,
        durationDays,
        durationText,
        agreedDuration: durationText,
        currentOfferedByRole,
        currentTurn,
        roundsRemaining,
        canTenantRespond,
        canTenantCounter,
        canTenantAccept,
        canManagerRespond,
        canManagerCounter,
        canManagerAccept,
        isExpired,
        isAccepted,
        expiredAt: offer.expiredAt,
        expirationReason: offer.expirationReason,
        tenant: offer.fromUser, // alias for convenience
        manager: offer.toUser,  // alias for convenience
        offerHistory: normalizedHistory
    };
};

/**
 * POST /api/offers — Tenant sends rent negotiation offer to property manager
 */
export const createOffer = asyncHandler(async (req, res) => {
    const offeredRent = req.body.offeredRent || req.body.offerAmount || req.body.proposedRent;
    const { propertyId, message, leasePeriod, moveInDate, startDate, endDate } = req.body;
    const userId = req.user.userId || req.user._id || req.user.id;

    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found', 404);

    // 1. Validate property negotiation is enabled
    if (!property.negotiation?.enabled) {
        throw new AppError('Rent negotiation is not available for this property.', 400);
    }

    // 2. Validate tenant serious-eligibility
    if (property.negotiation.availability === 'visit_requested') {
        const approvedVisit = await PropertyVisit.findOne({
            property: propertyId,
            tenant: userId,
            status: { $in: ['approved', 'completed'] }
        });
        if (!approvedVisit) {
            throw new AppError('You must request a visit and have it approved by the manager before negotiating rent for this property.', 403);
        }
    }

    // 3. Enforce single active negotiation per tenant + property
    // Check unexpired active negotiations. Sort by newest first.
    const existingOffers = await Offer.find({
        property: propertyId,
        fromUser: userId,
        status: { $in: ['pending', 'countered', 'accepted'] }
    }).sort({ createdAt: -1 });

    for (const existingActive of existingOffers) {
        // If accepted, check if its linked booking was rejected
        let isLinkedBookingRejected = false;
        if (existingActive.status === 'accepted') {
            const bookingId = existingActive.booking;
            let bDoc = null;
            if (bookingId) {
                bDoc = await Booking.findById(bookingId).select('status rejectionReason updatedAt');
            } else {
                bDoc = await Booking.findOne({ offer: existingActive._id }).select('status rejectionReason updatedAt');
            }
            if (bDoc && bDoc.status === 'rejected') {
                isLinkedBookingRejected = true;
                // Auto-reconcile to expired in DB
                existingActive.status = 'expired';
                existingActive.expiredAt = bDoc.updatedAt || existingActive.expiredAt || new Date();
                existingActive.expirationReason = 'booking_rejected_by_manager';
                const hasExpiredAction = existingActive.offerHistory?.some(h => h.action === 'expired');
                if (!hasExpiredAction) {
                    existingActive.offerHistory.push({
                        sender: existingActive.toUser,
                        senderRole: 'manager',
                        receiver: existingActive.fromUser,
                        proposedAmount: existingActive.agreedRent || existingActive.currentOffer || 0,
                        amount: existingActive.agreedRent || existingActive.currentOffer || 0,
                        startDate: existingActive.agreedStartDate || existingActive.startDate,
                        endDate: existingActive.agreedEndDate || existingActive.endDate,
                        message: `Deal expired: Booking request was declined by manager (${bDoc.rejectionReason || 'No reason provided'})`,
                        timestamp: existingActive.expiredAt,
                        action: 'expired'
                    });
                }
                await existingActive.save();
            }
        }

        if (isLinkedBookingRejected) {
            continue; // Not active, move on to next offer or allow creation
        }

        const isUnexpired = Boolean(existingActive.expiresAt) && new Date() < new Date(existingActive.expiresAt);
        if (existingActive.status === 'accepted') {
            if (isUnexpired) {
                throw new AppError('You already have an active, accepted private deal for this property. Please book it before it expires.', 409);
            }
        } else if (['pending', 'countered'].includes(existingActive.status)) {
            if (isUnexpired) {
                throw new AppError('You already have an active negotiation in progress for this property. Please continue your existing negotiation or wait for manager response.', 409);
            }
        }
    }

    // 4. Validate offer amount against manager constraints
    const numericOfferedRent = Number(offeredRent);
    if (isNaN(numericOfferedRent) || numericOfferedRent <= 0) {
        throw new AppError('A valid monthly offer amount is required.', 400);
    }

    if (numericOfferedRent > property.rentAmount) {
        throw new AppError('Offer amount cannot be higher than the listed public rent.', 400);
    }

    // Reconcile minimum acceptable threshold
    let minAcceptable = property.negotiation.minAcceptableRent;
    if (!minAcceptable && property.negotiation.maxDiscountPercentage) {
        minAcceptable = Math.round(property.rentAmount * (1 - property.negotiation.maxDiscountPercentage / 100));
    }

    if (minAcceptable && numericOfferedRent < minAcceptable) {
        throw new AppError('Your proposed offer is below the acceptable threshold for this property. Please propose a higher amount.', 400);
    }

    const managerId = property.manager || property.owner;
    const validityHours = property.negotiation.offerValidityHours || 48;
    const maxRounds = property.negotiation.maxRounds || 5;
    const expiresAt = new Date(Date.now() + validityHours * 3600 * 1000);

    // Generate atomic Deal Number (DEAL-2026-XXXXXX)
    const dealNumber = await generateSequenceNumber('DEAL', 'deal');

    const effectiveStartDate = startDate ? new Date(startDate) : (moveInDate ? new Date(moveInDate) : new Date());
    const effectiveEndDate = endDate ? new Date(endDate) : undefined;
    const dur = calculateLeaseDuration(effectiveStartDate, effectiveEndDate);
    const effectiveLeasePeriod = dur?.text || leasePeriod || '12 Months';

    const offer = await Offer.create({
        dealNumber,
        property: propertyId,
        fromUser: userId,
        toUser: managerId,
        originalRent: property.rentAmount,
        offeredRent: numericOfferedRent,
        currentOffer: numericOfferedRent,
        currentOfferedBy: userId,
        leasePeriod: effectiveLeasePeriod,
        moveInDate: effectiveStartDate,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        message: message || '',
        status: 'pending',
        roundCount: 1,
        maxRounds,
        expiresAt,
        offerHistory: [
            {
                roundNumber: 1,
                sender: userId,
                senderRole: 'tenant',
                receiver: managerId,
                proposedAmount: numericOfferedRent,
                startDate: effectiveStartDate,
                endDate: effectiveEndDate,
                leasePeriod: effectiveLeasePeriod,
                moveInDate: effectiveStartDate,
                message: message || `Submitted rent offer of ₹${numericOfferedRent.toLocaleString('en-IN')}/mo`,
                timestamp: new Date(),
                action: 'offer'
            }
        ]
    });

    // Notify Manager
    await sendNegotiationNotification({
        recipient: managerId,
        sender: userId,
        title: 'New Rent Negotiation Offer',
        message: `A tenant has offered ₹${numericOfferedRent.toLocaleString('en-IN')}/month for ${property.name} (Listed: ₹${property.rentAmount.toLocaleString('en-IN')}).`,
        propertyId,
        offerId: offer._id,
        action: 'new_offer',
        isRecipientTenant: false
    });

    logger.info(`Rent negotiation offer created: ${dealNumber} for property ${property.name} by user ${userId}`);

    res.status(201).json({
        success: true,
        message: 'Rent negotiation offer submitted successfully',
        data: enrichOfferWithState(offer, userId)
    });
});

/**
 * PUT /api/offers/:id/respond — Respond to an offer (Accept, Counter, Reject, Cancel)
 */
export const respondToOffer = asyncHandler(async (req, res) => {
    const counterRent = req.body.counterRent || req.body.counterOffer || req.body.counterAmount;
    const action = req.body.action || (counterRent ? 'counter' : undefined);
    const { message, counterMessage, leasePeriod, moveInDate, counterStartDate, counterEndDate } = req.body;
    const userId = req.user.userId || req.user._id || req.user.id;
    const userRole = req.user.role || 'tenant';

    const offer = await Offer.findById(req.params.id).populate('property');
    if (!offer) throw new AppError('Negotiation offer not found', 404);

    const property = offer.property;
    const isTenant = String(offer.fromUser) === String(userId);
    const isManager = String(offer.toUser) === String(userId) ||
        String(property?.manager) === String(userId) ||
        String(property?.owner) === String(userId) ||
        userRole === 'admin';

    if (!isTenant && !isManager) {
        throw new AppError('Forbidden: You are not authorized to respond to this negotiation', 403);
    }

    // Concurrency & state machine guard
    if (offer.status === 'accepted') {
        throw new AppError('This private deal has already been accepted and locked.', 400);
    }
    if (['rejected', 'cancelled', 'expired'].includes(offer.status)) {
        throw new AppError('This negotiation has expired or concluded and cannot be modified.', 400);
    }

    // Expiration check
    if (offer.status === 'expired' || (offer.expiresAt && new Date() > new Date(offer.expiresAt))) {
        if (offer.status !== 'expired') {
            offer.status = 'expired';
            offer.expiredAt = new Date();
            offer.expirationReason = 'deal_validity_expired';
            await offer.save();
        }
        throw new AppError('This negotiation offer has expired.', 400);
    }

    // Consecutive offer guard: a party cannot counter or accept their own offer
    if (['accept', 'counter'].includes(action)) {
        if (String(offer.currentOfferedBy) === String(userId)) {
            throw new AppError('You cannot counter or accept your own offer. Please wait for the other party to respond.', 400);
        }
    }

    const validityHours = property?.negotiation?.offerValidityHours || 48;
    const responseMsg = message || counterMessage || '';

    if (action === 'accept') {
        offer.status = 'accepted';
        offer.agreedRent = offer.currentOffer || offer.offeredRent;
        offer.agreedStartDate = offer.startDate || offer.moveInDate;
        offer.agreedEndDate = offer.endDate;
        offer.acceptedBy = userId;
        offer.acceptedAt = new Date();
        // Reset validity window for private deal booking
        offer.expiresAt = new Date(Date.now() + validityHours * 3600 * 1000);

        const dur = calculateLeaseDuration(offer.agreedStartDate, offer.agreedEndDate);
        if (dur) offer.leasePeriod = dur.text;

        offer.offerHistory.push({
            sender: userId,
            senderRole: isManager ? 'manager' : 'tenant',
            receiver: isManager ? offer.fromUser : offer.toUser,
            proposedAmount: offer.agreedRent,
            startDate: offer.agreedStartDate,
            endDate: offer.agreedEndDate,
            message: responseMsg || `Offer accepted at ₹${offer.agreedRent.toLocaleString('en-IN')}/mo. Private deal locked!`,
            roundNumber: offer.roundCount || 1,
            leasePeriod: offer.leasePeriod,
            moveInDate: offer.agreedStartDate,
            timestamp: new Date(),
            action: 'accept'
        });

        await offer.save();

        const recipientId = isManager ? offer.fromUser : offer.toUser;
        await sendNegotiationNotification({
            recipient: recipientId,
            sender: userId,
            title: '🎉 Rent Offer Accepted!',
            message: `Your rent offer of ₹${offer.agreedRent.toLocaleString('en-IN')}/month for ${property.name} has been accepted! Lock your private deal before it expires.`,
            propertyId: property._id,
            offerId: offer._id,
            action: 'deal_accepted',
            isRecipientTenant: isManager
        });

        logger.info(`Deal accepted: ${offer.dealNumber} for ₹${offer.agreedRent} by user ${userId}`);

    } else if (action === 'counter') {
        const numericCounterRent = Number(counterRent);
        if (isNaN(numericCounterRent) || numericCounterRent <= 0) {
            throw new AppError('A valid counter offer amount is required.', 400);
        }

        // Round limit guard
        const currentRounds = offer.roundCount || 1;
        const maxRounds = offer.maxRounds || 5;
        if (currentRounds >= maxRounds) {
            throw new AppError(`Negotiation limit reached (${maxRounds} rounds). Please accept, reject, or submit a new offer.`, 400);
        }

        // If manager is countering, validate against minimum threshold
        if (isManager) {
            let minAcceptable = property?.negotiation?.minAcceptableRent;
            if (!minAcceptable && property?.negotiation?.maxDiscountPercentage) {
                minAcceptable = Math.round(property.rentAmount * (1 - property.negotiation.maxDiscountPercentage / 100));
            }
            if (minAcceptable && numericCounterRent < minAcceptable) {
                throw new AppError(`Counter rent cannot be lower than the configured minimum of ₹${minAcceptable.toLocaleString('en-IN')}.`, 400);
            }
        }

        // Prevent counter exceeding listed public rent
        if (numericCounterRent > property.rentAmount) {
            throw new AppError(`Counter offer cannot exceed the listed public rent of ₹${property.rentAmount.toLocaleString('en-IN')}.`, 400);
        }

        const counterStartDate = req.body.startDate ? new Date(req.body.startDate) : offer.startDate;
        const counterEndDate = req.body.endDate ? new Date(req.body.endDate) : offer.endDate;
        const dur = calculateLeaseDuration(counterStartDate, counterEndDate);
        const effectiveLeasePeriod = dur?.text || leasePeriod || offer.leasePeriod;

        offer.status = 'countered';
        offer.currentOffer = numericCounterRent;
        offer.currentOfferedBy = userId;
        offer.startDate = counterStartDate;
        offer.endDate = counterEndDate;
        offer.moveInDate = counterStartDate;
        offer.leasePeriod = effectiveLeasePeriod;
        offer.roundCount = currentRounds + 1;
        offer.expiresAt = new Date(Date.now() + validityHours * 3600 * 1000);
        offer.counterOffer = {
            rent: numericCounterRent,
            startDate: counterStartDate,
            endDate: counterEndDate,
            message: responseMsg,
            createdAt: new Date()
        };

        offer.offerHistory.push({
            sender: userId,
            senderRole: isManager ? 'manager' : 'tenant',
            receiver: isManager ? offer.fromUser : offer.toUser,
            proposedAmount: numericCounterRent,
            startDate: counterStartDate,
            endDate: counterEndDate,
            message: responseMsg || `Counter-offered ₹${numericCounterRent.toLocaleString('en-IN')}/mo`,
            roundNumber: currentRounds + 1,
            leasePeriod: effectiveLeasePeriod,
            moveInDate: counterStartDate,
            timestamp: new Date(),
            action: 'counter'
        });

        await offer.save();

        const recipientId = isManager ? offer.fromUser : offer.toUser;
        await sendNegotiationNotification({
            recipient: recipientId,
            sender: userId,
            title: 'New Counter Offer Received',
            message: `${isManager ? 'Manager' : 'Tenant'} countered with ₹${numericCounterRent.toLocaleString('en-IN')}/month for ${property.name}.`,
            propertyId: property._id,
            offerId: offer._id,
            action: 'counter_offer',
            isRecipientTenant: isManager
        });

    } else if (action === 'reject') {
        offer.status = 'rejected';
        offer.offerHistory.push({
            sender: userId,
            senderRole: isManager ? 'manager' : 'tenant',
            receiver: isManager ? offer.fromUser : offer.toUser,
            proposedAmount: offer.currentOffer || offer.offeredRent,
            message: responseMsg || 'Offer rejected.',
            roundNumber: offer.roundCount || 1,
            timestamp: new Date(),
            action: 'reject'
        });

        await offer.save();

        const recipientId = isManager ? offer.fromUser : offer.toUser;
        await sendNegotiationNotification({
            recipient: recipientId,
            sender: userId,
            title: 'Rent Offer Declined',
            message: `The rent negotiation for ${property.name} was declined.`,
            propertyId: property._id,
            offerId: offer._id,
            action: 'rejected',
            isRecipientTenant: isManager
        });

    } else if (action === 'cancel') {
        offer.status = 'cancelled';
        offer.offerHistory.push({
            sender: userId,
            senderRole: isManager ? 'manager' : 'tenant',
            receiver: isManager ? offer.fromUser : offer.toUser,
            proposedAmount: offer.currentOffer || offer.offeredRent,
            message: responseMsg || 'Negotiation cancelled.',
            roundNumber: offer.roundCount || 1,
            timestamp: new Date(),
            action: 'cancel'
        });

        await offer.save();

    } else {
        throw new AppError('Invalid action specified. Must be accept, counter, reject, or cancel.', 400);
    }

    res.status(200).json({
        success: true,
        message: `Negotiation offer successfully updated (${action})`,
        data: enrichOfferWithState(offer, userId)
    });
});

/**
 * GET /api/offers/my — Get all negotiations for authenticated tenant
 */
export const getMyOffers = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user._id || req.user.id;

    // Auto-expire past deadline records on read
    await Offer.updateMany(
        {
            fromUser: userId,
            status: { $in: ['pending', 'countered'] },
            expiresAt: { $lt: new Date() }
        },
        { status: 'expired' }
    );

    const offers = await Offer.find({ fromUser: userId })
        .populate('property', 'name address city state images rentAmount depositAmount type status publishStatus bookedDates')
        .populate('toUser', 'firstName lastName email phone avatar')
        .populate('booking', '_id status rejectionReason updatedAt')
        .sort({ updatedAt: -1 });

    // Self-heal any accepted offers whose linked booking was rejected or whose validity window expired
    for (const o of offers) {
        if (o.status === 'accepted') {
            const isBookingRejected = o.booking && o.booking.status === 'rejected';
            const isWindowExpired = Boolean(o.expiresAt) && new Date() > new Date(o.expiresAt);
            if (isBookingRejected || isWindowExpired) {
                o.status = 'expired';
                o.expiredAt = o.expiredAt || (isBookingRejected ? (o.booking.updatedAt || new Date()) : o.expiresAt);
                o.expirationReason = o.expirationReason || (isBookingRejected ? 'booking_rejected_by_manager' : 'deal_validity_expired');
                const hasExpiredAction = o.offerHistory?.some(h => h.action === 'expired');
                if (!hasExpiredAction) {
                    o.offerHistory.push({
                        sender: o.toUser?._id || o.toUser,
                        senderRole: 'manager',
                        receiver: o.fromUser,
                        proposedAmount: o.agreedRent || o.currentOffer || 0,
                        amount: o.agreedRent || o.currentOffer || 0,
                        startDate: o.agreedStartDate || o.startDate,
                        endDate: o.agreedEndDate || o.endDate,
                        message: isBookingRejected
                            ? `Deal expired: Booking request was declined by manager (${o.booking.rejectionReason || 'No reason provided'})`
                            : 'Deal expired: Validity period elapsed without booking',
                        timestamp: o.expiredAt,
                        action: 'expired'
                    });
                }
                await Offer.updateOne(
                    { _id: o._id },
                    {
                        $set: {
                            status: 'expired',
                            expiredAt: o.expiredAt,
                            expirationReason: o.expirationReason,
                            offerHistory: o.offerHistory
                        }
                    }
                );
            }
        }
    }

    const enrichedOffers = offers.map(o => enrichOfferWithState(o, userId));

    res.status(200).json({
        success: true,
        data: enrichedOffers
    });
});

/**
 * GET /api/offers/manager — Get all negotiations for properties managed by authenticated manager
 */
export const getManagerOffers = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user._id || req.user.id;

    // Resolve all properties owned or managed by this user
    const properties = await Property.find({
        $or: [{ manager: userId }, { owner: userId }]
    }).select('_id');

    const propertyIds = properties.map(p => p._id);

    // Auto-expire past deadline records on read
    await Offer.updateMany(
        {
            property: { $in: propertyIds },
            status: { $in: ['pending', 'countered'] },
            expiresAt: { $lt: new Date() }
        },
        { status: 'expired' }
    );

    const offers = await Offer.find({ property: { $in: propertyIds } })
        .populate('property', 'name address city state images rentAmount depositAmount type status')
        .populate('fromUser', 'firstName lastName email phone avatar')
        .populate('booking', '_id status rejectionReason updatedAt')
        .sort({ updatedAt: -1 });

    const enrichedOffers = offers.map(o => enrichOfferWithState(o, userId));

    const now = new Date();
    const next24h = new Date(Date.now() + 24 * 3600 * 1000);

    // Calculate manager summary metrics
    const metrics = {
        newOffers: enrichedOffers.filter(o => o.status === 'pending' && o.currentTurn === 'manager').length,
        awaitingYou: enrichedOffers.filter(o => ['pending', 'countered'].includes(o.status) && o.currentTurn === 'manager').length,
        accepted: enrichedOffers.filter(o => o.status === 'accepted').length,
        expiringSoon: enrichedOffers.filter(o => ['pending', 'countered', 'accepted'].includes(o.status) && new Date(o.expiresAt) <= next24h && new Date(o.expiresAt) > now).length,
        total: enrichedOffers.length
    };

    res.status(200).json({
        success: true,
        metrics,
        data: enrichedOffers
    });
});

/**
 * GET /api/offers/:id — Get details of a single negotiation deal
 */
export const getOfferById = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user._id || req.user.id;
    const userRole = req.user.role;

    const offer = await Offer.findById(req.params.id)
        .populate('property', 'name address city state images rentAmount depositAmount type status publishStatus negotiation')
        .populate('fromUser', 'firstName lastName email phone avatar')
        .populate('toUser', 'firstName lastName email phone avatar')
        .populate('booking', '_id status rejectionReason updatedAt')
        .populate('offerHistory.sender', 'firstName lastName avatar role')
        .populate('offerHistory.receiver', 'firstName lastName avatar role');

    if (!offer) throw new AppError('Negotiation deal not found', 404);

    // Auto-heal accepted offer if linked booking was rejected
    if (offer.status === 'accepted' && offer.booking && offer.booking.status === 'rejected') {
        offer.status = 'expired';
        offer.expiredAt = offer.booking.updatedAt || new Date();
        offer.expirationReason = 'booking_rejected_by_manager';
        await offer.save();
    }

    const isTenant = String(offer.fromUser?._id || offer.fromUser) === String(userId);
    const isManager = String(offer.toUser?._id || offer.toUser) === String(userId) ||
        String(offer.property?.manager) === String(userId) ||
        String(offer.property?.owner) === String(userId) ||
        userRole === 'admin';

    if (!isTenant && !isManager) {
        throw new AppError('Forbidden: You are not authorized to view this negotiation', 403);
    }

    const enriched = enrichOfferWithState(offer, userId);

    // If requester is tenant, hide property manager internal thresholds
    if (isTenant && !isManager && enriched.property?.negotiation) {
        enriched.property.negotiation = {
            enabled: enriched.property.negotiation.enabled,
            availability: enriched.property.negotiation.availability,
            offerValidityHours: enriched.property.negotiation.offerValidityHours,
            maxRounds: enriched.property.negotiation.maxRounds
        };
    }

    res.status(200).json({
        success: true,
        data: enriched
    });
});

/**
 * GET /api/offers/property/:propertyId — Get negotiations for a specific property (Manager only)
 */
export const getPropertyOffers = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user._id || req.user.id;
    const property = await Property.findById(req.params.propertyId);
    if (!property) throw new AppError('Property not found', 404);

    const isAuthorized = req.user.role === 'admin' ||
        String(property.manager) === String(userId) ||
        String(property.owner) === String(userId);

    if (!isAuthorized) throw new AppError('Forbidden: Access denied to property negotiations', 403);

    const offers = await Offer.find({ property: req.params.propertyId })
        .populate('fromUser', 'firstName lastName email avatar')
        .sort({ createdAt: -1 });

    const enrichedOffers = offers.map(o => enrichOfferWithState(o, userId));

    res.status(200).json({ success: true, data: enrichedOffers });
});
