import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate, authorize, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// Admin only routes
router.get('/admin/all', adminOnly, userController.getAllUsers);
router.post('/admin/create', adminOnly, userController.createUser);
router.get('/admin/stats', adminOnly, userController.getDashboardStats);
router.get('/:id', userController.getUserById);
router.put('/admin/:id', adminOnly, userController.updateUser);
router.delete('/admin/:id', adminOnly, userController.deleteUser);
router.post('/admin/:id/role', adminOnly, userController.assignRole);
router.post('/admin/:id/toggle-status', adminOnly, userController.toggleUserStatus);

export default router;
