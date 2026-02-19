import express from 'express';
import {
    createReview,
    getPropertyReviews,
    replyToReview,
    deleteReview,
    markHelpful,
} from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createReview);
router.get('/property/:propertyId', getPropertyReviews);
router.put('/:id/reply', replyToReview);
router.delete('/:id', deleteReview);
router.post('/:id/helpful', markHelpful);

export default router;
