import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate, authorize, adminOnly } from '../middleware/auth.js';
import { uploadKYC } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// KYC upload
router.post('/kyc', uploadKYC.array('documents', 5), userController.uploadKycDocuments);

// Admin only routes
router.get('/admin/all', adminOnly, userController.getAllUsers);
router.get('/admin/people-summary', adminOnly, userController.getPeopleSummary);
router.get('/admin/people-map', adminOnly, userController.getPeopleMapData);
router.get('/admin/people', adminOnly, userController.getPeople);
router.post('/admin/create', adminOnly, userController.createUser);
router.get('/admin/stats', adminOnly, userController.getDashboardStats);
router.get('/:id', userController.getUserById);
router.put('/admin/:id', adminOnly, userController.updateUser);
router.delete('/admin/:id', adminOnly, userController.deleteUser);
router.post('/admin/:id/role', adminOnly, userController.assignRole);
router.post('/admin/:id/toggle-status', adminOnly, userController.toggleUserStatus);

export default router;
