import express from 'express';
import { 
  requestPayout, 
  getAllPayoutRequests, 
  getPayoutById, 
  approvePayout, 
  rejectPayout, 
  getPayoutSummary, 
  handlePayoutWebhook,
  verifyBankAccount,
  connectBankAccount,
  getConnectedBankAccount,
  disconnectBankAccount
} from '../controllers/payoutController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public Webhook (verified via provider signature)
router.post('/webhook', handlePayoutWebhook);

// Authenticated Routes
router.use(authenticate);

// Bank Account Management Routes (Manager / Owner / Admin)
router.post('/bank-account/verify', authorize('manager', 'owner', 'admin'), verifyBankAccount);
router.post('/bank-account/connect', authorize('manager', 'owner', 'admin'), connectBankAccount);
router.get('/bank-account', authorize('manager', 'owner', 'admin'), getConnectedBankAccount);
router.delete('/bank-account', authorize('manager', 'owner', 'admin'), disconnectBankAccount);

// Financials & Payout Routes
router.get('/summary', authorize('manager', 'owner', 'admin'), getPayoutSummary);
router.get('/balance', authorize('manager', 'owner', 'admin'), getPayoutSummary);
router.get('/', authorize('manager', 'owner', 'admin'), getAllPayoutRequests);
router.post('/request', authorize('manager', 'owner', 'admin'), requestPayout);
router.get('/:id', authorize('manager', 'owner', 'admin'), getPayoutById);

// Admin Action routes
router.put('/:id/approve', authorize('admin'), approvePayout);
router.put('/:id/reject', authorize('admin'), rejectPayout);

export default router;


