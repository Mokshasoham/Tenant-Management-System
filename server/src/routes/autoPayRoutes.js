import express from 'express';
import {
  getAutoPayStatus,
  getMyAutoPays,
  createSetupIntent,
  verifyAndEnableAutoPay,
  disableAutoPay,
} from '../controllers/autoPayController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All AutoPay endpoints are strictly protected by authenticated JWT
router.use(authenticate);

router.get('/status/:leaseId', getAutoPayStatus);
router.get('/my-autopays', getMyAutoPays);
router.post('/setup-intent', createSetupIntent);
router.post('/verify-and-enable', verifyAndEnableAutoPay);
router.post('/disable', disableAutoPay);

export default router;
