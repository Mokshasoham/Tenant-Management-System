import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import Notification from '../models/Notification.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

// Helper: add timeline event
const addTimeline = (booking, event, note = '') => {
    booking.timeline.push({ event, timestamp: new Date(), note });
};

// POST /api/bookings/razorpay/create-order
export const createRazorpayOrder = asyncHandler(async (req, res) => {
    const { propertyId, startDate, endDate, totalAmount, agreedRent } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found', 404);

    const managerId = property.manager || property.owner;
    const platformFee = Math.round(totalAmount * 0.02); // 2% platform fee
    const grandTotal = totalAmount + platformFee;

    // Create Razorpay order (mock for test mode — replace with real Razorpay SDK call)
    const razorpayOrderId = `order_test_${Date.now()}`;

    // Create booking in pending state
    const booking = await Booking.create({
        user: req.user.userId,
        property: propertyId,
        manager: managerId,
        startDate,
        endDate,
        totalAmount,
        platformFee,
        agreedRent: agreedRent || totalAmount,
        paymentStatus: 'pending',
        status: 'pending',
        razorpayOrderId,
        escrowStatus: 'not_started',
    });

    addTimeline(booking, 'request_sent', 'Booking request created');
    await booking.save();

    logger.info(`Razorpay order created: ${razorpayOrderId} for booking ${booking._id}`);

    res.status(201).json({
        success: true,
        data: {
            bookingId: booking._id,
            razorpayOrderId,
            amount: grandTotal * 100, // paise
            currency: 'INR',
            keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        },
    });
});

// POST /api/bookings/razorpay/verify
export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new AppError('Booking not found', 404);

    // Verify signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
        .update(body)
        .digest('hex');

    const isValid = expectedSig === razorpaySignature;
    // For test mode, skip signature check
    const testMode = !process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET === 'test_secret';

    if (!isValid && !testMode) {
        booking.paymentStatus = 'failed';
        await booking.save();
        throw new AppError('Payment verification failed', 400);
    }

    // Payment verified — hold in escrow
    booking.razorpayPaymentId = razorpayPaymentId;
    booking.razorpaySignature = razorpaySignature;
    booking.paymentStatus = 'held';
    booking.escrowStatus = 'held';
    addTimeline(booking, 'payment_done', `Payment of ₹${booking.totalAmount.toLocaleString('en-IN')} held in escrow`);
    await booking.save();

    // Block dates on property
    await Property.findByIdAndUpdate(booking.property, {
        $push: {
            bookedDates: {
                startDate: booking.startDate,
                endDate: booking.endDate,
                bookingId: booking._id,
                status: 'pending',
            },
        },
    });

    // Notify manager
    await Notification.create({
        recipient: booking.manager,
        sender: booking.user,
        title: 'New Booking Request — Payment Received',
        message: `Payment held in escrow. Please review and approve/reject the booking.`,
        type: 'payment',
        link: `/bookings/${booking._id}`,
    });

    res.status(200).json({ success: true, data: booking });
});

// PUT /api/bookings/:id/approve
export const approveBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate('property');
    if (!booking) throw new AppError('Booking not found', 404);

    if (booking.manager.toString() !== req.user.userId && req.user.role !== 'admin') {
        throw new AppError('Not authorized', 403);
    }

    booking.status = 'approved';
    booking.escrowStatus = 'released';
    booking.paymentStatus = 'paid';
    addTimeline(booking, 'approved', 'Booking approved. Escrow released to manager.');
    await booking.save();

    // Mark dates as booked on property
    await Property.updateOne(
        { _id: booking.property._id, 'bookedDates.bookingId': booking._id },
        { $set: { 'bookedDates.$.status': 'booked', status: 'occupied' } }
    );

    // Notify tenant
    await Notification.create({
        recipient: booking.user,
        sender: req.user.userId,
        title: '🎉 Booking Approved!',
        message: `Your booking for ${booking.property?.name} has been approved. Your rental agreement is now active.`,
        type: 'success',
        link: `/bookings/${booking._id}`,
    });

    res.status(200).json({ success: true, data: booking });
});

// PUT /api/bookings/:id/reject
export const rejectBooking = asyncHandler(async (req, res) => {
    const { rejectionReason } = req.body;
    const booking = await Booking.findById(req.params.id).populate('property');
    if (!booking) throw new AppError('Booking not found', 404);

    if (booking.manager.toString() !== req.user.userId && req.user.role !== 'admin') {
        throw new AppError('Not authorized', 403);
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

// POST /api/bookings/request (original simplified flow)
export const requestBooking = asyncHandler(async (req, res) => {
    const { propertyId, startDate, endDate, totalAmount, paymentReference } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found', 404);

    const booking = await Booking.create({
        user: req.user.userId,
        property: propertyId,
        manager: property.owner || property.manager,
        startDate,
        endDate,
        totalAmount,
        paymentStatus: 'paid',
        paymentReference,
        status: 'pending',
        escrowStatus: 'held',
    });

    addTimeline(booking, 'request_sent');
    addTimeline(booking, 'payment_done');
    await booking.save();

    await Notification.create({
        recipient: property.owner || property.manager,
        sender: req.user.userId,
        title: 'New Booking Request',
        message: `You have a new booking request for ${property.name}.`,
        type: 'payment',
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
export const updateBookingStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const booking = await Booking.findById(id).populate('property');
    if (!booking) throw new AppError('Booking not found', 404);

    if (booking.manager.toString() !== req.user.userId && req.user.role !== 'admin') {
        throw new AppError('Not authorized', 403);
    }

    if (status === 'approved') return approveBooking({ ...req, params: { id } }, res);
    if (status === 'rejected') return rejectBooking({ ...req, body: { rejectionReason } }, res);

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
