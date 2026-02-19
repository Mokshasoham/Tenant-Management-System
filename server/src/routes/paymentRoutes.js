import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticate, managerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Tenant-accessible: view their own payments
router.get('/my-payments', paymentController.getMyPayments);

// All authenticated users can read payments (filtered server-side)
router.get('/', paymentController.getAllPayments);
router.get('/stats', managerOrAdmin, paymentController.getPaymentStats);
router.get('/:id', paymentController.getPaymentById);

// Manager/admin only
router.post('/', managerOrAdmin, paymentController.createPayment);
router.post('/:id/record', paymentController.recordPayment);
router.put('/:id/status', managerOrAdmin, paymentController.updatePaymentStatus);

export default router;

