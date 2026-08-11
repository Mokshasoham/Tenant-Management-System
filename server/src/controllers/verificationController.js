import mongoose from 'mongoose';
import verificationService from '../services/verificationService.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';

const ALLOWED_ENTITY_TYPES = ['TENANT', 'MANAGER', 'PROPERTY', 'TECHNICIAN', 'VENDOR', 'BROKER'];

/**
 * Controller Layer for Verification & Trust Platform.
 * Enforces strict request validation, role boundaries, and delegates all business logic to verificationService.
 */

// 1. GET /api/verifications (Admin Queue / Filtered List)
export const getVerifications = asyncHandler(async (req, res) => {
  const { status, entityType, isOverdue, slaStatus, search, page = 1, limit = 20 } = req.query;

  const parsedOverdue = isOverdue === 'true' ? true : isOverdue === 'false' ? false : undefined;

  const result = await verificationService.getPendingQueue({
    status,
    entityType,
    isOverdue: parsedOverdue,
    slaStatus,
    search,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
});

// 2. GET /api/verifications/:id
export const getVerificationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const verification = await verificationService.getVerificationById(id);

  // Ownership Guard: Non-admin users can only view their own verification
  const requesterId = (req.user.userId || req.user._id || req.user.id).toString();
  const isOwner = verification.entityId.toString() === requesterId;
  const isAdminOrManager = ['admin', 'manager'].includes(req.user.role);

  if (!isOwner && !isAdminOrManager) {
    throw new AppError('Forbidden: You can only view your own verification records', 403);
  }

  res.status(200).json({
    success: true,
    data: verification,
  });
});

// 3. POST /api/verifications (Initiate Verification)
export const initiateVerification = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.body;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!entityType || !ALLOWED_ENTITY_TYPES.includes(entityType.toUpperCase())) {
    throw new AppError(`Invalid entityType. Allowed: ${ALLOWED_ENTITY_TYPES.join(', ')}`, 400);
  }

  const targetEntityId = entityId || requesterId;

  if (!mongoose.Types.ObjectId.isValid(targetEntityId)) {
    throw new AppError('Invalid target entityId format', 400);
  }

  // Permission Boundary: Non-admins can only initiate for themselves (unless initiating property)
  const isSelf = targetEntityId.toString() === requesterId.toString();
  const isAdminOrManager = ['admin', 'manager'].includes(req.user.role);

  if (!isSelf && !isAdminOrManager && entityType !== 'PROPERTY') {
    throw new AppError('Forbidden: Cannot initiate verification for another user', 403);
  }

  const verification = await verificationService.initiateVerification(
    entityType.toUpperCase(),
    targetEntityId,
    requesterId
  );

  res.status(201).json({
    success: true,
    message: 'Verification initiated successfully',
    data: verification,
  });
});

// 4. PUT /api/verifications/:id (Update Draft)
export const updateDraft = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const updated = await verificationService.updateDraft(id, req.body, requesterId);

  res.status(200).json({
    success: true,
    message: 'Verification draft updated',
    data: updated,
  });
});

// 5. POST /api/verifications/:id/submit (Submit Verification)
export const submitVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const submitted = await verificationService.submitVerification(id, requesterId);

  res.status(200).json({
    success: true,
    message: 'Verification submitted for review',
    data: submitted,
  });
});

// 6. POST /api/verifications/:id/resubmit (Resubmit Rejected Version)
export const resubmitVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const resubmitted = await verificationService.resubmitVerification(id, requesterId, req.body.documents);

  res.status(201).json({
    success: true,
    message: 'Verification resubmitted as a new version',
    data: resubmitted,
  });
});

// 7. POST /api/verifications/:id/documents (Upload / Attach Document)
export const uploadDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { documentType, fileId, filename, url } = req.body;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  if (!documentType || (!fileId && !url && !filename)) {
    throw new AppError('documentType and document file information (fileId, url, or filename) are required', 400);
  }

  const updated = await verificationService.uploadVerificationDocument(
    id,
    documentType.toUpperCase(),
    { fileId, filename, url },
    requesterId
  );

  res.status(200).json({
    success: true,
    message: `Document '${documentType}' attached successfully`,
    data: updated,
  });
});

// 8. POST /api/verifications/:id/review (Manager Level-2 Review)
export const reviewVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { decision, remarks } = req.body;
  const managerId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  if (!decision || !['APPROVE', 'REJECT'].includes(decision.toUpperCase())) {
    throw new AppError("Review decision must be 'APPROVE' or 'REJECT'", 400);
  }

  const reviewed = await verificationService.managerReview(id, managerId, decision.toUpperCase(), remarks || '');

  res.status(200).json({
    success: true,
    message: `Level 2 manager review recorded (${decision})`,
    data: reviewed,
  });
});

// 9. POST /api/verifications/:id/approve (Admin Final Approval)
export const approveVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { remarks } = req.body;
  const adminId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const approved = await verificationService.adminApprove(id, adminId, remarks || '');

  res.status(200).json({
    success: true,
    message: 'Verification approved and trust score updated',
    data: approved,
  });
});

// 10. POST /api/verifications/:id/reject (Admin Final Rejection)
export const rejectVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { remarks } = req.body;
  const adminId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  if (!remarks || remarks.trim().length === 0) {
    throw new AppError('Rejection remarks are required when rejecting a verification', 400);
  }

  const rejected = await verificationService.adminReject(id, adminId, remarks);

  res.status(200).json({
    success: true,
    message: 'Verification rejected with remarks',
    data: rejected,
  });
});

// 11. GET /api/verifications/history/:entityType/:entityId
export const getHistoryByEntity = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;

  if (!ALLOWED_ENTITY_TYPES.includes(entityType.toUpperCase())) {
    throw new AppError(`Invalid entityType. Allowed: ${ALLOWED_ENTITY_TYPES.join(', ')}`, 400);
  }

  if (!mongoose.Types.ObjectId.isValid(entityId)) {
    throw new AppError('Invalid entityId format', 400);
  }

  const history = await verificationService.getHistoryByEntity(entityType.toUpperCase(), entityId);

  res.status(200).json({
    success: true,
    data: history,
  });
});

// 12. GET /api/verifications/widget/:profile/:entityId?
export const getWidgetData = asyncHandler(async (req, res) => {
  const { profile, entityId } = req.params;
  const targetEntityId = entityId || req.user.userId || req.user._id || req.user.id;

  const widgetData = await verificationService.getWidgetData(profile, targetEntityId);

  res.status(200).json({
    success: true,
    data: widgetData,
  });
});

// 13. GET /api/verifications/templates
export const getDocumentTemplates = asyncHandler(async (_req, res) => {
  const templates = await verificationService.getDocumentTemplates();

  res.status(200).json({
    success: true,
    data: templates,
  });
});

// 14. GET /api/verifications/workflows
export const getWorkflows = asyncHandler(async (_req, res) => {
  const workflows = await verificationService.getWorkflows();

  res.status(200).json({
    success: true,
    data: workflows,
  });
});

// ── Phase 3.6.1 Identity Verification Handlers ─────────────────

const checkVerificationAccess = (verification, user) => {
  const requesterId = (user.userId || user._id || user.id).toString();
  const isOwner = verification.entityId?.toString() === requesterId;
  const isAdminOrManager = ['admin', 'manager'].includes(user.role);

  if (!isOwner && !isAdminOrManager) {
    throw new AppError('Forbidden: You can only access your own identity verification records', 403);
  }
};

// 15. POST /api/verifications/:id/identity/start
export const startIdentityVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const updated = await verificationService.verifyIdentity(id, req.body, requesterId);

  res.status(200).json({
    success: true,
    message: 'Identity verification started successfully',
    data: updated,
  });
});

// 16. POST /api/verifications/:id/identity/verify
export const verifyIdentity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const updated = await verificationService.verifyIdentity(id, req.body, requesterId);

  res.status(200).json({
    success: true,
    message: 'Identity verification evaluated successfully',
    data: updated,
  });
});

// 17. GET /api/verifications/:id/identity/status
export const getIdentityStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const identityStatus = await verificationService.getIdentityStatus(id);

  res.status(200).json({
    success: true,
    data: identityStatus,
  });
});

// 18. POST /api/verifications/:id/identity/retry
export const retryIdentityVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const updated = await verificationService.retryIdentityVerification(id, req.body, requesterId);

  res.status(200).json({
    success: true,
    message: 'Identity verification retried successfully',
    data: updated,
  });
});

// 19. POST /api/verifications/:id/identity/unlock (Admin Only)
export const unlockIdentity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const adminUserId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const updated = await verificationService.unlockIdentity(id, adminUserId, note || '');

  res.status(200).json({
    success: true,
    message: 'Identity verification unlocked by admin',
    data: updated,
  });
});

// ── Phase 3.6.2 Property Verification Handlers ─────────────────

const checkPropertyVerificationAccess = (verification, user) => {
  const requesterId = (user.userId || user._id || user.id).toString();
  const isOwner = verification.entityId?.toString() === requesterId;
  const isAdminOrManager = ['admin', 'manager'].includes(user.role);

  if (!isOwner && !isAdminOrManager) {
    throw new AppError('Forbidden: You can only access property verification records for authorized properties', 403);
  }
};

// 20. POST /api/verifications/:id/property/start
export const startPropertyVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkPropertyVerificationAccess(existing, req.user);

  const updated = await verificationService.verifyProperty(id, req.body, requesterId);

  res.status(200).json({
    success: true,
    message: 'Property verification started successfully',
    data: updated,
  });
});

// 21. POST /api/verifications/:id/property/documents
export const uploadPropertyDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { documentType } = req.body;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkPropertyVerificationAccess(existing, req.user);

  const fileData = {
    fileId: req.body.fileId || null,
    filename: req.body.filename || `${documentType}_doc`,
    url: req.body.url || `/uploads/${documentType}_doc.pdf`,
  };

  const updated = await verificationService.uploadVerificationDocument(id, documentType, fileData, requesterId);

  res.status(200).json({
    success: true,
    message: 'Property document uploaded successfully',
    data: updated,
  });
});

// 22. POST /api/verifications/:id/property/verify
export const verifyProperty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkPropertyVerificationAccess(existing, req.user);

  const updated = await verificationService.verifyProperty(id, req.body, requesterId);

  res.status(200).json({
    success: true,
    message: 'Property verification evaluated successfully',
    data: updated,
  });
});

// 23. GET /api/verifications/:id/property/status
export const getPropertyStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkPropertyVerificationAccess(existing, req.user);

  const statusData = await verificationService.getPropertyStatus(id);

  res.status(200).json({
    success: true,
    data: statusData,
  });
});

// 24. POST /api/verifications/:id/property/retry
export const retryPropertyVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkPropertyVerificationAccess(existing, req.user);

  const updated = await verificationService.retryPropertyVerification(id, req.body, requesterId);

  res.status(200).json({
    success: true,
    message: 'Property verification retried successfully',
    data: updated,
  });
});

// 25. POST /api/verifications/:id/property/unlock (Admin Only)
export const unlockProperty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const adminUserId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const updated = await verificationService.unlockProperty(id, adminUserId, note || '');

  res.status(200).json({
    success: true,
    message: 'Property verification unlocked by admin',
    data: updated,
  });
});

// ── Phase 3.6.3 DigiLocker Route Handlers ─────────────────

// 26. GET /api/verifications/:id/digilocker/connect
export const connectDigiLocker = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const connectData = await verificationService.getDigiLockerConnectUrl(id, requesterId);

  res.status(200).json({
    success: true,
    data: connectData,
  });
});

// 27. GET /api/verifications/digilocker/callback
export const handleDigiLockerCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!code || !state) {
    throw new AppError('Missing required OAuth parameters (code, state)', 400);
  }

  const updated = await verificationService.handleDigiLockerCallback(code, state, requesterId);

  res.status(200).json({
    success: true,
    message: 'DigiLocker account connected successfully',
    data: updated,
  });
});

// 28. GET /api/verifications/:id/digilocker/status
export const getDigiLockerStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const statusData = await verificationService.getDigiLockerStatus(id);

  res.status(200).json({
    success: true,
    data: statusData,
  });
});

// 29. GET /api/verifications/:id/digilocker/documents
export const listDigiLockerDocuments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const documents = await verificationService.listDigiLockerDocuments(id);

  res.status(200).json({
    success: true,
    data: documents,
  });
});

// 30. POST /api/verifications/:id/digilocker/import
export const importDigiLockerDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const updated = await verificationService.importDigiLockerDocument(id, req.body, requesterId);

  res.status(200).json({
    success: true,
    message: 'DigiLocker document imported and evaluated successfully',
    data: updated,
  });
});

// 31. POST /api/verifications/:id/digilocker/disconnect
export const disconnectDigiLocker = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const updated = await verificationService.disconnectDigiLocker(id, requesterId);

  res.status(200).json({
    success: true,
    message: 'DigiLocker connection disconnected successfully',
    data: updated,
  });
});

// ── Phase 3.6.4 Facial Verification Handlers ─────────────────

// 32. POST /api/verifications/:id/facial/consent
export const grantBiometricConsent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const updated = await verificationService.grantBiometricConsent(id, requesterId, ipAddress);

  res.status(200).json({
    success: true,
    message: 'Biometric processing consent granted successfully',
    data: updated,
  });
});

// 33. POST /api/verifications/:id/facial/revoke-consent
export const revokeBiometricConsent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const updated = await verificationService.revokeBiometricConsent(id, requesterId);

  res.status(200).json({
    success: true,
    message: 'Biometric processing consent revoked successfully',
    data: updated,
  });
});

// 34. POST /api/verifications/:id/facial/verify
export const verifyFacialBiometrics = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const updated = await verificationService.verifyFacialBiometrics(id, req.body, requesterId);

  res.status(200).json({
    success: true,
    message: 'Facial biometric & liveness verification evaluated successfully',
    data: updated,
  });
});

// 35. GET /api/verifications/:id/facial/status
export const getFacialStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const statusData = await verificationService.getFacialStatus(id);

  res.status(200).json({
    success: true,
    data: statusData,
  });
});

// 36. POST /api/verifications/:id/facial/retry
export const retryFacialVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const updated = await verificationService.retryFacialVerification(id, req.body, requesterId);

  res.status(200).json({
    success: true,
    message: 'Facial verification retried successfully',
    data: updated,
  });
});

// 37. POST /api/verifications/:id/facial/unlock (Admin Only)
export const unlockFacialVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const adminUserId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const updated = await verificationService.unlockFacialVerification(id, adminUserId, note || '');

  res.status(200).json({
    success: true,
    message: 'Facial verification unlocked by admin',
    data: updated,
  });
});

// ── Phase 3.6.5 Video KYC Handlers ────────────────────────────

// 38. POST /api/verifications/:id/video-kyc/consent
export const grantVideoKycConsent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const updated = await verificationService.grantVideoKycConsent(id, req.body, requesterId, ipAddress);

  res.status(200).json({
    success: true,
    message: 'Video KYC consent granted successfully',
    data: updated,
  });
});

// 39. POST /api/verifications/:id/video-kyc/revoke-consent
export const revokeVideoKycConsent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const updated = await verificationService.revokeVideoKycConsent(id, requesterId);

  res.status(200).json({
    success: true,
    message: 'Video KYC consent revoked successfully',
    data: updated,
  });
});

// 40. POST /api/verifications/:id/video-kyc/session
export const createVideoKycSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId || req.user._id || req.user.id;
  const userRole = req.user.role || 'tenant';

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const result = await verificationService.createVideoKycSession(id, req.body, requesterId, userRole);

  res.status(200).json({
    success: true,
    message: 'Video KYC WebRTC session created successfully',
    data: result,
  });
});

// 41. POST /api/verifications/:id/video-kyc/assign
export const assignVideoKycAgent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { agentId, agentName } = req.body;
  const assignedById = req.user.userId || req.user._id || req.user.id;
  const actorRole = req.user.role || 'manager';

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  if (!agentId || !agentName) {
    throw new AppError('agentId and agentName are required for Video KYC assignment', 400);
  }

  const updated = await verificationService.assignVideoKycAgent(id, agentId, agentName, assignedById, actorRole);

  res.status(200).json({
    success: true,
    message: 'Video KYC agent assigned successfully',
    data: updated,
  });
});

// 42. POST /api/verifications/:id/video-kyc/evaluate
export const submitVideoKycEvaluation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const agentId = req.user.userId || req.user._id || req.user.id;
  const agentRole = req.user.role || 'manager';

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const updated = await verificationService.submitVideoKycEvaluation(id, req.body, agentId, agentRole);

  res.status(200).json({
    success: true,
    message: 'Video KYC session evaluation submitted successfully',
    data: updated,
  });
});

// 43. GET /api/verifications/:id/video-kyc/status
export const getVideoKycStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role || 'tenant';

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const existing = await verificationService.getVerificationById(id);
  checkVerificationAccess(existing, req.user);

  const statusData = await verificationService.getVideoKycStatus(id, userRole);

  res.status(200).json({
    success: true,
    data: statusData,
  });
});

// 44. POST /api/verifications/:id/video-kyc/unlock (Admin Only)
export const unlockVideoKyc = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const adminUserId = req.user.userId || req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid verification ID format', 400);
  }

  const updated = await verificationService.unlockVideoKyc(id, adminUserId, note || '');

  res.status(200).json({
    success: true,
    message: 'Video KYC verification unlocked by admin',
    data: updated,
  });
});

