import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getVerifications,
  getVerificationById,
  initiateVerification,
  updateDraft,
  submitVerification,
  resubmitVerification,
  uploadDocument,
  reviewVerification,
  approveVerification,
  rejectVerification,
  getHistoryByEntity,
  getWidgetData,
  getDocumentTemplates,
  getWorkflows,
  startIdentityVerification,
  verifyIdentity,
  getIdentityStatus,
  retryIdentityVerification,
  unlockIdentity,
} from '../controllers/verificationController.js';

const router = express.Router();

// All verification routes require authentication
router.use(authenticate);

// ── Static Catalog & Metadata Routes ─────────────────────────────
router.get('/templates', getDocumentTemplates);
router.get('/workflows', getWorkflows);
router.get('/widget/:profile/:entityId?', getWidgetData);
router.get('/history/:entityType/:entityId', getHistoryByEntity);

// ── Admin Queue Route (Admin only) ────────────────────────────────
router.get('/', authorize('admin'), getVerifications);

// ── Phase 3.6.1 Identity Verification Routes ──────────────────────
router.post('/:id/identity/start', startIdentityVerification);
router.post('/:id/identity/verify', verifyIdentity);
router.get('/:id/identity/status', getIdentityStatus);
router.post('/:id/identity/retry', retryIdentityVerification);
router.post('/:id/identity/unlock', authorize('admin'), unlockIdentity);

// ── Item Action Routes ─────────────────────────────────────────────
router.get('/:id', getVerificationById);
router.post('/', initiateVerification);
router.put('/:id', updateDraft);
router.post('/:id/submit', submitVerification);
router.post('/:id/resubmit', resubmitVerification);
router.post('/:id/documents', uploadDocument);

// ── Level 2 Manager Review Route (Manager & Admin) ─────────────────
router.post('/:id/review', authorize('manager', 'admin'), reviewVerification);

// ── Level 3 Admin Decision Routes (Admin only) ────────────────────
router.post('/:id/approve', authorize('admin'), approveVerification);
router.post('/:id/reject', authorize('admin'), rejectVerification);

export default router;
