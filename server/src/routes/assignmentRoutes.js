/**
 * server/src/routes/assignmentRoutes.js
 * Express routes for Smart Technician Assignment & Dispatch Intelligence.
 */

import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  getRecommendations,
  getRecommendationHistory,
  recordDecision,
  simulateAssignment,
  optimizeRoute,
  getAnalytics,
  getConfig,
  updateConfig
} from '../controllers/assignmentController.js';

const router = express.Router();

router.use(authenticate);

router.get('/recommendations/:ticketId', authorizeRoles('admin', 'manager'), getRecommendations);
router.get('/recommendations/:ticketId/history', authorizeRoles('admin', 'manager'), getRecommendationHistory);
router.post('/decision', authorizeRoles('admin', 'manager'), recordDecision);
router.post('/simulate', authorizeRoles('admin', 'manager'), simulateAssignment);
router.post('/route-optimize', authorizeRoles('admin', 'manager'), optimizeRoute);

router.get('/analytics', authorizeRoles('admin', 'manager'), getAnalytics);
router.get('/config', authorizeRoles('admin', 'manager'), getConfig);
router.put('/config', authorizeRoles('admin', 'manager'), updateConfig);

export default router;
