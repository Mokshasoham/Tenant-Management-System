/**
 * server/src/routes/workforceSchedulingRoutes.js
 * Routes for Workforce Scheduling, Auto-Assignment & Dispatch Board endpoints.
 */

import express from 'express';
import * as schedulingController from '../controllers/workforceSchedulingController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/calendar', schedulingController.getScheduleCalendar);
router.get('/auto-suggest/:ticketId', schedulingController.autoSuggestTechnician);
router.post('/conflicts', schedulingController.detectConflicts);

router.post('/shifts', authorize('manager', 'admin'), schedulingController.createShift);
router.post('/dispatch', authorize('manager', 'admin'), schedulingController.dispatchTicket);
router.post('/leave', schedulingController.requestLeave);
router.put('/leave/:id/approve', authorize('manager', 'admin'), schedulingController.approveLeave);

export default router;
