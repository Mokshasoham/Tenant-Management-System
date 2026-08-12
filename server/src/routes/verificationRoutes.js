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
  startPropertyVerification,
  uploadPropertyDocument,
  verifyProperty,
  getPropertyStatus,
  retryPropertyVerification,
  unlockProperty,
  connectDigiLocker,
  handleDigiLockerCallback,
  getDigiLockerStatus,
  listDigiLockerDocuments,
  importDigiLockerDocument,
  disconnectDigiLocker,
  grantBiometricConsent,
  revokeBiometricConsent,
  verifyFacialBiometrics,
  getFacialStatus,
  retryFacialVerification,
  unlockFacialVerification,
  grantVideoKycConsent,
  revokeVideoKycConsent,
  createVideoKycSession,
  assignVideoKycAgent,
  submitVideoKycEvaluation,
  getVideoKycStatus,
  unlockVideoKyc,
  evaluateVerificationFraud,
  getFraudStatus,
  confirmFraud,
  dismissFraud,
  unlockFraudDetection,
  screenSanction,
  getSanctionStatus,
  confirmSanctionMatch,
  dismissSanctionMatch,
  unlockSanctionScreening,
  synthesizeEvidence,
  getFusionStatus,
  confirmFusionRecommendation,
  overrideFusionRecommendation,
  unlockFusion,
  getComplianceLedger,
  verifyLedgerIntegrity,
  triggerRecertification,
  downloadCompliancePackage,
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

// ── Phase 3.6.3 DigiLocker OAuth Callback Route ──────────────────
router.get('/digilocker/callback', handleDigiLockerCallback);

// ── Phase 3.6.1 Identity Verification Routes ──────────────────────
router.post('/:id/identity/start', startIdentityVerification);
router.post('/:id/identity/verify', verifyIdentity);
router.get('/:id/identity/status', getIdentityStatus);
router.post('/:id/identity/retry', retryIdentityVerification);
router.post('/:id/identity/unlock', authorize('admin'), unlockIdentity);

// ── Phase 3.6.2 Property Verification Routes ──────────────────────
router.post('/:id/property/start', startPropertyVerification);
router.post('/:id/property/documents', uploadPropertyDocument);
router.post('/:id/property/verify', verifyProperty);
router.get('/:id/property/status', getPropertyStatus);
router.post('/:id/property/retry', retryPropertyVerification);
router.post('/:id/property/unlock', authorize('admin'), unlockProperty);

// ── Phase 3.6.3 DigiLocker Document Acquisition Routes ───────────
router.get('/:id/digilocker/connect', connectDigiLocker);
router.get('/:id/digilocker/status', getDigiLockerStatus);
router.get('/:id/digilocker/documents', listDigiLockerDocuments);
router.post('/:id/digilocker/import', importDigiLockerDocument);
router.post('/:id/digilocker/disconnect', disconnectDigiLocker);

// ── Phase 3.6.4 Facial Verification Routes ────────────────────────
router.post('/:id/facial/consent', grantBiometricConsent);
router.post('/:id/facial/revoke-consent', revokeBiometricConsent);
router.post('/:id/facial/verify', verifyFacialBiometrics);
router.get('/:id/facial/status', getFacialStatus);
router.post('/:id/facial/retry', retryFacialVerification);
router.post('/:id/facial/unlock', authorize('admin'), unlockFacialVerification);

// ── Phase 3.6.5 Video KYC Routes ──────────────────────────────────
router.post('/:id/video-kyc/consent', grantVideoKycConsent);
router.post('/:id/video-kyc/revoke-consent', revokeVideoKycConsent);
router.post('/:id/video-kyc/session', createVideoKycSession);
router.post('/:id/video-kyc/assign', authorize('admin', 'manager'), assignVideoKycAgent);
router.post('/:id/video-kyc/evaluate', authorize('admin', 'manager'), submitVideoKycEvaluation);
router.get('/:id/video-kyc/status', getVideoKycStatus);
router.post('/:id/video-kyc/unlock', authorize('admin'), unlockVideoKyc);

// ── Phase 3.6.6 Fraud Detection Routes ───────────────────────────
router.post('/:id/fraud/evaluate', evaluateVerificationFraud);
router.get('/:id/fraud/status', getFraudStatus);
router.post('/:id/fraud/confirm', authorize('admin', 'manager'), confirmFraud);
router.post('/:id/fraud/dismiss', authorize('admin', 'manager'), dismissFraud);
router.post('/:id/fraud/unlock', authorize('admin'), unlockFraudDetection);

// ── Phase 3.6.7 Sanctions, PEP & Adverse Media Screening Routes ──
router.post('/:id/sanction/screen', authorize('admin', 'manager'), screenSanction);
router.get('/:id/sanction/status', getSanctionStatus);
router.post('/:id/sanction/confirm', authorize('admin', 'manager'), confirmSanctionMatch);
router.post('/:id/sanction/dismiss', authorize('admin', 'manager'), dismissSanctionMatch);
router.post('/:id/sanction/unlock', authorize('admin'), unlockSanctionScreening);

// ── Phase 3.6.8 Multi-Engine Evidence Fusion Routes ───────────────
router.post('/:id/fusion/synthesize', authorize('admin', 'manager'), synthesizeEvidence);
router.get('/:id/fusion/status', getFusionStatus);
router.post('/:id/fusion/confirm', authorize('admin', 'manager'), confirmFusionRecommendation);
router.post('/:id/fusion/override', authorize('admin', 'manager'), overrideFusionRecommendation);
router.post('/:id/fusion/unlock', authorize('admin'), unlockFusion);

// ── Phase 3.6.9 Compliance Ledger & Regulatory Audit Routes ───────
router.get('/:id/compliance/ledger', getComplianceLedger);
router.get('/:id/compliance/verify', authorize('admin'), verifyLedgerIntegrity);
router.post('/:id/compliance/recertify', authorize('admin', 'manager'), triggerRecertification);
router.get('/:id/compliance/export', authorize('admin', 'manager'), downloadCompliancePackage);

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
