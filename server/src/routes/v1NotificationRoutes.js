import express from 'express';
import * as v1NotificationController from '../controllers/v1NotificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All notification events endpoints require authentication
router.use(authenticate);

// Queries & Stats
router.get('/', v1NotificationController.getMyNotifications);
router.get('/unread-count', v1NotificationController.getUnreadCount);
router.get('/calendar', v1NotificationController.getCalendarAgenda);
router.get('/stats', v1NotificationController.getStats);

// Single Item Mutations
router.patch('/:id/read', v1NotificationController.markRead);
router.put('/:id/read', v1NotificationController.markRead);
router.put('/:id/archive', v1NotificationController.toggleArchive);
router.delete('/:id', v1NotificationController.deleteNotification);

// Bulk Mutations
router.patch('/bulk-read', v1NotificationController.bulkRead);
router.patch('/read-all', v1NotificationController.markAllRead);
router.put('/mark-all-read', v1NotificationController.markAllRead);
router.put('/read-all', v1NotificationController.markAllRead);
router.post('/bulk-delete', v1NotificationController.bulkDelete);
router.delete('/clear-read', v1NotificationController.clearAllRead);

export default router;
