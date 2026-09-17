import express from 'express';
import {
  submitFeedback,
  getEligibility,
  getMyFeedback,
  getLeaseFeedback,
  getPropertyFeedback,
  updateFeedbackStatus,
} from '../controllers/feedbackController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public property review and rating aggregation
router.get('/property/:propertyId', getPropertyFeedback);

// Authenticated tenant routes
router.post('/', authenticate, submitFeedback);
router.get('/eligibility/:leaseId', authenticate, getEligibility);
router.get('/my', authenticate, getMyFeedback);
router.get('/lease/:leaseId', authenticate, getLeaseFeedback);

// Manager / Admin moderation route
router.put('/:id/status', authenticate, updateFeedbackStatus);

export default router;
