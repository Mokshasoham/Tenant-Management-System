import express from 'express';
import {
  getFeePreview,
  getPublicConfig,
  getPlatformSettings,
  updatePlatformSettings,
  getAdminRevenueSummary,
} from '../controllers/platformController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public / Authenticated Preview & Config endpoints for pre-checkout breakdown & maintenance settings
router.get('/fee-preview', getFeePreview);
router.get('/public-config', getPublicConfig);

// Admin-protected Settings & Revenue endpoints
router.use(authenticate);
router.get('/settings', authorize('admin'), getPlatformSettings);
router.put('/settings', authorize('admin'), updatePlatformSettings);
router.get('/revenue-summary', authorize('admin'), getAdminRevenueSummary);

export default router;
