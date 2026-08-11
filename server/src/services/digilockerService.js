import crypto from 'crypto';
import verificationRepository from '../repositories/verificationRepository.js';
import { DigiLockerDevelopmentProvider } from './providers/digilockerDevelopmentProvider.js';
import { DigiLockerProductionProvider } from './providers/digilockerProductionProvider.js';
import identityVerificationService from './identityVerificationService.js';
import propertyVerificationService from './propertyVerificationService.js';
import { encryptData, decryptData } from '../utils/encryption.js';
import config from '../config/config.js';
import logger from '../platform/logging/logger.js';
import eventBus from '../platform/events/eventBus.js';
import { EventTypes } from '../platform/events/eventTypes.js';
import { AppError } from '../utils/errorHandling.js';

export class DigiLockerService {
  constructor() {
    this.devProvider = new DigiLockerDevelopmentProvider();
    this.prodProvider = new DigiLockerProductionProvider();
  }

  getProvider() {
    if (config.REAL_DIGILOCKER_VERIFICATION) {
      this.prodProvider.validateConfig();
      return this.prodProvider;
    }
    return this.devProvider;
  }

  generateOAuthState(verificationId, requesterId) {
    const statePayload = JSON.stringify({
      verificationId: verificationId.toString(),
      userId: requesterId.toString(),
      timestamp: Date.now(),
      nonce: crypto.randomBytes(8).toString('hex'),
    });
    return encryptData(statePayload);
  }

  validateOAuthState(encryptedState, expectedUserId = null) {
    try {
      const decrypted = decryptData(encryptedState);
      const parsed = JSON.parse(decrypted);

      if (!parsed.verificationId || !parsed.timestamp) {
        throw new AppError('Invalid OAuth state payload format', 400);
      }

      // Check state expiration (10 minutes window)
      const ageMs = Date.now() - parsed.timestamp;
      if (ageMs > 10 * 60 * 1000) {
        throw new AppError('OAuth authorization state has expired. Please initiate connection again.', 400);
      }

      if (expectedUserId && parsed.userId !== expectedUserId.toString()) {
        throw new AppError('Forbidden: OAuth state user mismatch', 403);
      }

      return parsed;
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error(`[DigiLockerService] Invalid OAuth state signature: ${err.message}`);
      throw new AppError('Invalid or corrupted OAuth state parameter', 400);
    }
  }

  async getConnectUrl(verificationId, requesterId) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    const state = this.generateOAuthState(verificationId, requesterId);
    const provider = this.getProvider();
    const authUrl = provider.getAuthorizationUrl(state);

    eventBus.publish(EventTypes.VERIFICATION.DIGILOCKER_STARTED, {
      verificationId: verification._id,
      entityType: verification.entityType,
      entityId: verification.entityId,
      requesterId,
      provider: provider.providerName,
    });

    return {
      authUrl,
      state,
      provider: provider.providerName,
    };
  }

  async handleCallback(code, state, requesterId) {
    const validatedState = this.validateOAuthState(state, requesterId);
    const verificationId = validatedState.verificationId;

    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    const provider = this.getProvider();
    const tokenResult = await provider.exchangeToken(code, state);

    if (!tokenResult.success) {
      verification.digilocker.consentStatus = 'DENIED';
      verification.timeline.push({
        event: 'FLAG_RAISED',
        performedBy: requesterId,
        performedAt: new Date(),
        note: `DigiLocker OAuth token exchange failed: ${tokenResult.errorDescription || tokenResult.error}`,
      });
      await verification.save();

      eventBus.publish(EventTypes.VERIFICATION.DIGILOCKER_FAILED, {
        verificationId: verification._id,
        reason: tokenResult.errorDescription,
      });

      throw new AppError(`DigiLocker authorization failed: ${tokenResult.errorDescription || 'Invalid code'}`, 400);
    }

    // Encrypt access & refresh tokens before DB persistence
    const encAccess = encryptData(tokenResult.accessToken);
    const encRefresh = tokenResult.refreshToken ? encryptData(tokenResult.refreshToken) : '';
    const expiresAt = new Date(Date.now() + (tokenResult.expiresIn || 3600) * 1000);

    verification.digilocker.connected = true;
    verification.digilocker.providerUserReference = tokenResult.providerUserReference || '';
    verification.digilocker.encryptedAccessToken = encAccess;
    verification.digilocker.encryptedRefreshToken = encRefresh;
    verification.digilocker.tokenExpiresAt = expiresAt;
    verification.digilocker.connectedAt = new Date();
    verification.digilocker.lastSyncedAt = new Date();
    verification.digilocker.consentStatus = 'GRANTED';
    verification.digilocker.revokedAt = null;

    verification.timeline.push({
      event: 'AUTO_REVIEW_STARTED',
      performedBy: requesterId,
      performedAt: new Date(),
      note: `DigiLocker account connected successfully [Provider Ref: ${tokenResult.providerUserReference}]`,
    });

    await verification.save();

    eventBus.publish(EventTypes.VERIFICATION.DIGILOCKER_COMPLETED, {
      verificationId: verification._id,
      entityType: verification.entityType,
      entityId: verification.entityId,
      providerUserReference: tokenResult.providerUserReference,
    });

    return verification;
  }

  async getStatus(verificationId) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    const dl = verification.digilocker || {};
    const isTokenExpired = dl.tokenExpiresAt && new Date() > new Date(dl.tokenExpiresAt);

    return {
      connected: dl.connected && !isTokenExpired && dl.consentStatus === 'GRANTED',
      consentStatus: isTokenExpired ? 'EXPIRED' : (dl.consentStatus || 'NONE'),
      providerUserReference: dl.providerUserReference ? `DL-***-${dl.providerUserReference.slice(-4)}` : '',
      connectedAt: dl.connectedAt,
      lastSyncedAt: dl.lastSyncedAt,
      documentsCount: dl.documents?.length || 0,
      requiresReauth: isTokenExpired || dl.consentStatus === 'REVOKED',
    };
  }

  async getDecryptedAccessToken(verification) {
    const dl = verification.digilocker || {};
    if (!dl.connected || !dl.encryptedAccessToken) {
      throw new AppError('DigiLocker is not connected or authorization has expired', 400);
    }

    if (dl.tokenExpiresAt && new Date() > new Date(dl.tokenExpiresAt)) {
      verification.digilocker.consentStatus = 'EXPIRED';
      await verification.save();
      throw new AppError('DigiLocker session token has expired. Please re-authenticate.', 401);
    }

    return decryptData(dl.encryptedAccessToken);
  }

  async listDocuments(verificationId) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    const token = await this.getDecryptedAccessToken(verification);
    const provider = this.getProvider();
    const result = await provider.listDocuments(token);

    if (!result.success) {
      if (result.error === 'expired_token') {
        verification.digilocker.consentStatus = 'EXPIRED';
        await verification.save();
        throw new AppError('DigiLocker session token has expired. Please re-authenticate.', 401);
      }
      throw new AppError(`Failed to fetch DigiLocker documents: ${result.errorDescription}`, 502);
    }

    verification.digilocker.lastSyncedAt = new Date();
    await verification.save();

    eventBus.publish(EventTypes.VERIFICATION.DIGILOCKER_DOC_LISTED, {
      verificationId: verification._id,
      documentCount: result.documents.length,
    });

    return result.documents;
  }

  async importDocument(verificationId, payload = {}, requesterId) {
    const { providerDocumentId, targetCategory } = payload;
    if (!providerDocumentId) {
      throw new AppError('providerDocumentId is required to import document from DigiLocker', 400);
    }

    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    // 1. Idempotency Check (Prevent duplicate import by providerDocumentId)
    const existingDoc = (verification.documents || []).find(
      d => d.providerDocumentId === providerDocumentId || d.filename?.includes(providerDocumentId)
    );
    if (existingDoc) {
      logger.info(`[DigiLockerService] Idempotency guard: Document ${providerDocumentId} already imported`);
      return verification;
    }

    const token = await this.getDecryptedAccessToken(verification);
    const provider = this.getProvider();
    const docResult = await provider.getDocument(token, providerDocumentId);

    if (!docResult.success) {
      throw new AppError(`DigiLocker document retrieval failed: ${docResult.errorDescription}`, 502);
    }

    // 2. SHA-256 Hash Calculation for Integrity
    const docHash = crypto.createHash('sha256').update(docResult.contentBuffer).digest('hex');

    // 3. Idempotency Check by SHA-256 Hash
    const duplicateHashDoc = (verification.documents || []).find(d => d.documentHash === docHash);
    if (duplicateHashDoc) {
      logger.info(`[DigiLockerService] Idempotency guard: Document hash ${docHash.slice(0, 10)}... already imported`);
      return verification;
    }

    const docType = targetCategory || docResult.documentType || 'OTHER';
    const requestId = `DL-REQ-${Date.now()}`;
    const filename = docResult.filename || `DigiLocker_${docType}_${Date.now()}.pdf`;

    // 4. Provenance Record in verification.documents
    const docRecord = {
      documentType: docType,
      label: `DigiLocker Issued ${docType}`,
      isRequired: true,
      filename,
      url: `/uploads/digilocker/${filename}`,
      uploadedAt: new Date(),
      reviewStatus: 'PENDING',
      source: 'DIGILOCKER',
      providerDocumentId,
      providerRequestId: requestId,
      documentHash: docHash,
      retrievedAt: new Date(),
    };

    verification.documents.push(docRecord);
    verification.digilocker.documents.push({
      providerDocumentId,
      documentType: docType,
      documentName: filename,
      documentHash: docHash,
      importedAt: new Date(),
      status: 'IMPORTED',
    });

    verification.timeline.push({
      event: 'DOCUMENTS_UPLOADED',
      performedBy: requesterId,
      performedAt: new Date(),
      note: `Imported DigiLocker verified document '${docType}' [Hash: ${docHash.slice(0, 8)}...]`,
    });

    await verification.save();

    eventBus.publish(EventTypes.VERIFICATION.DIGILOCKER_DOC_IMPORTED, {
      verificationId: verification._id,
      providerDocumentId,
      documentType: docType,
      documentHash: docHash,
    });

    // 5. Feed into Existing Verification Engines
    let enginePayload = {};
    if (docResult.rawPayload) {
      try {
        enginePayload = JSON.parse(docResult.rawPayload);
      } catch (e) {
        enginePayload = {};
      }
    }

    const identityCategories = ['AADHAAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT', 'VOTER_ID'];
    const propertyCategories = ['OWNERSHIP_DEED', 'SALE_DEED', 'PROPERTY_TAX_RECEIPT', 'ENCUMBRANCE_CERTIFICATE'];

    if (identityCategories.includes(docType)) {
      logger.info(`[DigiLockerService] Feeding DigiLocker document into Phase 3.6.1 Identity Verification Engine`);
      await identityVerificationService.verifyIdentity(
        verificationId,
        {
          idType: docType,
          idNumber: enginePayload.documentNumber || providerDocumentId,
          nameOnId: enginePayload.ownerName,
        },
        requesterId
      );
    } else if (propertyCategories.includes(docType)) {
      logger.info(`[DigiLockerService] Feeding DigiLocker document into Phase 3.6.2 Property Verification Engine`);
      await propertyVerificationService.verifyProperty(
        verificationId,
        {
          documentType: docType,
          documentNumber: enginePayload.documentNumber || providerDocumentId,
          ownerName: enginePayload.ownerName,
          address: enginePayload.address,
          surveyNumber: enginePayload.surveyNumber,
        },
        requesterId
      );
    }

    return await verificationRepository.findById(verificationId);
  }

  async disconnect(verificationId, requesterId) {
    const verification = await verificationRepository.findById(verificationId);
    if (!verification) {
      throw new AppError(`Verification record '${verificationId}' not found`, 404);
    }

    if (verification.digilocker?.encryptedAccessToken) {
      try {
        const token = decryptData(verification.digilocker.encryptedAccessToken);
        const provider = this.getProvider();
        await provider.revokeAccess(token);
      } catch (e) {
        logger.warn(`[DigiLockerService] Token revocation warning: ${e.message}`);
      }
    }

    verification.digilocker.connected = false;
    verification.digilocker.encryptedAccessToken = '';
    verification.digilocker.encryptedRefreshToken = '';
    verification.digilocker.consentStatus = 'REVOKED';
    verification.digilocker.revokedAt = new Date();

    verification.timeline.push({
      event: 'FLAG_CLEARED',
      performedBy: requesterId,
      performedAt: new Date(),
      note: 'DigiLocker connection disconnected & consent revoked by user.',
    });

    await verification.save();

    eventBus.publish(EventTypes.VERIFICATION.DIGILOCKER_REVOKED, {
      verificationId: verification._id,
      requesterId,
    });

    return verification;
  }
}

export default new DigiLockerService();
