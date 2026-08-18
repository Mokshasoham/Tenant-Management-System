import express from 'express';
import { 
  requestPayout, 
  getAllPayoutRequests, 
  getPayoutById, 
  approvePayout, 
  rejectPayout, 
  getPayoutSummary, 
  handlePayoutWebhook 
} from '../controllers/payoutController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public Webhook (verified via Stripe signature)
router.post('/webhook', handlePayoutWebhook);

// Authenticated Routes
router.use(authenticate);

// Manager / Owner / Admin routes
router.get('/summary', authorize('manager', 'owner', 'admin'), getPayoutSummary);
router.get('/balance', authorize('manager', 'owner', 'admin'), getPayoutSummary);
router.get('/', authorize('manager', 'owner', 'admin'), getAllPayoutRequests);
router.post('/request', authorize('manager', 'owner', 'admin'), requestPayout);
router.get('/:id', authorize('manager', 'owner', 'admin'), getPayoutById);

// Admin Action routes
router.put('/:id/approve', authorize('admin'), approvePayout);
router.put('/:id/reject', authorize('admin'), rejectPayout);

export default router;

