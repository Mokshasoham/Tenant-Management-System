import express from 'express';
import {
  getFeePreview,
  getPlatformSettings,
  updatePlatformSettings,
  getAdminRevenueSummary,
} from '../controllers/platformController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public / Authenticated Preview endpoint for pre-checkout breakdown
router.get('/fee-preview', getFeePreview);

// Admin-protected Settings & Revenue endpoints
router.use(authenticate);
router.get('/settings', authorize('admin'), getPlatformSettings);
router.put('/settings', authorize('admin'), updatePlatformSettings);
router.get('/revenue-summary', authorize('admin'), getAdminRevenueSummary);

export default router;
