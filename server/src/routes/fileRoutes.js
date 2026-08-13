import express from 'express';
import { getSignedUrlForFile, downloadFile } from '../controllers/fileController.js';
import { authenticate } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Configurable upload/download rate limit (300 requests per minute to support property galleries)
const fileLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300,
  message: {
    success: false,
    message: 'Too many file requests from this IP, please try again after a minute.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(fileLimit);

// Secure Signed URL endpoint
router.get('/signed-url/:fileId', authenticate, getSignedUrlForFile);

// Secure Download / Preview endpoint
router.get('/download/:fileId', downloadFile);

export default router;
