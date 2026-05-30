import express from 'express';
import { createRentCheckoutSession } from '../controllers/stripeController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Protected routes
router.use(authenticate);
router.post('/create-checkout-session', createRentCheckoutSession);

export default router;
