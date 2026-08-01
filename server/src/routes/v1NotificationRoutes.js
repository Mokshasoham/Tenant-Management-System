import express from 'express';
import * as v1NotificationController from '../controllers/v1NotificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All notification events endpoints are secure and require token authorization
router.use(authenticate);

router.get('/', v1NotificationController.getMyNotifications);
router.get('/calendar', v1NotificationController.getCalendarAgenda);
router.get('/stats', v1NotificationController.getStats);
router.put('/mark-all-read', v1NotificationController.markAllRead);
router.put('/:id/archive', v1NotificationController.toggleArchive);
router.put('/:id/read', v1NotificationController.markRead);
router.delete('/:id', v1NotificationController.deleteNotification);

export default router;
