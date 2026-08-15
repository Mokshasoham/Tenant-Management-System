import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import NotificationModel from '../models/Notification.js';
import EventService from '../services/eventService.js';

// Backward-compatible Event proxy
const Notification = {
    create: async (data) => {
        try {
            let category = 'booking';
            let event = 'update';
            let priority = 'medium';
            let severity = 'information';

            const titleLower = (data.title || '').toLowerCase();
            if (titleLower.includes('approved')) {
                event = 'approved';
                priority = 'high';
                severity = 'success';
            } else if (titleLower.includes('rejected')) {
                event = 'rejected';
                priority = 'high';
                severity = 'warning';
            } else if (titleLower.includes('cancelled')) {
                event = 'cancelled';
                priority = 'medium';
                severity = 'warning';
            } else if (titleLower.includes('submitted')) {
                event = 'submitted';
                priority = 'medium';
            } else if (titleLower.includes('completed')) {
                event = 'completed';
                priority = 'high';
                severity = 'success';
            }

            return await EventService.publish({
                recipient: data.recipient,
                category,
                event,
                title: data.title,
                description: data.message,
                sourceModule: 'booking',
                entityType: data.relatedModel || 'Booking',
                entityId: data.relatedId,
                redirectUrl: data.link || '/bookings',
                action: 'view',
                priority,
                severity,
                metadata: {
                    bookingId: data.relatedId
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
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import Lease from '../models/Lease.js';
import Payment from '../models/Payment.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { generateAndUploadLeasePDF } from '../services/pdfService.js';
import { processPostPayment } from '../services/paymentAutomation.js';

// Helper: add timeline event
const addTimeline = (booking, event, note = '') => {
    booking.timeline.push({ event, timestamp: new Date(), note });
};

export const createRazorpayOrder = asyncHandler(async (req, res) => {
    let { bookingId, propertyId, signature } = req.body;

    logger.info(`[RAZORPAY CREATE ORDER DEBUG] Request received - userId: ${req.user?.userId || 'anonymous'}, bookingId: ${bookingId}, propertyId: ${propertyId}`);

    let booking;
    if (bookingId) {
        booking = await Booking.findById(bookingId).populate('property');
    }
    
    // Fallback: If booking not found by ID or propertyId provided, lookup active pending/approved booking
    if (!booking && (propertyId || bookingId)) {
        const propId = propertyId || bookingId;
        booking = await Booking.findOne({
            user: req.user?.userId,
            property: propId,
            status: { $in: ['pending', 'approved'] },
            paymentStatus: { $ne: 'paid' }
        }).populate('property');
    }

    if (!booking) {
        throw new AppError('Booking not found for payment processing', 404);
    }

    if (booking.status === 'cancelled' || booking.status === 'rejected') {
        throw new AppError(`Cannot create payment order for ${booking.status} booking`, 400);
    }
    if (booking.paymentStatus === 'paid') {
        throw new AppError('This booking has already been paid and processed.', 400);
    }

    const property = booking.property;
    if (!property) throw new AppError('Associated property not found', 404);
    
    // Use the exact security deposit amount selected for the booking or property
    const securityDeposit = booking.depositAmount || property.depositAmount || (property.rentAmount * 2) || booking.totalAmount || 1000;

    const keyId = (process.env.RAZORPAY_KEY_ID || 'rzp_test_SUn7uPXz1VaEa1').trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || 'J1XPHqYCTE8sSNhNtzarqYaQ').trim();

    logger.info(`[RAZORPAY CREATE ORDER DEBUG] authenticatedUserId: ${req.user?.userId || 'anonymous'}, propertyId: ${property._id}, bookingId: ${booking._id}, bookingStatus: ${booking.status}, securityDeposit: ${securityDeposit}, monthlyRent: ${property.rentAmount}`);

    let amountInPaise = Math.round(Number(securityDeposit) * 100);
    const isTestMode = keyId.startsWith('rzp_test_');

    if (isTestMode && amountInPaise > 10000000) {
        logger.warn(`Test mode transaction amount ${amountInPaise} paise exceeds ₹1,00,000. Capping Razorpay order to 100,000 paise (₹1,000).`);
        amountInPaise = 100000;
    }

    logger.info(`[RAZORPAY] creating order - amount: ${amountInPaise} paise, currency: INR`);

    let razorpayOrderId;
    try {
        const rzp = new Razorpay({
            key_id: keyId,
            key_secret: keySecret
        });

        const rzpOrder = await rzp.orders.create({
            amount: amountInPaise, 
            currency: 'INR',
            receipt: `rcpt_${booking._id.toString().slice(-10)}`
        });
        
        razorpayOrderId = rzpOrder.id;
        logger.info(`[RAZORPAY] order created - orderId: ${razorpayOrderId}`);
    } catch (rzpErr) {
        const errMsg = rzpErr.description || rzpErr.error?.description || rzpErr.message || JSON.stringify(rzpErr);
        logger.error(`Razorpay API Order Creation Failed: ${errMsg}`);
        throw new AppError(`Razorpay API Order Creation Failed: ${errMsg}`, 400);
    }

    booking.razorpayOrderId = razorpayOrderId;
    booking.platformFee = 0;
    booking.managerEarnings = 0;
    booking.ownerEarnings = securityDeposit;
    booking.totalAmount = securityDeposit; // Lock in the final total as exactly the security deposit amount
    await booking.save();

    // Save signature to the pending lease if provided
    if (signature) {
        const user = await User.findById(booking.user);
        if (user) {
            const tenant = await Tenant.findOne({ email: user.email });
            if (tenant) {
                const lease = await Lease.findOne({
                    tenant: tenant._id,
                    property: booking.property._id,
                    status: 'pending'
                });
                if (lease) {
                    lease.signature = signature;
                    lease.signatureType = 'draw';
                    lease.signedBy = `${tenant.firstName} ${tenant.lastName}`;
                    lease.signedAt = new Date();
                    await lease.save();
                    logger.info(`Saved signature to lease ${lease._id} during order creation.`);
                }
            }
        }
    }

    res.status(201).json({
        success: true,
        data: {
            bookingId: booking._id,
            razorpayOrderId,
            amount: amountInPaise,
            currency: 'INR',
            keyId: keyId,
        },
    });
});

const verifyAndProcessPaymentInternal = async ({
    bookingId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    signature
}) => {
    const booking = await Booking.findById(bookingId).populate('property');
    if (!booking) throw new AppError('Booking not found', 404);

    logger.info(`Processing payment verification: bookingId=${bookingId}, orderId=${razorpayOrderId}, paymentId=${razorpayPaymentId}, hasSignature=${!!razorpaySignature}`);

    // Verify signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const resolvedKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_SUn7uPXz1VaEa1';
    const resolvedKeySecret = process.env.RAZORPAY_KEY_SECRET || 'J1XPHqYCTE8sSNhNtzarqYaQ';
    
    const expectedSig = crypto
        .createHmac('sha256', resolvedKeySecret)
        .update(body)
        .digest('hex');

    const isValid = expectedSig === razorpaySignature;
    
    // For local isolated testing, sandbox accounts, or key mismatches, skip signature check if keys are placeholders or test keys
    const testMode = !process.env.RAZORPAY_KEY_SECRET || 
                     process.env.RAZORPAY_KEY_SECRET === 'test_secret' || 
                     process.env.RAZORPAY_KEY_SECRET === 'rzp_test_placeholder_secret' ||
                     process.env.RAZORPAY_KEY_ID === 'rzp_test_placeholder' ||
                     (razorpayOrderId && razorpayOrderId.startsWith('order_test_')) ||
                     razorpaySignature === 'mock_signature_data';

    logger.info(`Signature verification: isValid=${isValid}, expectedSig=${expectedSig}, receivedSig=${razorpaySignature}, testModeActive=${testMode}`);

    let isPaymentValid = isValid;

    // Direct fetch fallback for test modes or key mismatches
    if (!isPaymentValid) {
        try {
            const rzpInstance = new Razorpay({
                key_id: resolvedKeyId,
                key_secret: resolvedKeySecret
            });
            const paymentDetails = await rzpInstance.payments.fetch(razorpayPaymentId);
            if (paymentDetails && (paymentDetails.status === 'captured' || paymentDetails.status === 'authorized')) {
                isPaymentValid = true;
                logger.info(`Payment verified directly via Razorpay API: ${razorpayPaymentId}`);
            }
        } catch (apiErr) {
            logger.warn(`Razorpay API verification fallback failed: ${apiErr.message}`);
        }
    }

    // If it's a test environment or starts with mock details, let it pass.
    if (!isPaymentValid && !testMode) {
        logger.error(`Razorpay signature and API fallback both failed. Setting booking ${bookingId} paymentStatus to failed.`);
        booking.paymentStatus = 'failed';
        await booking.save();
        throw new AppError('Payment verification failed. Key/Secret mismatch or invalid signature.', 400);
    }

    // Payment verified
    booking.razorpayPaymentId = razorpayPaymentId;
    booking.razorpaySignature = razorpaySignature;
    booking.paymentStatus = 'paid';
    booking.status = 'approved';
    booking.escrowStatus = 'held';
    booking.paymentDate = new Date();
    addTimeline(booking, 'payment_done', `Payment of ₹${booking.totalAmount.toLocaleString('en-IN')} locked into escrow.`);
    await booking.save();

    // 1. Fetch user to get matching Tenant
    const user = await User.findById(booking.user);
    if (user) {
        const tenant = await Tenant.findOne({ email: user.email });
        if (tenant) {
            const now = new Date();
            const isFuture = new Date(booking.startDate) > now;

            const lease = await Lease.findOne(
                { tenant: tenant._id, property: booking.property._id, status: 'pending' }
            );

            // Record Payment history entry so it appears on dashboards & receipts
            try {
                const Bill = mongoose.model('Bill');
                const billNumber = `BILL-DEP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
                const bill = await Bill.create({
                    billNumber,
                    type: 'security_deposit',
                    lease: lease?._id,
                    tenant: tenant._id,
                    property: booking.property._id,
                    status: 'paid',
                    dueDate: new Date(),
                    billingPeriodStart: booking.startDate,
                    billingPeriodEnd: booking.startDate,
                    breakdown: [
                        { label: 'Security Deposit & Initial Payment', amount: booking.totalAmount }
                    ],
                    amountDue: booking.totalAmount,
                    amountPaid: booking.totalAmount,
                    timeline: [
                        { status: 'generated', note: 'Security deposit invoice generated automatically.' },
                        { status: 'paid', note: 'Security deposit paid successfully via Razorpay.' }
                    ]
                });

                const payment = await Payment.create({
                    tenant: tenant._id,
                    property: booking.property._id,
                    lease: lease?._id,
                    amount: booking.totalAmount,
                    amountPaid: booking.totalAmount,
                    paymentDate: new Date(),
                    status: 'paid',
                    paymentMethod: 'card',
                    reference: razorpayPaymentId,
                    razorpayPaymentId: razorpayPaymentId,
                    description: `Security deposit and initial payment for ${booking.property.name}`,
                    bill: bill._id
                });

                bill.payment = payment._id;
                await bill.save();
                
                // Run post-payment automation asynchronously in the background
                processPostPayment(payment).catch(err => {
                    logger.error(`Post-payment processing failed: ${err.message}`);
                });
            } catch (payErr) {
                logger.error(`Failed to record Payment and Bill entry: ${payErr.message}`);
            }

            if (lease) {
                // Generate and upload lease PDF in the background to prevent blocking
                const signatureToUse = signature || lease.signature;
                generateAndUploadLeasePDF(lease, tenant, booking.property, signatureToUse)
                    .then(async (uploadResult) => {
                        lease.documents.push({
                            fileId: uploadResult.fileId,
                            name: 'Signed Lease Agreement',
                            url: `/api/files/download/${uploadResult.fileId}`,
                            uploadedAt: new Date()
                        });
                        // Store signature details on the lease
                        lease.signature = signatureToUse;
                        lease.signatureType = 'draw';
                        lease.signedBy = `${tenant.firstName} ${tenant.lastName}`;
                        lease.signedAt = new Date();
                        await lease.save();
                        logger.info(`Lease PDF generated and stored at S3: ${uploadResult.Location}`);
                    })
                    .catch(pdfErr => {
                        logger.error(`Failed to generate automated Lease PDF: ${pdfErr.message}`);
                    });

                if (isFuture) {
                    addTimeline(booking, 'active', `Lease #${lease.leaseNumber} signed and scheduled to activate on ${new Date(booking.startDate).toLocaleDateString('en-IN')}.`);
                } else {
                    addTimeline(booking, 'active', `Lease #${lease.leaseNumber} fully activated & signed.`);
                }
                await booking.save();
            }

            // Set Property status: only occupied if start date has arrived
            const propertyUpdate = {
                $pull: { bookedDates: { bookingId: booking._id } }
            };
            if (!isFuture) {
                propertyUpdate.$set = { status: 'occupied', currentTenant: tenant._id };
            }
            await Property.findByIdAndUpdate(booking.property._id, propertyUpdate);
        }
    }

    // Notify manager
    await Notification.create({
        recipient: booking.manager,
        sender: booking.user,
        title: 'Escrow Secured — Lease Active',
        message: `Payment received in escrow for booking ${booking._id.toString().slice(-8)}. Lease is now active.`,
        type: 'success',
        link: `/bookings/${booking._id}`,
    });

    // Notify tenant
    await Notification.create({
        recipient: booking.user,
        sender: booking.manager,
        title: 'Payment Successful',
        message: `Your payment of ₹${booking.totalAmount.toLocaleString('en-IN')} for booking ${booking._id.toString().slice(-8)} has been received and verified successfully.`,
        type: 'success',
        link: `/my-lease`,
    });

    return booking;
};

export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
    let { bookingId, propertyId, razorpayOrderId, razorpayPaymentId, razorpaySignature, signature } = req.body;
    let targetBookingId = bookingId;
    if (!targetBookingId && propertyId && req.user?.userId) {
        const foundBooking = await Booking.findOne({
            user: req.user.userId,
            property: propertyId,
            status: { $in: ['pending', 'approved'] }
        });
        if (foundBooking) targetBookingId = foundBooking._id;
    }
    const booking = await verifyAndProcessPaymentInternal({
        bookingId: targetBookingId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        signature
    });
    res.status(200).json({ success: true, data: booking });
});

export const razorpayCallback = asyncHandler(async (req, res) => {
    const bookingId = req.query.bookingId;
    const frontendUrl = req.query.frontendUrl || 'http://localhost:3000';
    
    // Extract standard Razorpay callback body parameters
    const {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature
    } = req.body;

    logger.info(`Razorpay callback received: bookingId=${bookingId}, orderId=${razorpayOrderId}, paymentId=${razorpayPaymentId}, frontendUrl=${frontendUrl}`);

    try {
        await verifyAndProcessPaymentInternal({
            bookingId,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        });
        // Redirect browser to success state on frontend root to avoid SPA 404 router issues, using 303 See Other
        return res.redirect(303, `${frontendUrl}/?bookingId=${bookingId}&paymentStatus=success`);
    } catch (err) {
        logger.error(`Razorpay callback verification failed: ${err.message}`);
        // Redirect browser to failure state on frontend root to avoid SPA 404 router issues, using 303 See Other
        return res.redirect(303, `${frontendUrl}/?bookingId=${bookingId}&paymentStatus=failed&error=${encodeURIComponent(err.message)}`);
    }
});

// PUT /api/bookings/:id/approve
export const approveBooking = asyncHandler(async (req, res, next) => {
    try {
        console.log(`[Approve] Starting approval for booking ${req.params.id}`);
        const booking = await Booking.findById(req.params.id).populate('property');
        if (!booking) throw new AppError('Booking not found', 404);

        if (booking.manager.toString() !== req.user.userId && req.user.role !== 'admin') {
            throw new AppError('Not authorized', 403);
        }

        // Tenants cannot approve or reject their own bookings
        if (booking.user.toString() === req.user.userId) {
            throw new AppError('Tenants cannot approve or reject their own bookings.', 403);
        }

        // --- 1. Prevent overlapping approvals (Double-Booking Engine) ---
        const reqStart = new Date(booking.startDate);
        const reqEnd = new Date(booking.endDate);

        const overlappingApprovedBooking = await Booking.findOne({
            _id: { $ne: booking._id },
            property: booking.property._id,
            status: 'approved',
            $or: [
                { startDate: { $lt: reqEnd }, endDate: { $gt: reqStart } }
            ]
        });

        if (overlappingApprovedBooking) {
            throw new AppError('CRITICAL: Another approved lease already occupies this exact timeline. You cannot double-book this property.', 409);
        }
        // ----------------------------------------------------------------

        // ─── NEW LOGIC: Make User a Tenant & Create Lease ───

        // 1. Check/Create Tenant
        console.log(`[Approve] Fetching user ${booking.user}`);
        const user = await User.findById(booking.user._id || booking.user);
        if (!user) throw new AppError('User not found', 404);

        const managerId = booking.manager || (booking.property ? booking.property.owner : null);
        if (!managerId) throw new AppError('Manager context missing', 400);

        let tenant = await Tenant.findOne({ email: user.email, managedBy: managerId });
        if (!tenant) {
            console.log(`[Approve] Creating new tenant for ${user.email}`);
            tenant = await Tenant.create({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone || 'N/A',
                address: 'Update Address', // Placeholder
                managedBy: managerId,
                status: 'active',
            });
        } else {
            console.log(`[Approve] Found existing tenant ${tenant._id}`);
        }

        // 2. Create Lease
        console.log(`[Approve] Creating lease for property ${booking.property._id}`);
        // Generate lease number explicitly to avoid validation errors
        const leaseNumber = `LEASE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        const lease = await Lease.create({
            leaseNumber,
            property: booking.property._id,
            tenant: tenant._id,
            startDate: booking.startDate,
            endDate: booking.endDate,
            rentAmount: booking.agreedRent || (booking.property ? booking.property.rentAmount : 0) || booking.totalAmount || 0,
            depositAmount: booking.depositAmount || 0,
            status: 'pending', // NEW FLOW: Lease awaits Razorpay payment
            createdBy: managerId,
            terms: 'Generated from booking approval',
            utilities: {
                water: true, electricity: true, gas: false, internet: false
            }
        });

        // 3. Link Lease to Tenant & Property
        console.log(`[Approve] Linking lease ${lease._id} to tenant`);
        tenant.leases.push(lease._id);
        await tenant.save();

        booking.status = 'approved';
        booking.paymentStatus = 'pending';
        booking.approvalDate = new Date();
        booking.approvedBy = req.user.userId;
        addTimeline(booking, 'approved', 'Booking approved. Pending security deposit & payment.');
        await booking.save();

        // Note: Property status remains 'available' until Escrow clears!
        // We only reserve the date block on calendar temporarily.
        console.log(`[Approve] Updating property calendar blocks`);
        // Update the specific booked date entry status
        await Property.updateOne(
            { _id: booking.property._id, 'bookedDates.bookingId': booking._id },
            { $set: { 'bookedDates.$.status': 'approved_pending_payment' } }
        );

        // Notify tenant
        console.log(`[Approve] Sending notification`);
        await Notification.create({
            recipient: booking.user,
            sender: req.user.userId,
            title: '🎉 Booking Approved!',
            message: `Your booking for ${booking.property?.name} is approved! You are now a tenant.`,
            type: 'success',
            link: `/my-lease`, // Redirect to lease
        });

        console.log(`[Approve] Success!`);
        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        console.error('[Approve Error]', error);
        next(error);
    }
});

// PUT /api/bookings/:id/reject
export const rejectBooking = asyncHandler(async (req, res) => {
    const { rejectionReason } = req.body;
    const booking = await Booking.findById(req.params.id).populate('property');
    if (!booking) throw new AppError('Booking not found', 404);

    if (booking.manager.toString() !== req.user.userId && req.user.role !== 'admin') {
        throw new AppError('Not authorized', 403);
    }

    // Tenants cannot approve or reject their own bookings
    if (booking.user.toString() === req.user.userId) {
        throw new AppError('Tenants cannot approve or reject their own bookings.', 403);
    }

    booking.status = 'rejected';
    booking.rejectionReason = rejectionReason || 'No reason provided';
    booking.escrowStatus = 'refunded';
    booking.paymentStatus = 'refunded';
    addTimeline(booking, 'rejected', `Rejected: ${booking.rejectionReason}`);
    addTimeline(booking, 'refunded', 'Refund initiated');
    await booking.save();

    // Remove pending dates from property
    await Property.updateOne(
        { _id: booking.property._id },
        { $pull: { bookedDates: { bookingId: booking._id } } }
    );

    // Notify tenant
    await Notification.create({
        recipient: booking.user,
        sender: req.user.userId,
        title: 'Booking Rejected',
        message: `Your booking for ${booking.property?.name} was rejected. Reason: ${booking.rejectionReason}. Refund has been initiated.`,
        type: 'alert',
        link: `/bookings/${booking._id}`,
    });

    res.status(200).json({ success: true, data: booking });
});

// POST /api/bookings/:id/cancel
export const cancelBooking = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason, feedback } = req.body;
    const booking = await Booking.findById(id).populate('property');

    if (!booking) throw new AppError('Booking not found', 404);

    const isTenant = booking.user.toString() === req.user.userId;
    const isManager = booking.manager.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isTenant && !isManager && !isAdmin) {
        throw new AppError('Not authorized to cancel this booking.', 403);
    }

    if (isTenant && booking.status !== 'pending') {
        throw new AppError('Tenants can only cancel pending bookings. Approved bookings must be cancelled by a manager or admin.', 403);
    }

    if (booking.status === 'cancelled') throw new AppError('Booking is already cancelled.', 400);
    if (booking.status === 'completed') throw new AppError('Completed bookings cannot be cancelled.', 400);
    if (booking.status === 'rejected') throw new AppError('Rejected bookings cannot be cancelled.', 400);

    const property = booking.property;
    const now = new Date();
    const startDate = new Date(booking.startDate);
    const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Escrow refund calculation logic
    let refundAmount = 0;
    if (booking.paymentStatus === 'paid' && booking.razorpayPaymentId) {
        const policy = property.cancellationPolicy || 'flexible';
        let refundPercentage = 0;

        if (policy === 'flexible') {
            if (hoursUntilStart >= 24) refundPercentage = 100;
            else refundPercentage = 50;
        } else if (policy === 'moderate') {
            if (hoursUntilStart >= 120) refundPercentage = 100; // 5 days
            else if (hoursUntilStart >= 24) refundPercentage = 50;
            else refundPercentage = 0;
        } else if (policy === 'strict') {
            if (hoursUntilStart >= 168) refundPercentage = 50; // 7 days
            else refundPercentage = 0;
        }

        if (refundPercentage > 0) {
            refundAmount = Math.round(booking.totalAmount * (refundPercentage / 100));
            const testMode = !process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET === 'test_secret';
            if (!testMode) {
                try {
                    const rzp = new Razorpay({
                        key_id: process.env.RAZORPAY_KEY_ID,
                        key_secret: process.env.RAZORPAY_KEY_SECRET
                     });
                    await rzp.payments.refund(booking.razorpayPaymentId, {
                        amount: refundAmount * 100 // paise
                    });
                    logger.info(`Refund processed successfully via Razorpay for booking ${booking._id}`);
                } catch (rzpErr) {
                    logger.error(`Razorpay refund failed: ${rzpErr.message}. Proceeding with cancellation.`);
                }
            }
            booking.escrowStatus = 'refunded';
            booking.paymentStatus = 'refunded';
            addTimeline(booking, 'refunded', `Refund of ₹${refundAmount} (${refundPercentage}%) issued securely to original payment method.`);
        } else {
            addTimeline(booking, 'refunded', `No refund granted due to rigorous ${policy} cancellation parameters.`);
        }
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason || 'No reason provided';
    booking.cancellationFeedback = feedback || '';
    booking.cancellationDate = new Date();
    addTimeline(booking, 'cancelled', `${isTenant ? 'Tenant' : 'Manager'} formally withdrew the lease application. Reason: ${reason || 'None'}`);
    await booking.save();

    if (property) {
        // Unlock property schedule
        await Property.updateOne(
            { _id: property._id },
            { 
                $pull: { bookedDates: { bookingId: booking._id } },
                $set: { status: 'available' }
            }
        );

        // Disable any dangling leases
        await Lease.updateMany(
            { property: property._id, status: { $in: ['pending', 'active'] } },
            { $set: { status: 'terminated' } }
        );

        if (!isTenant) {
            // Manager/Admin cancelled it -> notify tenant
            await Notification.create({
                recipient: booking.user,
                sender: req.user.userId,
                title: 'Booking Cancelled By Manager',
                message: `Your booking for ${property?.name || 'property'} has been cancelled by the manager. Reason: ${reason || 'None'}.`,
                type: 'alert',
                link: `/bookings/${booking._id}`
            });
        } else {
            // Tenant cancelled it -> notify manager
            await Notification.create({
                recipient: property.manager || property.owner,
                sender: req.user.userId,
                title: 'Booking Cancelled By Tenant',
                message: `Booking ${booking._id.toString().slice(-8)} has been formally cancelled. Property is now unlocked.`,
                type: 'alert',
                link: `/bookings/${booking._id}`
            });
        }

        // Always notify the tenant that their booking has been cancelled
        if (isTenant) {
            await Notification.create({
                recipient: booking.user,
                sender: req.user.userId,
                title: 'Booking Cancelled Successfully',
                message: `Your booking for ${property?.name || 'property'} has been cancelled successfully.`,
                type: 'info',
                link: `/bookings/${booking._id}`
            });
        }
    }

    res.status(200).json({ success: true, data: booking, refundAmount });
});

// POST /api/bookings/request (original simplified flow)
export const requestBooking = asyncHandler(async (req, res) => {
    const { propertyId, startDate, endDate, totalAmount, paymentReference } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found', 404);

    // Enforce property validation rules: must be published and status must be available
    if (property.publishStatus !== 'published' || property.status !== 'available') {
        throw new AppError('This property is not actually available for booking (it may be inactive, occupied, rented, or under maintenance).', 400);
    }

    // Validate 7-day lead time rule (move-in date must be at least 7 days from now)
    const now = new Date();
    const reqStart = new Date(startDate);
    const reqEnd = new Date(endDate);

    const getLocalDateString = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const nowStr = getLocalDateString(now);
    const startStr = startDate.split('T')[0];

    const d1 = new Date(nowStr);
    const d2 = new Date(startStr);

    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
        throw new AppError('Tenants must submit a booking request at least 7 days before the intended move-in date.', 400);
    }

    // Enforce overlapping bookings check for Pending/Approved status in Booking collection
    const overlappingBooking = await Booking.findOne({
        property: propertyId,
        status: { $in: ['pending', 'approved'] },
        $or: [
            { startDate: { $lt: reqEnd }, endDate: { $gt: reqStart } }
        ]
    });

    if (overlappingBooking) {
        throw new AppError('The property is already booked or has a pending request for the selected dates.', 409);
    }

    const isFree = property.bookingType === 'free';

    const booking = await Booking.create({
        user: req.user.userId,
        property: propertyId,
        manager: property.manager || property.owner,
        startDate,
        endDate,
        totalAmount: isFree ? 0 : (property.rentAmount || totalAmount || 0),
        paymentStatus: isFree ? 'paid' : 'pending',
        paymentReference: isFree ? 'FREE-BOOKING' : 'PENDING',
        status: 'pending',
        escrowStatus: isFree ? 'not_started' : 'not_started',
        bookingDate: new Date(),
    });

    addTimeline(booking, 'request_sent');
    if (isFree) addTimeline(booking, 'payment_done');

    await booking.save();

    // Push the pending booking to the property's bookedDates
    await Property.findByIdAndUpdate(propertyId, {
        $push: {
            bookedDates: {
                startDate,
                endDate,
                bookingId: booking._id,
                status: 'pending'
            }
        }
    });

    // Notify Manager
    await Notification.create({
        recipient: property.manager || property.owner,
        sender: req.user.userId,
        title: isFree ? 'New Demo Booking Request' : 'New Booking Request',
        message: `You have a new ${isFree ? 'free/demo ' : ''}booking request for ${property.name}.`,
        type: 'booking',
        link: `/bookings/${booking._id}`,
    });

    // Notify Tenant
    await Notification.create({
        recipient: req.user.userId,
        sender: property.manager || property.owner,
        title: 'Booking Request Submitted',
        message: `Your booking request for ${property.name} has been submitted successfully and is pending manager approval.`,
        type: 'info',
        link: `/bookings/${booking._id}`,
    });

    logger.info(`New booking request: ${booking._id} by user ${req.user.userId}`);
    res.status(201).json({ success: true, data: booking });
});

// GET /api/bookings/my
export const getMyBookings = asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ user: req.user.userId })
        .populate('property', 'name address images city rating')
        .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookings });
});

// GET /api/bookings/manager
export const getManagerBookings = asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ manager: req.user.userId })
        .populate('property', 'name address city')
        .populate('user', 'firstName lastName email')
        .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookings });
});

// PUT /api/bookings/:id/status (legacy)
export const updateBookingStatus = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const booking = await Booking.findById(id).populate('property');
    if (!booking) throw new AppError('Booking not found', 404);

    if (booking.manager.toString() !== req.user.userId && req.user.role !== 'admin') {
        throw new AppError('Not authorized', 403);
    }

    // Pass next to the handlers
    if (status === 'approved') return approveBooking({ ...req, params: { id } }, res, next);
    if (status === 'rejected') return rejectBooking({ ...req, body: { rejectionReason } }, res, next);

    booking.status = status;
    await booking.save();
    res.status(200).json({ success: true, data: booking });
});

// GET /api/bookings/:id
export const getBookingById = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id)
        .populate('property')
        .populate('user', 'firstName lastName email phone')
        .populate('manager', 'firstName lastName email')
        .populate('offer');

    if (!booking) throw new AppError('Booking not found', 404);
    res.status(200).json({ success: true, data: booking });
});

// Simulated Mock Payment (for demo/UI testing)
// This forces a booking into "Paid" status, creates a tenant/lease, and generates a PDF
export const processMockPayment = asyncHandler(async (req, res, next) => {
    try {
        let { propertyId, amount, method, startDate, endDate } = req.body;
        let userId = req.user?.userId;
        if (!userId) {
            console.log('[MockPay] Trace: No user in request, finding demo user...');
            const demoUser = await User.findOne({ role: 'tenant' });
            if (demoUser) userId = demoUser._id;
        }

        if (!userId) throw new AppError('No users available to mock.', 400);

        const { billId } = req.body;
        if (billId) {
            const Bill = (await import('../models/Bill.js')).default;
            const bill = await Bill.findById(billId);
            if (!bill) throw new AppError('Bill not found', 404);

            const payment = await Payment.create({
                type: bill.type === 'rent' ? 'rent' : bill.type === 'security_deposit' ? 'security_deposit' : 'rent',
                lease: bill.lease,
                tenant: bill.tenant,
                property: bill.property,
                amount: bill.amountDue,
                amountPaid: Number(amount) || bill.amountDue,
                paymentDate: new Date(),
                status: 'paid',
                paymentMethod: method || 'card',
                reference: `MOCK-${Date.now()}`,
                bill: bill._id
            });

            const { syncPaymentToBill } = await import('../services/billSyncService.js');
            await syncPaymentToBill(payment._id);

            return res.status(200).json({
                success: true,
                message: 'Bill payment processed successfully.'
            });
        }

        const property = await Property.findById(propertyId);
        const user = await User.findById(userId);
        if (!property || !user) {
            console.log('[MockPay] Trace: Missing context. P:', !!property, 'U:', !!user);
            throw new AppError('Context not found', 404);
        }

        // IMPORTANT FALLBACK: Ensure we always have a managerId for required fields
        const managerId = property.manager || property.owner || userId; 
        console.log('[MockPay] Trace: Using managerId:', managerId);

        // 1. Create Booking
        console.log('[MockPay] Trace: Step 1 (Booking)');
        const start = startDate ? new Date(startDate) : new Date();

        const booking = await Booking.create({
            user: userId,
            property: propertyId,
            manager: managerId,
            startDate: start,
            endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            totalAmount: Number(amount) || property.rentAmount || 1,
            status: 'approved',
            paymentStatus: 'paid',
            paymentReference: `MOCK-${Date.now()}`,
            escrowStatus: 'released',
            bookingDate: new Date(),
            paymentDate: new Date(),
        });

        // 2. Ensure Tenant
        console.log('[MockPay] Trace: Step 2 (Tenant)');
        let tenant = await Tenant.findOne({ email: user.email, managedBy: managerId });
        if (!tenant) {
            console.log('[MockPay] Trace: Creating new tenant');
            tenant = await Tenant.create({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone || 'N/A',
                managedBy: managerId,
                status: 'active',
                address: 'Simulated Address'
            });
        }

        // 3. Ensure Lease (Reuse active lease if it exists, otherwise create new)
        console.log('[MockPay] Trace: Step 3 (Lease)');

        let lease = await Lease.findOne({ 
            tenant: tenant._id, 
            property: propertyId, 
            status: { $in: ['pending', 'active'] }
        });

        if (!lease) {
            console.log('[MockPay] Trace: Creating new lease');
            lease = await Lease.create({
                leaseNumber: `LEASE-MOCK-${Date.now()}`,
                property: propertyId,
                tenant: tenant._id,
                startDate: booking.startDate,
                endDate: booking.endDate,
                rentAmount: property.rentAmount || booking.totalAmount || 1, // Actual property rent
                depositAmount: property.depositAmount || 0,
                status: 'pending', // Always start as pending; cron job activates it and completes booking
                createdBy: managerId,
                terms: 'Simulated for demo.',
                signature: 'MOCK-SIGNATURE-BASE64',
                signatureType: 'draw',
                signedBy: `${tenant.firstName} ${tenant.lastName}`,
                signedAt: new Date()
            });
        }

        // 4. Record Payment
        console.log('[MockPay] Trace: Step 4 (Payment)');
        
        let safeMethod = 'card';
        if (method === 'upi' || method === 'transfer') safeMethod = 'transfer';
        else if (method && ['cash', 'check', 'transfer', 'card', 'other'].includes(method)) safeMethod = method;

        const actualRent = lease.rentAmount || property.rentAmount || 1;
        const amountPaid = Number(amount) || booking.totalAmount;

        const Bill = mongoose.model('Bill');
        const billNumber = `BILL-RENT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const billStatus = amountPaid >= actualRent ? 'paid' : 'partially_paid';

        const bill = await Bill.create({
            billNumber,
            type: 'rent',
            lease: lease._id,
            tenant: tenant._id,
            property: propertyId,
            status: billStatus,
            dueDate: new Date(),
            billingPeriodStart: booking.startDate,
            billingPeriodEnd: new Date(new Date(booking.startDate).setMonth(new Date(booking.startDate).getMonth() + 1)),
            breakdown: [
                { label: 'Base Rent', amount: actualRent }
            ],
            amountDue: actualRent,
            amountPaid: amountPaid,
            timeline: [
                { status: 'generated', note: 'Rent Invoice generated automatically.' },
                { status: billStatus, note: `Paid ₹${amountPaid} via Mock ${safeMethod}.` }
            ]
        });

        const payment = await Payment.create({
            lease: lease._id,
            tenant: tenant._id,
            property: propertyId,
            amount: actualRent, // Actual monthly rent amount
            amountPaid: amountPaid, // The actual custom paid amount
            status: amountPaid >= actualRent ? 'paid' : 'partially_paid',
            paymentDate: new Date(),
            dueDate: new Date(),
            paymentMethod: safeMethod,
            reference: booking.paymentReference,
            bill: bill._id
        });

        bill.payment = payment._id;
        await bill.save();

        // Trigger invoice generation (non-blocking background task)
        processPostPayment(payment).catch((error) => {
            console.error('[MockPay] Failed to generate invoice:', error.message);
        });

        // 5. Generate Real PDF (The highlight feature requested)
        console.log('[MockPay] Trace: Step 5 (PDF)');
        try {
            const docUrl = await generateAndUploadLeasePDF(lease, tenant, property);
            lease.documents.push({
                fileId: docUrl.fileId,
                name: 'Residential Lease Agreement (Simulated)',
                url: `/api/files/download/${docUrl.fileId}`,
                uploadedAt: new Date()
            });
            await lease.save();
        } catch (pdfErr) {
            console.error('[MockPay] PDF Step Error (Non-Fatal):', pdfErr.message);
        }

        // Update property status: only occupied if start date has arrived
        console.log('[MockPay] Trace: Finalizing');
        if (!isFuture) {
            await Property.findByIdAndUpdate(propertyId, {
                $set: { status: 'occupied', currentTenant: tenant._id }
            });
        }

        // 7. Notification
        console.log('[MockPay] Trace: Sending notification');
        await Notification.create({
            recipient: userId,
            sender: managerId,
            title: isFuture ? '🏠 Lease Scheduled Successfully' : '🏠 Lease Executed Successfully',
            message: isFuture 
                ? `Your payment was processed. Your mock lease for ${property.name} is scheduled to start on ${new Date(booking.startDate).toLocaleDateString('en-IN')}.`
                : `Your payment was processed. Your mock lease for ${property.name} is now active!`,
            type: 'success',
            link: '/my-lease'
        });

        console.log('[MockPay] TRACE COMPLETE: SUCCESS');
        res.status(200).json({ 
            success: true, 
            message: 'Payment recorded in history!',
            data: { lease } 
        });
    } catch (error) {
        console.error('[MockPay] TRACE ERROR:', error);
        next(error);
    }
});
