import express from 'express';
import * as v1NotificationController from '../controllers/v1NotificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All notification events endpoints require authentication
router.use(authenticate);

// ─── IMPORTANT: Specific named paths MUST come before wildcard /:id routes ───
// Express matches top-to-bottom. If /:id comes first, 'bulk-read', 'clear-read',
// 'read-all' etc. are treated as IDs and hit the wrong handler.

// Queries & Stats
router.get('/unread-count', v1NotificationController.getUnreadCount);
router.get('/calendar', v1NotificationController.getCalendarAgenda);
router.get('/stats', v1NotificationController.getStats);

// Bulk Mutations (named routes — must precede /:id)
router.patch('/bulk-read', v1NotificationController.bulkRead);
router.patch('/read-all', v1NotificationController.markAllRead);
router.put('/mark-all-read', v1NotificationController.markAllRead);
router.put('/read-all', v1NotificationController.markAllRead);
router.post('/bulk-delete', v1NotificationController.bulkDelete);
router.delete('/clear-read', v1NotificationController.clearAllRead);

// Collection list query
router.get('/', v1NotificationController.getMyNotifications);

// Single Item Mutations (wildcard /:id — LAST so named routes above match first)
router.patch('/:id/read', v1NotificationController.markRead);
router.put('/:id/read', v1NotificationController.markRead);
router.put('/:id/archive', v1NotificationController.toggleArchive);
router.delete('/:id', v1NotificationController.deleteNotification);

export default router;
