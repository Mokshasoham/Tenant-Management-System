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
  getActivePropertyVerification,
  getLatestByEntity,
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
  initiateAadhaarVerification,
  verifyAadhaarOtp,
  getAadhaarStatus,
  unlockAadhaar,
  verifyPanDocument,
  getPanStatus,
  unlockPan,
  verifyGstinDocument,
  getGstStatus,
  unlockGst,
} from '../controllers/verificationController.js';

import {
  globalVerificationLimiter,
  sensitiveVerificationLimiter,
  governmentOtpLimiter,
  adminVerificationLimiter,
} from '../middleware/verificationRateLimiter.js';
import getVerificationHealthDiagnostics from '../platform/security/verificationHealthDiagnostic.js';

const router = express.Router();

// All verification routes require authentication and global rate limiting
router.use(authenticate);
router.use(globalVerificationLimiter);

// ── Diagnostics & Health Diagnostic Route ───────────────────────
router.get('/health-diagnostics', authorize('admin', 'manager'), (req, res) => {
  res.status(200).json(getVerificationHealthDiagnostics());
});

// ── Static Catalog & Metadata Routes ─────────────────────────────
router.get('/templates', getDocumentTemplates);
router.get('/workflows', getWorkflows);
router.get('/widget/:profile/:entityId?', getWidgetData);
router.get('/history/:entityType/:entityId', getHistoryByEntity);
router.get('/property/:propertyId/active', getActivePropertyVerification);
router.get('/entity/:entityType/:entityId', getLatestByEntity);

// ── Admin Queue Route (Admin only) ────────────────────────────────
router.get('/', authorize('admin'), getVerifications);

// ── Phase 3.6.3 DigiLocker OAuth Callback Route ──────────────────
router.get('/digilocker/callback', handleDigiLockerCallback);

// ── Phase 3.6.1 Identity Verification Routes ──────────────────────
router.post('/:id/identity/start', sensitiveVerificationLimiter, startIdentityVerification);
router.post('/:id/identity/verify', sensitiveVerificationLimiter, verifyIdentity);
router.get('/:id/identity/status', getIdentityStatus);
router.post('/:id/identity/retry', sensitiveVerificationLimiter, retryIdentityVerification);
router.post('/:id/identity/unlock', authorize('admin'), adminVerificationLimiter, unlockIdentity);

// ── Phase 3.6.2 Property Verification Routes ──────────────────────
router.post('/:id/property/start', sensitiveVerificationLimiter, startPropertyVerification);
router.post('/:id/property/documents', sensitiveVerificationLimiter, uploadPropertyDocument);
router.post('/:id/property/verify', sensitiveVerificationLimiter, verifyProperty);
router.get('/:id/property/status', getPropertyStatus);
router.post('/:id/property/retry', sensitiveVerificationLimiter, retryPropertyVerification);
router.post('/:id/property/unlock', authorize('admin'), adminVerificationLimiter, unlockProperty);

// ── Phase 3.6.3 DigiLocker Document Acquisition Routes ───────────
router.get('/:id/digilocker/connect', sensitiveVerificationLimiter, connectDigiLocker);
router.get('/:id/digilocker/status', getDigiLockerStatus);
router.get('/:id/digilocker/documents', listDigiLockerDocuments);
router.post('/:id/digilocker/import', sensitiveVerificationLimiter, importDigiLockerDocument);
router.post('/:id/digilocker/disconnect', sensitiveVerificationLimiter, disconnectDigiLocker);

// ── Phase 3.6.4 Facial Verification Routes ────────────────────────
router.post('/:id/facial/consent', sensitiveVerificationLimiter, grantBiometricConsent);
router.post('/:id/facial/revoke-consent', sensitiveVerificationLimiter, revokeBiometricConsent);
router.post('/:id/facial/verify', sensitiveVerificationLimiter, verifyFacialBiometrics);
router.get('/:id/facial/status', getFacialStatus);
router.post('/:id/facial/retry', sensitiveVerificationLimiter, retryFacialVerification);
router.post('/:id/facial/unlock', authorize('admin'), adminVerificationLimiter, unlockFacialVerification);

// ── Phase 3.6.5 Video KYC Routes ──────────────────────────────────
router.post('/:id/video-kyc/consent', sensitiveVerificationLimiter, grantVideoKycConsent);
router.post('/:id/video-kyc/revoke-consent', sensitiveVerificationLimiter, revokeVideoKycConsent);
router.post('/:id/video-kyc/session', sensitiveVerificationLimiter, createVideoKycSession);
router.post('/:id/video-kyc/assign', authorize('admin', 'manager'), adminVerificationLimiter, assignVideoKycAgent);
router.post('/:id/video-kyc/evaluate', authorize('admin', 'manager'), adminVerificationLimiter, submitVideoKycEvaluation);
router.get('/:id/video-kyc/status', getVideoKycStatus);
router.post('/:id/video-kyc/unlock', authorize('admin'), adminVerificationLimiter, unlockVideoKyc);

// ── Phase 3.6.6 Fraud Detection Routes ───────────────────────────
router.post('/:id/fraud/evaluate', sensitiveVerificationLimiter, evaluateVerificationFraud);
router.get('/:id/fraud/status', getFraudStatus);
router.post('/:id/fraud/confirm', authorize('admin', 'manager'), adminVerificationLimiter, confirmFraud);
router.post('/:id/fraud/dismiss', authorize('admin', 'manager'), adminVerificationLimiter, dismissFraud);
router.post('/:id/fraud/unlock', authorize('admin'), adminVerificationLimiter, unlockFraudDetection);

// ── Phase 3.6.7 Sanctions, PEP & Adverse Media Screening Routes ──
router.post('/:id/sanction/screen', authorize('admin', 'manager'), sensitiveVerificationLimiter, screenSanction);
router.get('/:id/sanction/status', getSanctionStatus);
router.post('/:id/sanction/confirm', authorize('admin', 'manager'), adminVerificationLimiter, confirmSanctionMatch);
router.post('/:id/sanction/dismiss', authorize('admin', 'manager'), adminVerificationLimiter, dismissSanctionMatch);
router.post('/:id/sanction/unlock', authorize('admin'), adminVerificationLimiter, unlockSanctionScreening);

// ── Phase 3.6.8 Multi-Engine Evidence Fusion Routes ───────────────
router.post('/:id/fusion/synthesize', authorize('admin', 'manager'), sensitiveVerificationLimiter, synthesizeEvidence);
router.get('/:id/fusion/status', getFusionStatus);
router.post('/:id/fusion/confirm', authorize('admin', 'manager'), adminVerificationLimiter, confirmFusionRecommendation);
router.post('/:id/fusion/override', authorize('admin', 'manager'), adminVerificationLimiter, overrideFusionRecommendation);
router.post('/:id/fusion/unlock', authorize('admin'), adminVerificationLimiter, unlockFusion);

// ── Phase 3.6.9 Compliance Ledger & Regulatory Audit Routes ───────
router.get('/:id/compliance/ledger', getComplianceLedger);
router.get('/:id/compliance/verify', authorize('admin'), verifyLedgerIntegrity);
router.post('/:id/compliance/recertify', authorize('admin', 'manager'), adminVerificationLimiter, triggerRecertification);
router.get('/:id/compliance/export', authorize('admin', 'manager'), downloadCompliancePackage);

// ── Phase 3.6.4 Aadhaar, PAN & GST Verification Routes ────────────
router.post('/:id/aadhaar/initiate', governmentOtpLimiter, initiateAadhaarVerification);
router.post('/:id/aadhaar/verify', governmentOtpLimiter, verifyAadhaarOtp);
router.get('/:id/aadhaar/status', getAadhaarStatus);
router.post('/:id/aadhaar/unlock', authorize('admin'), adminVerificationLimiter, unlockAadhaar);

router.post('/:id/pan/verify', governmentOtpLimiter, verifyPanDocument);
router.get('/:id/pan/status', getPanStatus);
router.post('/:id/pan/unlock', authorize('admin'), adminVerificationLimiter, unlockPan);

router.post('/:id/gst/verify', governmentOtpLimiter, verifyGstinDocument);
router.get('/:id/gst/status', getGstStatus);
router.post('/:id/gst/unlock', authorize('admin'), adminVerificationLimiter, unlockGst);

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
