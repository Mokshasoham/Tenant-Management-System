import express from 'express';
import { requestPayout, getAllPayoutRequests, approvePayout, rejectPayout, getOwnerBalance } from '../controllers/payoutController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Owner routes
router.get('/balance', authorize('owner'), getOwnerBalance);
router.post('/request', authorize('owner'), requestPayout);

// Admin routes
router.get('/', authorize('admin'), getAllPayoutRequests);
router.put('/:id/approve', authorize('admin'), approvePayout);
router.put('/:id/reject', authorize('admin'), rejectPayout);

export default router;
