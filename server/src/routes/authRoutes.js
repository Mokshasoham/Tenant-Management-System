import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/uploadMiddleware.js';
import { validationMiddleware, validateUserRegistration, validateUserLogin, validateForgotPassword, validateResetPassword } from '../middleware/validation.js';

const router = express.Router();

router.post('/register', validateUserRegistration, validationMiddleware, authController.register);
router.post('/login', validateUserLogin, validationMiddleware, authController.login);
router.post('/google', authController.googleAuth);
router.post('/forgot-password', validateForgotPassword, validationMiddleware, authController.forgotPassword);
router.post('/reset-password/:token', validateResetPassword, validationMiddleware, authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);


// Protected routes
router.get('/profile', authenticate, authController.getCurrentUser);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/avatar', authenticate, uploadAvatar.single('avatar'), authController.uploadAvatar);
router.delete('/avatar', authenticate, authController.deleteAvatar);
router.post('/change-password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

// 2FA Routes
router.post('/login/2fa', authController.verify2FALogin);
router.post('/2fa/setup', authenticate, authController.setup2FA);
router.post('/2fa/verify', authenticate, authController.verifyAndEnable2FA);

export default router;
