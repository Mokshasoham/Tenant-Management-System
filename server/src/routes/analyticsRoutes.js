import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'manager'));

router.get('/revenue', analyticsController.getRevenueOverTime);
router.get('/occupancy', analyticsController.getOccupancyStats);
router.get('/collection-rate', analyticsController.getPaymentCollectionRate);
router.get('/summary', analyticsController.getSummaryStats);
router.get('/top-properties', analyticsController.getTopProperties);

export default router;
