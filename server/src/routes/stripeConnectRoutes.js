import express from 'express';
import {
  createOrGetAccount,
  createOnboardingLink,
  createLoginLink,
  getConnectStatus,
  handleStripeConnectWebhook
} from '../controllers/stripeConnectController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public Webhook (verified via Stripe signature)
router.post('/webhook', handleStripeConnectWebhook);

// Authenticated Routes for Managers / Admins / Owners
router.use(authenticate);
router.use(authorize('manager', 'owner', 'admin'));

router.get('/status', getConnectStatus);
router.post('/account', createOrGetAccount);
router.post('/onboarding', createOnboardingLink);
router.post('/login-link', createLoginLink);

export default router;
