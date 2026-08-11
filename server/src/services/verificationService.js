import verificationRepository from '../repositories/verificationRepository.js';
import trustScoreService from './trustScoreService.js';
import identityVerificationService from './identityVerificationService.js';
import propertyVerificationService from './propertyVerificationService.js';
import digilockerService from './digilockerService.js';
import facialVerificationService from './facialVerificationService.js';
import Counter from '../models/Counter.js';
import User from '../models/User.js';
import Property from '../models/Property.js';
import config from '../config/config.js';
import logger from '../platform/logging/logger.js';
import eventBus from '../platform/events/eventBus.js';
import { EventTypes } from '../platform/events/eventTypes.js';
import { AppError } from '../utils/errorHandling.js';

export class VerificationService {
  // ── Number Generator ─────────────────────────────────────────────

  async generateVerificationNumber() {
    const year = new Date().getFullYear();
    const key = `verification_${year}`;

    const counter = await Counter.findOneAndUpdate(
      { _id: key },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );

    const padded = String(counter.seq).padStart(6, '0');
    return `VRF-${year}-${padded}`;
  }

  // ── 1. Initiate Verification ─────────────────────────────────────

  async initiateVerification(entityType, entityId, requesterId) {
    // 1. Check if an active latest version already exists
    const existing = await verificationRepository.findLatestByEntity(entityType, entityId);
    if (existing && ['SUBMITTED', 'DOCUMENTS_UPLOADED', 'AUTO_REVIEW', 'MANAGER_REVIEW', 'ADMIN_REVIEW'].includes(existing.status)) {
      return existing; // Return active in-progress verification
    }

    // 2. Load workflow configuration
    const workflow = await verificationRepository.findWorkflowByType(entityType);
    if (!workflow) {
      throw new AppError(`No active verification workflow found for entity type '${entityType}'`, 400);
    }

    // 3. Build document requirements from workflow steps & templates
    const initialDocuments = [];
    for (const step of workflow.steps || []) {
      if (step.isEnabled && step.documentTypes?.length > 0) {
        for (const docType of step.documentTypes) {
          const template = await verificationRepository.findDocumentTemplate(docType);
          initialDocuments.push({
            templateId: template?._id || null,
            documentType: docType,
            label: template?.label || docType,
            isRequired: step.isRequired,
            reviewStatus: 'PENDING',
            renewalStatus: 'NOT_APPLICABLE',
          });
        }
      }
    }

    const entityModel = entityType === 'PROPERTY' ? 'Property' : 'User';

    const verificationData = {
      entityType,
      entityId,
      entityModel,
      workflowId: workflow._id,
      engineVersion: config.ENGINE_VERSION || 'demo-v1',
      status: 'DRAFT',
      currentStep: workflow.steps?.[0]?.stepKey || 'email',
      completedSteps: [],
      reviewLevels: {
        currentLevel: workflow.levelsRequired?.[0] || 1,
        levelsRequired: workflow.levelsRequired || [1, 3],
      },
      documents: initialDocuments,
      sla: {
        slaHours: workflow.slaConfig?.targetHours || 48,
        slaStatus: 'NOT_STARTED',
        isOverdue: false,
      },
      timeline: [
        {
          event: 'DRAFT_CREATED',
          performedBy: requesterId,
          performedAt: new Date(),
          note: `Verification initiated for ${entityType}`,
        },
      ],
      isDemoVerification: config.DEMO_MODE || false,
    };

    const newVerification = await verificationRepository.createVerification(verificationData);
    logger.info(`[VerificationService] Initiated verification for ${entityType}:${entityId} [ID: ${newVerification._id}]`);
    return newVerification;
  }

  // ── 2. Submit Verification ───────────────────────────────────────

  async submitVerification(verificationId, requesterId) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError('Verification document not found', 404);
    }

    if (verification.status !== 'DRAFT' && verification.status !== 'DOCUMENTS_UPLOADED') {
      throw new AppError(`Cannot submit verification in '${verification.status}' status`, 400);
    }

    const now = new Date();
    const vrfNumber = verification.verificationNumber || (await this.generateVerificationNumber());
    const targetHours = verification.sla?.slaHours || 48;
    const targetReviewAt = new Date(now.getTime() + targetHours * 60 * 60 * 1000);

    const updateData = {
      verificationNumber: vrfNumber,
      status: 'SUBMITTED',
      submittedAt: now,
      'sla.submittedAt': now,
      'sla.targetReviewAt': targetReviewAt,
      'sla.slaStatus': 'ON_TIME',
      'sla.isOverdue': false,
    };

    const updated = await verificationRepository.updateVerification(verificationId, updateData);

    await verificationRepository.addTimelineEvent(verificationId, {
      event: 'SUBMITTED',
      performedBy: requesterId,
      performedAt: now,
      note: `Verification submitted under ${vrfNumber}`,
    });

    // Run Fraud Evaluation & Auto-Review Level 1
    await this.evaluateRisk(verificationId);
    await this.runAutoReview(verificationId);

    // Publish domain event
    await eventBus.publish(EventTypes.VERIFICATION.SUBMITTED, {
      verificationId: updated._id,
      verificationNumber: vrfNumber,
      entityType: updated.entityType,
      entityId: updated.entityId,
    });

    return await verificationRepository.findById(verificationId);
  }

  // ── 3. Upload Verification Document ─────────────────────────────

  async uploadVerificationDocument(verificationId, documentType, fileData, requesterId) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }

    const docIndex = verification.documents.findIndex((d) => d.documentType === documentType);
    const template = await verificationRepository.findDocumentTemplate(documentType);

    let expiryDate = null;
    if (template?.hasExpiry && template?.defaultValidityMonths) {
      expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + template.defaultValidityMonths);
    }

    const updatedDoc = {
      templateId: template?._id || null,
      documentType,
      label: template?.label || documentType,
      isRequired: docIndex >= 0 ? verification.documents[docIndex].isRequired : true,
      fileId: fileData.fileId || null,
      filename: fileData.filename,
      url: fileData.url,
      uploadedAt: new Date(),
      expiryDate,
      renewalStatus: expiryDate ? 'VALID' : 'NOT_APPLICABLE',
      daysRemaining: expiryDate ? Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : null,
      reviewStatus: 'PENDING',
    };

    if (docIndex >= 0) {
      verification.documents[docIndex] = updatedDoc;
    } else {
      verification.documents.push(updatedDoc);
    }

    if (verification.status === 'DRAFT') {
      verification.status = 'DOCUMENTS_UPLOADED';
    }

    verification.timeline.push({
      event: 'DOCUMENTS_UPLOADED',
      performedBy: requesterId,
      performedAt: new Date(),
      note: `Document '${template?.label || documentType}' uploaded`,
    });

    await verification.save();

    await eventBus.publish(EventTypes.VERIFICATION.DOCUMENTS_UPLOADED, {
      verificationId,
      documentType,
      entityId: verification.entityId,
    });

    return verification;
  }

  // ── 4. Resubmit Verification (Versioning) ───────────────────────

  async resubmitVerification(previousVerificationId, requesterId, newDocumentUploads = []) {
    const previous = await verificationRepository.findById(previousVerificationId);
    if (!previous) {
      throw new AppError('Previous verification record not found', 404);
    }

    if (previous.status !== 'REJECTED') {
      throw new AppError('Only rejected verifications can be resubmitted', 400);
    }

    // Mark previous version as non-latest
    await verificationRepository.updateVerification(previousVerificationId, { isLatestVersion: false });

    // Create new version
    const newVersionData = {
      verificationNumber: previous.verificationNumber, // Retain VRF Number across versions
      entityType: previous.entityType,
      entityId: previous.entityId,
      entityModel: previous.entityModel,
      workflowId: previous.workflowId,
      engineVersion: previous.engineVersion,
      submissionVersion: previous.submissionVersion + 1,
      previousVersionId: previous._id,
      isLatestVersion: true,
      status: 'SUBMITTED',
      currentStep: previous.currentStep,
      completedSteps: previous.completedSteps,
      reviewLevels: {
        currentLevel: previous.reviewLevels?.levelsRequired?.[0] || 1,
        levelsRequired: previous.reviewLevels?.levelsRequired || [1, 3],
      },
      documents: previous.documents.map((d) => ({
        ...d.toObject(),
        reviewStatus: 'PENDING',
        rejectionReason: '',
      })),
      sla: {
        submittedAt: new Date(),
        targetReviewAt: new Date(Date.now() + (previous.sla?.slaHours || 48) * 60 * 60 * 1000),
        slaHours: previous.sla?.slaHours || 48,
        slaStatus: 'ON_TIME',
        isOverdue: false,
      },
      timeline: [
        {
          event: 'RESUBMITTED',
          performedBy: requesterId,
          performedAt: new Date(),
          note: `Resubmitted as Version ${previous.submissionVersion + 1}`,
        },
      ],
      isDemoVerification: config.DEMO_MODE || false,
    };

    const newVersion = await verificationRepository.createVerification(newVersionData);
    await this.evaluateRisk(newVersion._id);
    await this.runAutoReview(newVersion._id);

    return await verificationRepository.findById(newVersion._id);
  }

  // ── 5. Fraud Engine Evaluation ──────────────────────────────────

  async evaluateRisk(verificationId) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) return;

    let riskScore = 0;
    const riskFlags = {
      duplicateIdentity: false,
      duplicatePhone: false,
      duplicateEmail: false,
      duplicateProperty: false,
      documentExpired: false,
      documentTampered: false,
      suspiciousPattern: false,
    };

    // Rule 1: Document Expiry Check
    const hasExpiredDoc = verification.documents?.some(
      (d) => d.expiryDate && new Date(d.expiryDate) < new Date()
    );
    if (hasExpiredDoc) {
      riskFlags.documentExpired = true;
      riskScore += 15;
    }

    // Rule 2: Duplicate Phone Check (User level)
    if (verification.entityModel === 'User') {
      const user = await User.findById(verification.entityId);
      if (user?.phone) {
        const dupPhone = await User.countDocuments({
          _id: { $ne: user._id },
          phone: user.phone,
        });
        if (dupPhone > 0) {
          riskFlags.duplicatePhone = true;
          riskScore += 25;
        }
      }
    }

    const manualReviewRequired = riskScore >= (config.RISK_THRESHOLD || 40) || riskFlags.duplicatePhone;

    await verificationRepository.updateVerification(verificationId, {
      riskScore,
      riskFlags,
      manualReviewRequired,
      riskEvaluatedAt: new Date(),
    });

    if (manualReviewRequired) {
      await verificationRepository.addTimelineEvent(verificationId, {
        event: 'FLAG_RAISED',
        performedBy: null,
        performedAt: new Date(),
        note: `High risk score (${riskScore}) detected. Manual review flagged.`,
      });

      await eventBus.publish(EventTypes.VERIFICATION.FLAG_RAISED, {
        verificationId,
        riskScore,
        riskFlags,
      });
    }
  }

  // ── 6. Multi-Level Review Progression ────────────────────────────

  async runAutoReview(verificationId) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) return;

    const allRequiredUploaded = verification.documents
      .filter((d) => d.isRequired)
      .every((d) => d.url || d.fileId);

    const autoPassed = allRequiredUploaded && verification.riskScore < (config.RISK_THRESHOLD || 40);

    const level1Status = autoPassed ? 'PASSED' : 'FAILED';
    const nextLevel = autoPassed ? (verification.reviewLevels?.levelsRequired?.includes(2) ? 2 : 3) : 1;
    const nextStatus = autoPassed ? (nextLevel === 2 ? 'MANAGER_REVIEW' : 'ADMIN_REVIEW') : 'AUTO_REVIEW';

    await verificationRepository.updateVerification(verificationId, {
      'reviewLevels.level1.status': level1Status,
      'reviewLevels.level1.reviewedAt': new Date(),
      'reviewLevels.level1.remarks': autoPassed ? 'Automated checks passed' : 'Automated checks flagged requirements',
      'reviewLevels.currentLevel': nextLevel,
      status: nextStatus,
    });

    await verificationRepository.addTimelineEvent(verificationId, {
      event: autoPassed ? 'AUTO_REVIEW_PASSED' : 'AUTO_REVIEW_FAILED',
      performedBy: null,
      performedAt: new Date(),
      note: autoPassed ? 'Level 1 auto-review passed' : 'Level 1 auto-review flagged issues',
    });

    await eventBus.publish(
      autoPassed ? EventTypes.VERIFICATION.AUTO_REVIEW_PASSED : EventTypes.VERIFICATION.AUTO_REVIEW_FAILED,
      { verificationId }
    );
  }

  async managerReview(verificationId, managerId, decision, remarks = '') {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) throw new AppError('Verification record not found', 404);

    const isPassed = decision === 'APPROVE';
    const level2Status = isPassed ? 'PASSED' : 'FAILED';
    const nextStatus = isPassed ? 'ADMIN_REVIEW' : 'REJECTED';

    await verificationRepository.updateVerification(verificationId, {
      'reviewLevels.level2.status': level2Status,
      'reviewLevels.level2.reviewedBy': managerId,
      'reviewLevels.level2.reviewedAt': new Date(),
      'reviewLevels.level2.remarks': remarks,
      'reviewLevels.currentLevel': isPassed ? 3 : 2,
      status: nextStatus,
    });

    await verificationRepository.addTimelineEvent(verificationId, {
      event: isPassed ? 'MANAGER_REVIEW_PASSED' : 'MANAGER_REVIEW_FAILED',
      performedBy: managerId,
      performedAt: new Date(),
      note: `Manager review ${decision.toLowerCase()}: ${remarks}`,
    });

    return await verificationRepository.findById(verificationId);
  }

  async adminApprove(verificationId, adminId, remarks = '') {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) throw new AppError('Verification record not found', 404);

    const now = new Date();

    await verificationRepository.updateVerification(verificationId, {
      status: 'APPROVED',
      verifiedBy: adminId,
      verifiedAt: now,
      badgeIssuedAt: now,
      verificationRemarks: remarks,
      'reviewLevels.level3.status': 'PASSED',
      'reviewLevels.level3.reviewedBy': adminId,
      'reviewLevels.level3.reviewedAt': now,
      'reviewLevels.level3.remarks': remarks,
      'sla.completedAt': now,
    });

    // Update entity DB status
    if (verification.entityModel === 'Property') {
      await Property.findByIdAndUpdate(verification.entityId, {
        $set: {
          verificationStatus: 'verified',
          verificationApprovedAt: now,
          verifiedBy: adminId,
          verifiedBadge: true,
        },
      });
    } else {
      await User.findByIdAndUpdate(verification.entityId, {
        $set: {
          verificationStatus: 'approved',
          kycStatus: 'approved',
          verificationApprovedAt: now,
          verifiedBy: adminId,
          verificationBadge: true,
        },
      });
    }

    await verificationRepository.addTimelineEvent(verificationId, {
      event: 'APPROVED',
      performedBy: adminId,
      performedAt: now,
      note: `Verification approved by admin: ${remarks}`,
    });

    await verificationRepository.addTimelineEvent(verificationId, {
      event: 'BADGE_ISSUED',
      performedBy: adminId,
      performedAt: now,
      note: 'Verification badge awarded',
    });

    // Update Trust Score
    await trustScoreService.updateTrustScore({
      entityType: verification.entityType,
      entityId: verification.entityId,
      verification,
      reason: 'VERIFICATION_APPROVED',
      triggeredBy: adminId,
      note: remarks,
    });

    await eventBus.publish(EventTypes.VERIFICATION.APPROVED, {
      verificationId,
      entityType: verification.entityType,
      entityId: verification.entityId,
    });

    return await verificationRepository.findById(verificationId);
  }

  async adminReject(verificationId, adminId, remarks = '') {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) throw new AppError('Verification record not found', 404);

    const now = new Date();

    await verificationRepository.updateVerification(verificationId, {
      status: 'REJECTED',
      verifiedBy: adminId,
      rejectedAt: now,
      verificationRemarks: remarks,
      'reviewLevels.level3.status': 'FAILED',
      'reviewLevels.level3.reviewedBy': adminId,
      'reviewLevels.level3.reviewedAt': now,
      'reviewLevels.level3.remarks': remarks,
      'sla.completedAt': now,
    });

    // Update entity DB status
    if (verification.entityModel === 'Property') {
      await Property.findByIdAndUpdate(verification.entityId, {
        $set: {
          verificationStatus: 'rejected',
          verificationRemarks: remarks,
          verifiedBadge: false,
        },
      });
    } else {
      await User.findByIdAndUpdate(verification.entityId, {
        $set: {
          verificationStatus: 'rejected',
          kycStatus: 'rejected',
          verificationRemarks: remarks,
          verificationBadge: false,
        },
      });
    }

    await verificationRepository.addTimelineEvent(verificationId, {
      event: 'REJECTED',
      performedBy: adminId,
      performedAt: now,
      note: `Verification rejected: ${remarks}`,
    });

    await trustScoreService.updateTrustScore({
      entityType: verification.entityType,
      entityId: verification.entityId,
      verification,
      reason: 'VERIFICATION_REJECTED',
      triggeredBy: adminId,
      note: remarks,
    });

    await eventBus.publish(EventTypes.VERIFICATION.REJECTED, {
      verificationId,
      entityType: verification.entityType,
      entityId: verification.entityId,
      remarks,
    });

    return await verificationRepository.findById(verificationId);
  }

  // ── 7. SLA Recomputation ─────────────────────────────────────────

  recomputeSlaStatus(verification) {
    const { submittedAt, targetReviewAt, slaHours } = verification.sla || {};
    if (!submittedAt) return 'NOT_STARTED';

    const now = Date.now();
    const target = new Date(targetReviewAt).getTime();
    const elapsed = now - new Date(submittedAt).getTime();
    const totalMs = (slaHours || 48) * 3600 * 1000;
    const percentElapsed = (elapsed / totalMs) * 100;

    if (now > target) return 'OVERDUE';
    if (percentElapsed >= 80) return 'AT_RISK';
    return 'ON_TIME';
  }

  // ── 8. VerificationWidgetService (Dashboard Payload Composers) ────

  async getTenantWidget(userId) {
    const verification = await verificationRepository.findLatestByEntity('TENANT', userId);
    const user = await User.findById(userId);
    const history = await trustScoreService.getTrustHistory('TENANT', userId);

    const completed = verification?.completedSteps?.length || 0;
    const total = verification?.workflowId?.steps?.length || 4;

    return {
      trustScore: user?.currentTrustScore || 0,
      trustDelta: history?.[0]?.delta || 0,
      verificationStatus: verification?.status || 'DRAFT',
      verificationBadge: user?.verificationBadge || false,
      stepsCompleted: completed,
      stepsTotal: total,
      nextStep: verification?.currentStep || 'email',
      completionPercent: Math.round((completed / total) * 100) || 0,
      timeline: verification?.timeline?.slice(-5) || [],
    };
  }

  async getManagerWidget(managerId) {
    const verification = await verificationRepository.findLatestByEntity('MANAGER', managerId);
    const manager = await User.findById(managerId);

    const teamCount = await User.countDocuments({ 'technicianProfile.managerId': managerId });
    const teamVerified = await User.countDocuments({
      'technicianProfile.managerId': managerId,
      verificationStatus: 'approved',
    });

    const propertyCount = await Property.countDocuments({ manager: managerId });
    const propertyVerified = await Property.countDocuments({ manager: managerId, verificationStatus: 'verified' });

    return {
      managerVerification: {
        trustScore: manager?.currentTrustScore || 0,
        status: verification?.status || 'DRAFT',
        verificationBadge: manager?.verificationBadge || false,
      },
      teamVerification: {
        total: teamCount,
        verified: teamVerified,
        percentVerified: teamCount > 0 ? Math.round((teamVerified / teamCount) * 100) : 100,
      },
      propertyVerification: {
        total: propertyCount,
        verified: propertyVerified,
        percentVerified: propertyCount > 0 ? Math.round((propertyVerified / propertyCount) * 100) : 100,
      },
    };
  }

  async getTechnicianWidget(technicianId) {
    const verification = await verificationRepository.findLatestByEntity('TECHNICIAN', technicianId);
    const tech = await User.findById(technicianId);

    return {
      verificationStatus: verification?.status || 'DRAFT',
      trustScore: tech?.currentTrustScore || 0,
      verificationBadge: tech?.verificationBadge || false,
      licenseStatus: 'VALID',
      policeVerificationStatus: 'VALID',
      completionPercent: verification?.status === 'APPROVED' ? 100 : 50,
    };
  }

  async getAdminWidget() {
    return await verificationRepository.getAdminStatsAggregates();
  }

  async getWidgetData(profile, entityId = null) {
    switch (profile.toUpperCase()) {
      case 'TENANT':
        return await this.getTenantWidget(entityId);
      case 'MANAGER':
        return await this.getManagerWidget(entityId);
      case 'TECHNICIAN':
        return await this.getTechnicianWidget(entityId);
      case 'ADMIN':
        return await this.getAdminWidget();
      default:
        throw new AppError(`Unknown widget profile '${profile}'`, 400);
    }
  }

  // ── Service Wrappers for Controller Delegation ─────────────────────

  async getVerificationById(id) {
    const doc = await verificationRepository.findById(id);
    if (!doc) {
      throw new AppError('Verification record not found', 404);
    }
    return doc;
  }

  async getPendingQueue(options = {}) {
    return await verificationRepository.findPendingQueue(options);
  }

  async getHistoryByEntity(entityType, entityId) {
    return await verificationRepository.findHistoryByEntity(entityType, entityId);
  }

  async getTrustHistory(entityType, entityId) {
    return await trustScoreService.getTrustHistory(entityType, entityId);
  }

  async getDocumentTemplates() {
    return await verificationRepository.findAllDocumentTemplates();
  }

  async getWorkflows() {
    return await verificationRepository.findAllWorkflows();
  }

  async updateDraft(verificationId, updateData, requesterId) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError('Verification record not found', 404);
    }
    if (verification.status !== 'DRAFT' && verification.status !== 'DOCUMENTS_UPLOADED') {
      throw new AppError(`Cannot update verification in '${verification.status}' status`, 400);
    }
    return await verificationRepository.updateVerification(verificationId, updateData);
  }

  // ── Phase 3.6.1 Identity Verification Delegation ───────────────

  async startIdentityVerification(entityType, entityId, requesterId) {
    return await identityVerificationService.verifyIdentity(
      (await this.initiateVerification(entityType, entityId, requesterId))._id,
      {},
      requesterId
    );
  }

  async verifyIdentity(verificationId, payload, requesterId) {
    return await identityVerificationService.verifyIdentity(verificationId, payload, requesterId);
  }

  async getIdentityStatus(verificationId) {
    return await identityVerificationService.getIdentityStatus(verificationId);
  }

  async retryIdentityVerification(verificationId, payload, requesterId) {
    return await identityVerificationService.verifyIdentity(verificationId, payload, requesterId);
  }

  async unlockIdentity(verificationId, adminUserId, note) {
    return await identityVerificationService.unlockIdentityVerification(verificationId, adminUserId, note);
  }

  // ── Phase 3.6.2 Property Verification Delegation ───────────────

  async startPropertyVerification(entityType, entityId, requesterId) {
    return await propertyVerificationService.verifyProperty(
      (await this.initiateVerification(entityType, entityId, requesterId))._id,
      {},
      requesterId
    );
  }

  async verifyProperty(verificationId, payload, requesterId) {
    return await propertyVerificationService.verifyProperty(verificationId, payload, requesterId);
  }

  async getPropertyStatus(verificationId) {
    return await propertyVerificationService.getPropertyStatus(verificationId);
  }

  async retryPropertyVerification(verificationId, payload, requesterId) {
    return await propertyVerificationService.verifyProperty(verificationId, payload, requesterId);
  }

  async unlockProperty(verificationId, adminUserId, note) {
    return await propertyVerificationService.unlockPropertyVerification(verificationId, adminUserId, note);
  }

  // ── Phase 3.6.3 DigiLocker Integration Delegation ───────────────

  async getDigiLockerConnectUrl(verificationId, requesterId) {
    return await digilockerService.getConnectUrl(verificationId, requesterId);
  }

  async handleDigiLockerCallback(code, state, requesterId) {
    return await digilockerService.handleCallback(code, state, requesterId);
  }

  async getDigiLockerStatus(verificationId) {
    return await digilockerService.getStatus(verificationId);
  }

  async listDigiLockerDocuments(verificationId) {
    return await digilockerService.listDocuments(verificationId);
  }

  async importDigiLockerDocument(verificationId, payload, requesterId) {
    return await digilockerService.importDocument(verificationId, payload, requesterId);
  }

  async disconnectDigiLocker(verificationId, requesterId) {
    return await digilockerService.disconnect(verificationId, requesterId);
  }

  // ── Phase 3.6.4 Facial Verification Delegation ───────────────

  async grantBiometricConsent(verificationId, requesterId, ipAddress) {
    return await facialVerificationService.grantConsent(verificationId, requesterId, ipAddress);
  }

  async revokeBiometricConsent(verificationId, requesterId) {
    return await facialVerificationService.revokeConsent(verificationId, requesterId);
  }

  async verifyFacialBiometrics(verificationId, payload, requesterId) {
    return await facialVerificationService.verifyFacialBiometrics(verificationId, payload, requesterId);
  }

  async getFacialStatus(verificationId) {
    return await facialVerificationService.getStatus(verificationId);
  }

  async retryFacialVerification(verificationId, payload, requesterId) {
    return await facialVerificationService.verifyFacialBiometrics(verificationId, payload, requesterId);
  }

  async unlockFacialVerification(verificationId, adminUserId, note) {
    return await facialVerificationService.unlockFacialVerification(verificationId, adminUserId, note);
  }
}

export default new VerificationService();
