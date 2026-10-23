import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', notificationController.getMyNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/calendar-summary', notificationController.getCalendarSummary);
router.get('/calendar', notificationController.getCalendarAgenda);
router.put('/mark-all-read', notificationController.markAllRead);
router.put('/:id/read', notificationController.markRead);
router.delete('/:id', notificationController.deleteNotification);

export default router;
