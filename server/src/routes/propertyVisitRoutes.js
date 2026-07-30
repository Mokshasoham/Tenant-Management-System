import express from 'express';
import {
    requestVisit,
    getMyVisits,
    getManagerVisits,
    updateVisitStatus,
    submitVisitFeedback,
    setNotInterested
} from '../controllers/propertyVisitController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', requestVisit);
router.get('/my-visits', getMyVisits);
router.get('/manager-visits', getManagerVisits);
router.patch('/:id/status', updateVisitStatus);
router.post('/:id/feedback', submitVisitFeedback);
router.post('/:id/not-interested', setNotInterested);

export default router;
