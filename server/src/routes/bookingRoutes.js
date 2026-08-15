import express from 'express';
import {
    requestBooking,
    getMyBookings,
    getManagerBookings,
    updateBookingStatus,
    getBookingById,
    createRazorpayOrder,
    verifyRazorpayPayment,
    razorpayCallback,
    approveBooking,
    rejectBooking,
    cancelBooking,
    processMockPayment,
    getBookingReceipt,
} from '../controllers/bookingController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public callback endpoint for Razorpay redirect responses
router.post('/razorpay/callback', razorpayCallback);

router.use(authenticate);

// Standard booking
router.post('/request', requestBooking);
router.get('/my', getMyBookings);
router.get('/manager', authorize('manager', 'admin'), getManagerBookings);
router.get('/:id', getBookingById);
router.get('/:id/receipt', getBookingReceipt);
router.put('/:id/status', authorize('manager', 'admin'), updateBookingStatus);

// Razorpay payment flow
router.post('/razorpay/create-order', createRazorpayOrder);
router.post('/razorpay/verify', verifyRazorpayPayment);

// Manager approval/rejection
router.put('/:id/approve', authorize('manager', 'admin'), approveBooking);
router.put('/:id/reject', authorize('manager', 'admin'), rejectBooking);

// Tenant Cancellation
router.post('/:id/cancel', cancelBooking);

// Simulated Mock Payment (for demo/UI testing)
router.post('/process-mock-payment', processMockPayment);

export default router;
