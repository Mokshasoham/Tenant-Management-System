import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticate, managerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Webhook endpoint (unauthenticated, signature-verified)
router.post('/webhook', paymentController.handleRazorpayWebhook);

// Protected routes
router.use(authenticate);

// Authoritative rent payment summary and Razorpay checkout endpoints
router.get('/rent-summary', paymentController.getRentPaymentSummary);
router.get('/summary', paymentController.getRentPaymentSummary);
router.post('/create-order', paymentController.createRazorpayRentOrder);
router.post('/verify-razorpay', paymentController.verifyRazorpayRentPayment);

// Tenant-accessible: view their own payments
router.get('/my-payments', paymentController.getMyPayments);

// All authenticated users can read payments (filtered server-side)
router.get('/', paymentController.getAllPayments);
router.get('/stats', managerOrAdmin, paymentController.getPaymentStats);
router.get('/:id', paymentController.getPaymentById);
router.get('/:id/invoice', paymentController.getPaymentInvoice);

// Manager/admin only
router.post('/', managerOrAdmin, paymentController.createPayment);
router.post('/:id/record', paymentController.recordPayment);
router.put('/:id/status', managerOrAdmin, paymentController.updatePaymentStatus);

export default router;
