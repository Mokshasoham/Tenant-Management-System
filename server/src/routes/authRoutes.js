import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validationMiddleware, validateUserRegistration, validateUserLogin, validateForgotPassword, validateResetPassword } from '../middleware/validation.js';

const router = express.Router();

router.post('/register', validateUserRegistration, validationMiddleware, authController.register);
router.post('/login', validateUserLogin, validationMiddleware, authController.login);
router.post('/forgot-password', validateForgotPassword, validationMiddleware, authController.forgotPassword);
router.post('/reset-password/:token', validateResetPassword, validationMiddleware, authController.resetPassword);

// Protected routes
router.get('/profile', authenticate, authController.getCurrentUser);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

export default router;
