import express from 'express';
import { getMySubscription, createSubscriptionCheckout, cancelSubscription } from '../controllers/subscriptionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/my', getMySubscription);
router.post('/checkout', createSubscriptionCheckout);
router.post('/cancel', cancelSubscription);

export default router;
