import express from 'express';
import * as subscriptionController from '../controllers/subscriptionController.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// User-facing endpoints
router.get('/me', subscriptionController.getMySubscription);
router.get('/my', subscriptionController.getMySubscription);
router.get('/plans', subscriptionController.getAvailablePlans);
router.post('/create-order', subscriptionController.createUpgradeOrder);
router.post('/verify-payment', subscriptionController.verifyUpgradePayment);
router.post('/cancel', subscriptionController.cancelSubscription);

// Admin-only management & configuration
router.get('/admin/stats', adminOnly, subscriptionController.getAdminStats);
router.put('/admin/config', adminOnly, subscriptionController.updatePlanConfig);

export default router;

